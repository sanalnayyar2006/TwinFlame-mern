import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import streamifier from 'streamifier'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadBuffer = (buffer: Buffer, folder: string): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => {
      if (result) resolve(result)
      else reject(error)
    })
    streamifier.createReadStream(buffer).pipe(stream)
  })

// Journal photos live under one folder per couple, so cleanup can never touch another couple's files
export const journalFolder = (coupleId: string) => `twinflame/journal/${coupleId}`

// Public IDs of this couple's journal photos referenced in an entry's HTML
export const journalImageIds = (html: string, coupleId: string): string[] => {
  const prefix = journalFolder(coupleId) + '/'
  const ids = new Set<string>()
  for (const [, src] of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    const match = src.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(twinflame\/journal\/.+)\.[a-z0-9]+$/i)
    if (match && match[1].startsWith(prefix)) ids.add(match[1])
  }
  return [...ids]
}

// Best effort: a failed delete leaves an orphaned file but must not fail the user's request
export const destroyImages = async (publicIds: string[]) => {
  await Promise.allSettled(publicIds.map(id => cloudinary.uploader.destroy(id)))
}

export default cloudinary
