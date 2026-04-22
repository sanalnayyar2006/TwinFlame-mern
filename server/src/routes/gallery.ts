import {Router} from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/auth'
import { uploadPhoto, getPhotos, deleteImage } from '../controllers/Gallery'


const router = Router()
const upload = multer({storage: multer.memoryStorage()})

router.get('/', authMiddleware, getPhotos)
router.post('/', authMiddleware,upload.single('image'),uploadPhoto)
router.delete('/:id', authMiddleware,deleteImage)

export default router