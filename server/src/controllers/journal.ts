import { Response } from 'express'
import Journal from '../models/Journal'
import { AuthRequest } from '../middleware/auth'
import { parseBody, journalCreateSchema, journalUpdateSchema } from '../validation/schemas'
import { sanitizeJournalHtml } from '../utils/sanitizeJournalHtml'
import { parsePageQuery, toPage } from '../utils/pagination'
import { uploadBuffer, journalFolder, journalImageIds, destroyImages } from '../config/cloudinary'

// GET all journal entries for the couple
export const getEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user?.coupleId) {
      res.status(400).json({ message: 'No couple linked' })
      return
    }

    const page = parsePageQuery(req.query)
    if (!page) {
      res.status(400).json({ message: 'Invalid page request' })
      return
    }

    const filter = { coupleId: user.coupleId, ...(page.before && { _id: { $lt: page.before } }) }
    const [docs, total] = await Promise.all([
      Journal.find(filter).populate('author', 'name').sort({ _id: -1 }).limit(page.limit + 1),
      Journal.countDocuments({ coupleId: user.coupleId })
    ])
    const { items, nextCursor } = toPage(docs, page.limit)

    res.status(200).json({ entries: items, nextCursor, total })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// POST create new journal entry
export const createEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = parseBody(journalCreateSchema, req.body, res)
    if (!body) return
    const { title, imageUrl } = body
    const content = sanitizeJournalHtml(body.content)
    if (!content.trim()) {
      res.status(400).json({ message: 'Title and content required' })
      return
    }

    const user = req.user
    if (!user?.coupleId) {
      res.status(400).json({ message: 'No couple linked' })
      return
    }

    const entry = await Journal.create({
      title,
      content,
      imageUrl,
      author: user._id,
      coupleId: user.coupleId
    })

    const populated = await entry.populate('author', 'name')

    res.status(201).json({ entry: populated })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// PATCH update entry (add/remove photo)
export const updateEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = parseBody(journalUpdateSchema, req.body, res)
    if (!body) return
    const { imageUrl } = body
    const content = body.content === undefined ? undefined : sanitizeJournalHtml(body.content)
    const entry = await Journal.findById(req.params.id)
    if (!entry) {
      res.status(404).json({ message: 'Entry not found' })
      return
    }
    const user = req.user
    if (!user || entry.author.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Not authorized' })
      return
    }
    const removedImages = content === undefined
      ? []
      : journalImageIds(entry.content, entry.coupleId).filter(id => !content.includes(id))
    if (imageUrl !== undefined) entry.imageUrl = imageUrl
    if (content !== undefined) entry.content = content
    await entry.save()
    await destroyImages(removedImages)
    const populated = await entry.populate('author', 'name')
    res.status(200).json({ entry: populated })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// DELETE journal entry
export const deleteEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await Journal.findById(req.params.id)

    if (!entry) {
      res.status(404).json({ message: 'Entry not found' })
      return
    }

    // Only author can delete
    const user = req.user
    if (!user) {
      res.status(401).json({ message: 'Not authorized' })
      return
    }

    if (entry.author.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to delete this entry' })
      return
    }

    await entry.deleteOne()
    await destroyImages(journalImageIds(entry.content, entry.coupleId))
    res.status(200).json({ message: 'Entry deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}
// POST one photo for an entry; the client puts the returned URL into the entry's HTML
export const uploadJournalImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' })
      return
    }
    if (!req.user?.coupleId) {
      res.status(400).json({ message: 'No couple linked' })
      return
    }
    const result = await uploadBuffer(req.file.buffer, journalFolder(req.user.coupleId))
    res.status(201).json({ url: result.secure_url })
  } catch (error) {
    console.error('uploadJournalImage error:', error)
    res.status(500).json({ message: 'Upload failed' })
  }
}
