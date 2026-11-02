import {Router} from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/auth'
import { uploadLimiter } from '../config/security'
import { uploadPhoto, getPhotos, deleteImage, updatePhoto } from '../controllers/gallery'


const router = Router()
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

// Files are held in memory before going to Cloudinary, so cap the size
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'))
  }
})

router.get('/', authMiddleware, getPhotos)
router.post('/', authMiddleware, uploadLimiter, upload.single('image'), uploadPhoto)
router.delete('/:id', authMiddleware, deleteImage)
router.patch('/:id', authMiddleware, updatePhoto)

export default router