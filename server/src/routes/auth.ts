import { Router } from 'express'
import authMiddleware from '../middleware/auth'
import { register, login, logout, getMe, linkPartner } from '../controllers/auth'
const router = Router()
router.get('/me', authMiddleware, getMe)
router.post('/register', register)
router.post('/link-partner', authMiddleware, linkPartner)
router.post('/login', login)
router.post('/logout', logout)

export default router