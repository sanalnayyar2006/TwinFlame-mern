import {Router} from 'express'
import authMiddleware from '../middleware/auth'
import { uploadLimiter } from '../config/security'
import { uploadImage } from '../middleware/upload'
import { uploadPhoto, getPhotos, deleteImage, updatePhoto } from '../controllers/gallery'

const router = Router()

router.get('/', authMiddleware, getPhotos)
router.post('/', authMiddleware, uploadLimiter, uploadImage, uploadPhoto)
router.delete('/:id', authMiddleware, deleteImage)
router.patch('/:id', authMiddleware, updatePhoto)

export default router