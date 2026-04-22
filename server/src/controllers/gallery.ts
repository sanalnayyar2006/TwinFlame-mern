import cloudinary from '../config/cloudinary'
import streamifier from 'streamifier'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Gallery from '../models/Gallery'
import User from '../models/User'

const streamUpload = (buffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        {folder: 'twinflame'},
        (error,result)=>{
            if(result) resolve(result)
            else reject(error)
        }
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })
}


export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
  const file = (req as any).file as any | undefined
    if (!file) {
      return res.status(400).json({ message: 'No file upload' })
    }

    const result = await streamUpload(file.buffer)

    // req.userId is set by auth middleware. Fetch user to get coupleId and validate.
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    const photo = await Gallery.create({
      author: user._id,
      coupleId: user.coupleId,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      caption: req.body.caption || ''
    })
    return res.status(201).json(photo)
    // 1. check if req.file exists — if not, return 400 "No file uploaded"
    // 2. call streamUpload with req.file.buffer
    // 3. create Gallery document with result.secure_url, result.public_id, caption, author, coupleId
    // 4. return 201 with saved photo
  } catch (err) {
    // log error for debugging
    // eslint-disable-next-line no-console
    console.error('uploadPhoto error:', err)
    res.status(500).json({ message: 'Upload failed' })
  }
}