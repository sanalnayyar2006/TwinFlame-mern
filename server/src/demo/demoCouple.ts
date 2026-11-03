import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User, { IUser } from '../models/User'
import Journal from '../models/Journal'
import Gallery from '../models/Gallery'
import DailyConnection from '../models/DailyConnection'
import { destroyImages, journalImageIds } from '../config/cloudinary'
import { generateCoupleCode } from '../utils/coupleCode'

// A shared, public sample couple for people evaluating the app (DEMO_MODE=true).
// Anyone can write to it, so it is wiped and recreated once it is a day old.
export const DEMO_EMAILS = { ana: 'ana@demo.twinflame.app', ben: 'ben@demo.twinflame.app' } as const
export type DemoPartner = keyof typeof DEMO_EMAILS

const MAX_AGE_MS = 24 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

// Sample entries, labeled as demo content in the app's login screen
const SAMPLE_JOURNALS: { by: DemoPartner; daysAgo: number; title: string; content: string }[] = [
  { by: 'ana', daysAgo: 6, title: 'Sunday market', content: '<p>We finally went to the market on Lake Road. You bargained for the mangoes like a pro and then paid full price anyway.</p>' },
  { by: 'ben', daysAgo: 4, title: 'Long week', content: '<p>Work was a lot this week. Thank you for the tea on Wednesday night. I noticed, even if I was quiet.</p>' },
  { by: 'ana', daysAgo: 2, title: 'Trip ideas', content: '<p>Three places for the long weekend:</p><ul><li>The hills, if it is not raining</li><li>That bookshop town</li><li>Staying home with no phones</li></ul>' },
  { by: 'ben', daysAgo: 1, title: 'Small thing', content: '<p>You laughed at my terrible joke this morning. Writing it down so I remember that it worked once.</p>' }
]

const unusablePassword = () => bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)

const wipe = async () => {
  const existing = await User.find({ email: { $in: Object.values(DEMO_EMAILS) } })
  const coupleIds = [...new Set(existing.map(u => u.coupleId).filter(Boolean))] as string[]
  for (const coupleId of coupleIds) {
    const [journals, photos] = await Promise.all([Journal.find({ coupleId }), Gallery.find({ coupleId })])
    // Visitors may have uploaded photos; remove them from storage too
    await destroyImages([...journals.flatMap(j => journalImageIds(j.content, coupleId)), ...photos.map(p => p.publicId)])
    await Promise.all([
      Journal.deleteMany({ coupleId }),
      Gallery.deleteMany({ coupleId }),
      DailyConnection.deleteMany({ coupleKey: coupleId })
    ])
  }
  await User.deleteMany({ _id: { $in: existing.map(u => u._id) } })
}

export const resetDemoCouple = async () => {
  await wipe()
  const [ana, ben] = await Promise.all(
    (['ana', 'ben'] as const).map(async p =>
      User.create({
        name: p === 'ana' ? 'Ana' : 'Ben',
        email: DEMO_EMAILS[p],
        password: await unusablePassword(),
        coupleCode: generateCoupleCode()
      })
    )
  )
  const coupleId = `${ana._id}_${ben._id}`
  await User.updateOne({ _id: ana._id }, { partnerId: ben._id, coupleId, mood: 'Happy' })
  await User.updateOne({ _id: ben._id }, { partnerId: ana._id, coupleId, mood: 'Calm' })

  const now = Date.now()
  const authors = { ana: ana._id, ben: ben._id }
  await Journal.insertMany(
    SAMPLE_JOURNALS.map(j => ({
      title: j.title,
      content: j.content,
      author: authors[j.by],
      coupleId,
      createdAt: new Date(now - j.daysAgo * DAY),
      updatedAt: new Date(now - j.daysAgo * DAY)
    }))
  )
  return { ana, ben, coupleId }
}

// One reset at a time, even if several visitors arrive together
let inFlight: Promise<unknown> | null = null

export const getDemoUser = async (partner: DemoPartner): Promise<IUser> => {
  const user = await User.findOne({ email: DEMO_EMAILS[partner] })
  const stale = !user || !user.coupleId || Date.now() - user.createdAt.getTime() > MAX_AGE_MS
  if (stale) {
    inFlight ??= resetDemoCouple().finally(() => { inFlight = null })
    await inFlight
    return (await User.findOne({ email: DEMO_EMAILS[partner] }))!
  }
  return user
}
