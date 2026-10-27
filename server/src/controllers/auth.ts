import {Request,Response} from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import { AuthRequest } from '../middleware/auth'
//helper-to generate 6 unique digit code

const generateCoupleCode = ():string =>{
    return Math.random().toString(36).substring(2,8).toUpperCase()
}

// helper to create and send jwt token
const sendTokenResponse = (userId: string, res: Response): string => {
    const token = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
    )

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    } as const

    res.cookie('token', token, cookieOptions)
    return token
}

//register

export const register = async (req:Request,res: Response):Promise<void> =>{
    try{
        const {name,email,password}= req.body 
        
        //to check if user exist
        const existingUser = await User.findOne({email})
        if(existingUser){
            res.status(400).json({message: "Email already registered"})
            return
        }
        //hashing password
        const hashedPassword = await bcrypt.hash(password,12)

        const coupleCode = generateCoupleCode()

        //create user

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            coupleCode
        })

        // sending token (also returned in JSON for dev-friendly auth)
        const token = sendTokenResponse(user._id.toString(), res)

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                coupleCode: user.coupleCode
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server Error' })
    }
}
//login

export const login = async (req:Request,res:Response):Promise<void>=>{
    try{
        const {email,password}=req.body

        //find user

        const user = await User.findOne({email})
        if(!user){
            res.status(400).json({message:"Invalid credentials"})
            return
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            res.status(401).json({message:'Invalid credentials'})
            return
        }

        // send token (also return token in JSON so client can use Authorization header in dev)
        const token = sendTokenResponse(user._id.toString(), res)

        res.status(200).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                coupleCode: user.coupleCode
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Problem in logging' })
    }

}

//logout

export const logout = async(req:Request,res:Response):Promise<void>=>{
    res.cookie('token','',{maxAge:0})
    res.status(200).json({message:"Logged Out"})
}


//@route get 

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId)
    .select('-password')
    .populate('partnerId', 'name mood')
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }
    res.status(200).json({ user })
  } catch (error) {
    console.error('getMe error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const linkPartner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { partnerCode } = req.body

    // Find partner by their coupleCode
    const partner = await User.findOne({ coupleCode: partnerCode })
    if (!partner) {
      res.status(404).json({ message: 'Invalid code. Partner not found.' })
      return
    }

        const coupleId = `${req.userId}_${partner._id}`

    // Update both users
    await User.findByIdAndUpdate(req.userId, { partnerId: partner._id , coupleId})
    await User.findByIdAndUpdate(partner._id, { partnerId: req.userId, coupleId})

    res.status(200).json({ message: 'Partner linked successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

//mood

export const updateMood = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { mood } = req.body

    await User.findByIdAndUpdate(req.userId, { mood })

    // Push the mood update to the partner in real time
    const io = req.app.get('io') as import('socket.io').Server | undefined
    if (io) {
      const user = await User.findById(req.userId).select('coupleId')
      if (user?.coupleId) {
        io.to(`couple_${user.coupleId}`).emit('mood-updated', { userId: req.userId, mood })
      }
    }

    res.status(200).json({ message: 'Mood updated' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// google auth

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, idToken } = req.body
    const tokenToVerify = credential || idToken

    if (!tokenToVerify) {
      res.status(400).json({ message: 'Google token is required' })
      return
    }

    let email: string | undefined
    let name: string | undefined
    let emailVerified = false

    // In non-production environments, allow simulated dev/mock tokens for automated testing
    if (
      process.env.NODE_ENV !== 'production' &&
      typeof tokenToVerify === 'string' &&
      tokenToVerify.startsWith('dev_mock_')
    ) {
      const raw = tokenToVerify.replace('dev_mock_', '')
      const [mockEmail, mockName] = raw.split(':')
      email = mockEmail
      name = mockName || 'Google User'
      emailVerified = true
    } else {
      // Verify token with Google's official tokeninfo endpoint
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`
      )
      if (!googleRes.ok) {
        res.status(401).json({ message: 'Invalid or expired Google token' })
        return
      }

      const payload = (await googleRes.json()) as {
        email?: string
        name?: string
        email_verified?: string | boolean
        aud?: string
        iss?: string
      }

      // Verify Google audience if GOOGLE_CLIENT_ID is configured
      if (
        process.env.GOOGLE_CLIENT_ID &&
        payload.aud &&
        payload.aud !== process.env.GOOGLE_CLIENT_ID
      ) {
        res.status(401).json({ message: 'Google token client ID mismatch' })
        return
      }

      email = payload.email
      name = payload.name
      emailVerified = payload.email_verified === true || payload.email_verified === 'true'
    }

    if (!email) {
      res.status(400).json({ message: 'Google account does not provide an email address' })
      return
    }

    if (!emailVerified) {
      res.status(400).json({ message: 'Google email address is not verified' })
      return
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists (handles returning Google user OR existing email/password user)
    let user = await User.findOne({ email: normalizedEmail })
    let isNewUser = false

    if (!user) {
      // First-time user: create new user record preserving schema structure
      isNewUser = true
      const coupleCode = generateCoupleCode()
      const randomPassword = crypto.randomBytes(32).toString('hex')
      const hashedPassword = await bcrypt.hash(randomPassword, 12)
      const displayName = name && name.trim() ? name.trim() : normalizedEmail.split('@')[0]

      user = await User.create({
        name: displayName,
        email: normalizedEmail,
        password: hashedPassword,
        coupleCode
      })
    }

    // Reuse existing session/auth handling
    const token = sendTokenResponse(user._id.toString(), res)

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        coupleCode: user.coupleCode,
        coupleId: user.coupleId,
        partnerId: user.partnerId,
        isNewUser
      }
    })
  } catch (error) {
    console.error('Google auth error:', error)
    res.status(500).json({ message: 'Failed to authenticate with Google' })
  }
}
