import { Router } from 'express'
import authMiddleware from '../middleware/auth'
import { authLimiter } from '../config/security'
import { register, login, logout, getMe, linkPartner, updateMood, googleAuth, demoLogin } from '../controllers/auth'

const router = Router()
router.get('/me', authMiddleware, getMe)
router.post('/register', authLimiter, register)
router.post('/link-partner', authLimiter, authMiddleware, linkPartner)
router.post('/login', authLimiter, login)
router.post('/logout', logout)
router.patch('/mood', authMiddleware, updateMood)
router.post('/google', authLimiter, googleAuth)
router.post('/demo', authLimiter, demoLogin)

export default router