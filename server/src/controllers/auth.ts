import {Request,Response} from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import { AuthRequest } from '../middleware/auth'
import { parseBody, registerSchema, loginSchema, googleAuthSchema, linkPartnerSchema, moodSchema } from '../validation/schemas'
// 6-character couple code from a CSPRNG; no 0/O/1/I so codes are easy to read out loud
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generateCoupleCode = (): string =>
    Array.from(crypto.randomBytes(6), b => CODE_CHARS[b % CODE_CHARS.length]).join('')

// Browsers only clear a cookie when the clear call uses the same attributes it was set with
const authCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
} as const)

// helper to create and send jwt token
const sendTokenResponse = (userId: string, res: Response): string => {
    const token = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
    )

    res.cookie('token', token, authCookieOptions())
    return token
}

//register

export const register = async (req:Request,res: Response):Promise<void> =>{
    try{
        const body = parseBody(registerSchema, req.body, res)
        if (!body) return
        const { name, email, password } = body
        
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
        const body = parseBody(loginSchema, req.body, res)
        if (!body) return
        const { email, password } = body

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
    res.clearCookie('token', authCookieOptions())
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
    const body = parseBody(linkPartnerSchema, req.body, res)
    if (!body) return
    const me = req.user!

    if (me.partnerId) {
      res.status(409).json({ message: 'You are already linked with a partner.' })
      return
    }

    const partner = await User.findOne({ coupleCode: body.partnerCode })
    if (!partner) {
      res.status(404).json({ message: 'Invalid code. Partner not found.' })
      return
    }
    if (partner._id.equals(me._id)) {
      res.status(400).json({ message: "That's your own code. Ask your partner for theirs." })
      return
    }

    const coupleId = `${me._id}_${partner._id}`

    // Each update only applies while that user is still unlinked, so an existing couple can never be overwritten
    const claimed = await User.updateOne({ _id: partner._id, partnerId: null }, { partnerId: me._id, coupleId })
    if (claimed.modifiedCount === 0) {
      res.status(409).json({ message: 'This person is already linked with someone else.' })
      return
    }

    const linked = await User.updateOne({ _id: me._id, partnerId: null }, { partnerId: partner._id, coupleId })
    if (linked.modifiedCount === 0) {
      // Lost a race with another link request for this account: release the partner again
      await User.updateOne({ _id: partner._id, partnerId: me._id }, { partnerId: null, coupleId: null })
      res.status(409).json({ message: 'You are already linked with a partner.' })
      return
    }

    // Move both partners' open connections into the new couple room and tell their dashboards
    const io = req.app.get('io') as import('socket.io').Server | undefined
    if (io) {
      const rooms = [`user_${me._id}`, `user_${partner._id}`]
      io.in(rooms).socketsJoin(`couple_${coupleId}`)
      io.to(rooms).emit('partner-linked', { coupleId })
    }

    res.status(200).json({ message: 'Partner linked successfully' })
  } catch (error) {
    console.error('linkPartner error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

//mood

export const updateMood = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = parseBody(moodSchema, req.body, res)
    if (!body) return
    const { mood } = body

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
    const body = parseBody(googleAuthSchema, req.body, res)
    if (!body) return
    const tokenToVerify = (body.credential || body.idToken) as string

    let email: string | undefined
    let name: string | undefined
    let emailVerified = false

    // Mock tokens sign in as any email, so they need an explicit local opt-in and never work in production
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_MOCK_GOOGLE === 'true' &&
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

      // Token must be issued by Google for this app. GOOGLE_CLIENT_ID is required in production (config/env.ts)
      const validIssuer = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com'
      const validAudience = !process.env.GOOGLE_CLIENT_ID || payload.aud === process.env.GOOGLE_CLIENT_ID
      if (!validIssuer || !validAudience) {
        res.status(401).json({ message: 'Invalid or expired Google token' })
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
