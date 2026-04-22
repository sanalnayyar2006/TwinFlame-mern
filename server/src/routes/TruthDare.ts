import { Router } from 'express'
import authMiddleware from '../middleware/auth'
import { getQuestion } from '../controllers/TruthDare'

const router = Router()

router.get('/question', authMiddleware, getQuestion)

export default router