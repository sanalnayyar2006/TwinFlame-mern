import {Request,Response} from 'express'
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
    const user = await User.findById(req.userId).select('-password')
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }
    res.status(200).json({ user })
  } catch (error) {
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

    // Update both users
    await User.findByIdAndUpdate(req.userId, { partnerId: partner._id })
    await User.findByIdAndUpdate(partner._id, { partnerId: req.userId })

    res.status(200).json({ message: 'Partner linked successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}