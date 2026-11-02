import { Router } from 'express'
import authMiddleware from '../middleware/auth'
import { getToday, completeToday, updateTodayNote } from '../controllers/dailyConnection'

const router = Router()

router.get('/', authMiddleware, getToday)
router.post('/', authMiddleware, completeToday)
router.patch('/', authMiddleware, updateTodayNote)

export default router
