import {Request,Response} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'

//helper-to generate 6 unique digit code

const generateCoupleCode = ():string =>{
    return Math.random().toString(36).substring(2,8).toUpperCase()
}

//helper to create and send jwt token

const sendTokenResponse = (userId:string,res:Response):void=>{
    const token = jwt.sign(
        {id:userId},
        process.env.JWT_SECRET as string,
        {expiresIn:'7d'}
    )

    res.cookie('token',token,{
        httpOnly:true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    })
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

        //sending token

        sendTokenResponse(user._id.toString(),res)

        res.status(201).json({
            user:{
                id: user._id,
                name:user.name,
                coupleCode:user.coupleCode
            }
        })
    }catch(error){
        res.status(500).json({message:"Serevr Error"})
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

        //send token

        sendTokenResponse(user._id.toString(),res)

        res.status(200).json({
            user:{
                id:user.id,
                name:user.name,
                coupleCode:user.coupleCode
            }
        })
    }catch(error){
        res.status(500).json({message:"Problem in logging"})
    }

}

//logout

export const logout = async(req:Request,res:Response):Promise<void>=>{
    res.cookie('token','',{maxAge:0})
    res.status(200).json({message:"Logged Out"})
}
