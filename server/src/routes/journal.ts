import { Router } from 'express'
import authMiddleware from '../middleware/auth'
import { uploadLimiter } from '../config/security'
import { uploadImage } from '../middleware/upload'
import { getEntries, createEntry, deleteEntry, updateEntry, uploadJournalImage } from '../controllers/journal'

const router = Router()

router.get('/', authMiddleware, getEntries)
router.post('/', authMiddleware, createEntry)
router.post('/images', authMiddleware, uploadLimiter, uploadImage, uploadJournalImage)
router.patch('/:id', authMiddleware, updateEntry)
router.delete('/:id', authMiddleware, deleteEntry)

export default router