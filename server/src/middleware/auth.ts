import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User, { IUser } from '../models/User'

export interface AuthRequest extends Request {
  user?: IUser
  userId?: string
  file?: any
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies.token

    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
      }
    }

    if (!token) {
      res.status(401).json({ message: 'Not authorized' })
      return
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: string }

    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      res.status(401).json({ message: 'User not found' })
      return
    }

    req.user = user as IUser
    req.userId = user._id.toString()
    next()

  } catch (error) {
    res.status(401).json({ message: 'Token invalid or expired' })
  }
}

export default authMiddleware