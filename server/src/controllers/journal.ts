import { Response } from 'express'
import Journal from '../models/Journal'
import { AuthRequest } from '../middleware/auth'

// GET all journal entries for the couple
export const getEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user?.coupleId) {
      res.status(400).json({ message: 'No couple linked' })
      return
    }

    const entries = await Journal.find({ coupleId: user.coupleId })
      .populate('author', 'name')
      .sort({ createdAt: -1 })

    res.status(200).json({ entries })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// POST create new journal entry
export const createEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content } = req.body

    if (!title || !content) {
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
      author: user._id,
      coupleId: user.coupleId
    })

    const populated = await entry.populate('author', 'name')

    res.status(201).json({ entry: populated })
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
    res.status(200).json({ message: 'Entry deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}