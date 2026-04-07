import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check cookie first, then Authorization header
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

    req.userId = decoded.id
    next()

  } catch (error) {
    res.status(401).json({ message: 'Token invalid or expired' })
  }
}

export default authMiddleware