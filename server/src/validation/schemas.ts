import { z } from 'zod'
import { Response } from 'express'

// Every field is a plain string, so objects like {"$ne": null} never reach a Mongo filter
const email = z.string({ error: 'Enter a valid email address' }).trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254))

export const registerSchema = z.object({
  name: z.string({ error: 'Name is required' }).trim().min(1, 'Name is required').max(60, 'Name must be 60 characters or fewer'),
  email,
  // Matches the client's register form; raise both together if the policy changes
  password: z.string({ error: 'Password is required' }).min(6, 'Password must be at least 6 characters').max(128, 'Password is too long')
})

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128, 'Password is too long')
})

export const googleAuthSchema = z
  .object({
    credential: z.string().min(1).max(4096).optional(),
    idToken: z.string().min(1).max(4096).optional()
  })
  .refine(b => b.credential || b.idToken, { message: 'Google token is required' })

export const linkPartnerSchema = z.object({
  partnerCode: z.string({ error: "Enter your partner's couple code" }).trim().toUpperCase().regex(/^[A-Z0-9]{4,8}$/, "Enter your partner's couple code")
})

// Preset label, or "Label||#rrggbb" for a custom mood; null clears it
export const moodSchema = z.object({
  mood: z
    .string()
    .trim()
    .max(40)
    .regex(/^[^|]{1,24}(\|\|#[0-9a-fA-F]{6})?$/, 'Invalid mood')
    .nullable()
})

// Inline photos are data:image URLs today (moving to Cloudinary later) or https links
const imageUrl = z.string().max(5_000_000).regex(/^(data:image\/(png|jpe?g|gif|webp|heic);base64,|https:\/\/)/, 'Invalid image')

export const demoLoginSchema = z.object({
  as: z.enum(['ana', 'ben'], { error: 'Choose Ana or Ben' })
})

// Browser PushSubscription.toJSON(); endpoints are always https on real push services
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/, error: 'Invalid push endpoint' }).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256)
  })
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2048)
})

export const journalCreateSchema = z.object({
  title: z.string({ error: 'Title and content required' }).trim().min(1, 'Title and content required').max(200),
  content: z.string({ error: 'Title and content required' }).min(1, 'Title and content required').max(5_000_000),
  imageUrl: imageUrl.optional()
})

// Empty string removes the photo
export const journalUpdateSchema = z.object({
  content: z.string().max(5_000_000).optional(),
  imageUrl: z.union([imageUrl, z.literal('')]).optional()
})

export const captionSchema = z.object({
  caption: z.string().trim().max(500, 'Caption must be 500 characters or fewer').optional()
})

// Parses req.body; on failure sends 400 with the first message and returns null
export const parseBody = <T extends z.ZodType>(schema: T, body: unknown, res: Response): z.infer<T> | null => {
  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? 'Invalid request' })
    return null
  }
  return result.data
}
