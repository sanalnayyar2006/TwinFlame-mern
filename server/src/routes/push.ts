import { Router } from 'express'
import authMiddleware from '../middleware/auth'
import { getPushKey, subscribe, unsubscribe } from '../controllers/push'

const router = Router()

router.get('/key', authMiddleware, getPushKey)
router.post('/subscribe', authMiddleware, subscribe)
router.delete('/subscribe', authMiddleware, unsubscribe)

export default router
