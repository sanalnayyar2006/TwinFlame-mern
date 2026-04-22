import cloudinary from '../config/cloudinary'
import streamifier from 'streamifier'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Gallery from '../models/Gallery'

const streamUpload = (buffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'twinflame' },
      (error, result) => {
        if (result) resolve(result)
        else reject(error)
      }
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })
}

export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    if (!req.user?.coupleId) {
      return res.status(401).json({ message: 'No couple linked' })
    }

    const result = await streamUpload(req.file.buffer)

    const photo = await Gallery.create({
      author: req.user._id,
      coupleId: req.user.coupleId,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      caption: req.body.caption || ''
    })

    return res.status(201).json(photo)
  } catch (err) {
    console.error('uploadPhoto error:', err)
    res.status(500).json({ message: 'Upload failed' })
  }
}

export const getPhotos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.coupleId) {
      res.status(400).json({ message: 'No couple linked' })
      return
    }

    const images = await Gallery.find({ coupleId: req.user.coupleId })
      .populate('author', 'name')
      .sort({ createdAt: -1 })

    res.status(200).json({ images })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

export const deleteImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await Gallery.findById(req.params.id)

    if (!entry) {
      res.status(404).json({ message: 'Photo not found' })
      return
    }

    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' })
      return
    }

    if (entry.author.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'You can only delete your own photos' })
      return
    }

    await cloudinary.uploader.destroy(entry.publicId)
    await entry.deleteOne()

    res.status(200).json({ message: 'Photo deleted' })
  } catch (error) {
    console.error('deleteImage error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}