import multer from 'multer'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

// Single image held in memory on its way to Cloudinary, so the size is capped.
// Rejections become JSON messages in config/security.ts errorHandler.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'))
  }
}).single('image')
