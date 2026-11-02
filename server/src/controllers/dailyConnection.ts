import { Response } from 'express'
import type { Server } from 'socket.io'
import DailyConnection, { IDailyConnection, IDailyResponse } from '../models/DailyConnection'
import User from '../models/User'
import { AuthRequest } from '../middleware/auth'
import { promptForDate } from '../config/dailyPrompts'
import { isValidTimeZone, resolveCoupleDay } from '../utils/dayKey'

const NOTE_MAX = 500

const toDto = (r: IDailyResponse | undefined) =>
  r ? { note: r.note, completedAt: r.completedAt, updatedAt: r.updatedAt } : null

const coupleKeyFor = (req: AuthRequest) =>
  req.user!.coupleId ?? `solo_${req.user!._id}`

// Saves the caller's time zone when it changes, then works out which day the couple is on
const resolveDay = async (req: AuthRequest, tz: unknown) => {
  const user = req.user!
  if (isValidTimeZone(tz) && tz !== user.timezone) {
    await User.updateOne({ _id: user._id }, { timezone: tz })
    user.timezone = tz
  }
  let partnerTz: string | null = null
  if (user.partnerId) {
    const partner = await User.findById(user.partnerId).select('timezone')
    partnerTz = partner?.timezone ?? null
  }
  return resolveCoupleDay(user.timezone ?? null, partnerTz)
}

const buildPayload = (day: { date: string; sharedClock: boolean }, doc: IDailyConnection | null, userId: string) => ({
  date: day.date,
  sharedClock: day.sharedClock,
  prompt: doc?.prompt ?? promptForDate(day.date),
  mine: toDto(doc?.responses.find(r => r.user.toString() === userId)),
  partner: toDto(doc?.responses.find(r => r.user.toString() !== userId))
})

const parseNote = (raw: unknown): string | null => {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') return null
  const note = raw.trim()
  return note.length > NOTE_MAX ? null : note
}

const notifyPartner = (req: AuthRequest, date: string, response: IDailyResponse) => {
  const io = req.app.get('io') as Server | undefined
  const coupleId = req.user!.coupleId
  if (io && coupleId) {
    io.to(`couple_${coupleId}`).emit('daily-connection-updated', {
      userId: req.userId,
      date,
      response: toDto(response)
    })
  }
}

// GET today's prompt plus both partners' responses
export const getToday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const day = await resolveDay(req, req.query.tz)
    const doc = await DailyConnection.findOne({ coupleKey: coupleKeyFor(req), date: day.date })
    res.status(200).json(buildPayload(day, doc, req.userId!))
  } catch (error) {
    console.error('getToday error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// POST mark today as done, with an optional note. Calling it again returns the saved response.
export const completeToday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const note = parseNote(req.body?.note)
    if (note === null) {
      res.status(400).json({ message: `Note must be text up to ${NOTE_MAX} characters` })
      return
    }

    const day = await resolveDay(req, req.body?.tz)
    const coupleKey = coupleKeyFor(req)
    const filter = { coupleKey, date: day.date }

    try {
      await DailyConnection.updateOne(
        filter,
        { $setOnInsert: { prompt: promptForDate(day.date), responses: [] } },
        { upsert: true }
      )
    } catch (error: any) {
      // Both partners created today's record at the same moment; the other insert won
      if (error?.code !== 11000) throw error
    }

    const now = new Date()
    const added = await DailyConnection.updateOne(
      { ...filter, 'responses.user': { $ne: req.user!._id } },
      { $push: { responses: { user: req.user!._id, note, completedAt: now, updatedAt: now } } }
    )

    const doc = await DailyConnection.findOne(filter)
    if (added.modifiedCount > 0 && doc) {
      const mine = doc.responses.find(r => r.user.toString() === req.userId)
      if (mine) notifyPartner(req, day.date, mine)
    }

    res.status(200).json(buildPayload(day, doc, req.userId!))
  } catch (error) {
    console.error('completeToday error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// PATCH edit your own note for today
export const updateTodayNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const note = parseNote(req.body?.note)
    if (note === null) {
      res.status(400).json({ message: `Note must be text up to ${NOTE_MAX} characters` })
      return
    }

    const day = await resolveDay(req, req.body?.tz)
    const filter = { coupleKey: coupleKeyFor(req), date: day.date }

    const doc = await DailyConnection.findOneAndUpdate(
      { ...filter, 'responses.user': req.user!._id },
      { $set: { 'responses.$.note': note, 'responses.$.updatedAt': new Date() } },
      { new: true }
    )
    if (!doc) {
      res.status(404).json({ message: "Complete today's connection before editing your note" })
      return
    }

    const mine = doc.responses.find(r => r.user.toString() === req.userId)
    if (mine) notifyPartner(req, day.date, mine)

    res.status(200).json(buildPayload(day, doc, req.userId!))
  } catch (error) {
    console.error('updateTodayNote error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}
