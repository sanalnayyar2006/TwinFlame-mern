import {Request,Response,NextFunction} from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request{
    userId?:string
}

const authMiddleware = (
    req:AuthRequest,
    res:Response,
    next: NextFunction
):void=>{
    try{
        //token from cookie
        const token = req.cookies.token

        if(!token){
            res.status(401).json({message:"token not found"})
            return
        }

        //verify token

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        )as{id:string}

        req.userId = decoded.id

        next()
    }catch(error){
        res.status(500).json({message:"invalid token request"})
    }
}

export default authMiddleware