import { Router } from 'express'
import authMiddleware from '../middleware/auth'
import { getEntries, createEntry, deleteEntry, updateEntry } from '../controllers/journal'

const router = Router()

router.get('/', authMiddleware, getEntries)
router.post('/', authMiddleware, createEntry)
router.patch('/:id', authMiddleware, updateEntry)
router.delete('/:id', authMiddleware, deleteEntry)

export default router