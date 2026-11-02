// Moves base64 photos inside journal entries to Cloudinary and replaces them with URLs.
// Dry run by default:   pnpm --filter server migrate:journal-images
// Write changes:        pnpm --filter server migrate:journal-images --apply
import '../config/env'
import mongoose from 'mongoose'
import cloudinary, { journalFolder } from '../config/cloudinary'
import Journal from '../models/Journal'

const apply = process.argv.includes('--apply')
const DATA_IMG = /src="(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+)"/g

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string)
  const entries = await Journal.find({ $or: [{ content: /data:image\// }, { imageUrl: /^data:image\// }] })
  console.log(`${entries.length} entries with base64 photos${apply ? '' : ' (dry run, nothing will change)'}`)

  let moved = 0
  let failed = 0
  for (const entry of entries) {
    // The same photo can appear more than once; upload it once and replace every copy
    const found = [...entry.content.matchAll(DATA_IMG)].map(m => m[1])
    if (entry.imageUrl?.startsWith('data:image/')) found.push(entry.imageUrl)
    const dataUris = [...new Set(found)]
    const sizeKb = Math.round(dataUris.reduce((n, d) => n + d.length, 0) / 1024)
    console.log(`  ${entry._id}: ${dataUris.length} photo(s), ${sizeKb} KB`)
    if (!apply) continue

    let content = entry.content
    let imageUrl = entry.imageUrl
    let ok = true
    for (const dataUri of dataUris) {
      try {
        const { secure_url } = await cloudinary.uploader.upload(dataUri, { folder: journalFolder(entry.coupleId) })
        content = content.split(dataUri).join(secure_url)
        if (imageUrl === dataUri) imageUrl = secure_url
        moved++
      } catch (error) {
        ok = false
        failed++
        console.error(`    upload failed, entry left unchanged:`, (error as Error).message)
        break
      }
    }
    // Only save an entry when every photo in it moved, so no entry ends up half migrated
    if (ok) {
      entry.content = content
      entry.imageUrl = imageUrl
      await entry.save()
    }
  }

  console.log(apply ? `Done: ${moved} photo(s) moved, ${failed} failed.` : 'Run again with --apply to migrate.')
  await mongoose.disconnect()
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
