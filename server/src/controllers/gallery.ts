import cloudinary, { uploadBuffer } from '../config/cloudinary'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Gallery from '../models/Gallery'
import { parseBody, captionSchema } from '../validation/schemas'
import { parsePageQuery, toPage } from '../utils/pagination'

export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    if (!req.user?.coupleId) {
      return res.status(401).json({ message: 'No couple linked' })
    }

    const body = parseBody(captionSchema, req.body, res)
    if (!body) return

    const result = await uploadBuffer(req.file.buffer, 'twinflame')

    const photo = await Gallery.create({
      author: req.user._id,
      coupleId: req.user.coupleId,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      caption: body.caption ?? ''
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

    const page = parsePageQuery(req.query)
    if (!page) {
      res.status(400).json({ message: 'Invalid page request' })
      return
    }

    const filter = { coupleId: req.user.coupleId, ...(page.before && { _id: { $lt: page.before } }) }
    const [docs, total] = await Promise.all([
      Gallery.find(filter).populate('author', 'name').sort({ _id: -1 }).limit(page.limit + 1),
      Gallery.countDocuments({ coupleId: req.user.coupleId })
    ])
    const { items, nextCursor } = toPage(docs, page.limit)

    res.status(200).json({ images: items, nextCursor, total })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

export const updatePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await Gallery.findById(req.params.id)
    if (!entry) {
      res.status(404).json({ message: 'Photo not found' })
      return
    }
    if (!req.user || entry.author.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized' })
      return
    }
    const body = parseBody(captionSchema, req.body, res)
    if (!body) return
    if (body.caption !== undefined) entry.caption = body.caption
    await entry.save()
    const populated = await entry.populate('author', 'name')
    res.status(200).json(populated)
  } catch (error) {
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