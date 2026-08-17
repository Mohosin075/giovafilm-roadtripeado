/**
 * pruneMissingLocalMedia.ts
 *
 * DB তে এমন /uploads/... path আছে যার ফাইল আর disk এ নেই — ওগুলো browser এ
 * 404 হয়ে broken image দেখায়। এই script সেই entry গুলো সরায়, যাতে পরে
 * fillMissingPlaceImages.ts চালিয়ে নতুন ছবি বসানো যায়।
 *
 * ⚠️  যে server এ আসল uploads folder আছে সেখান থেকেই চালাতে হবে। ভুল machine এ
 * চালালে ভালো path ও মুছে যাবে, তাই uploads folder ফাঁকা হলে script থেমে যায়।
 *
 * Dry run : npx ts-node src/scripts/pruneMissingLocalMedia.ts
 * Apply   : npx ts-node src/scripts/pruneMissingLocalMedia.ts --apply
 */

import dotenv from 'dotenv'
import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'

dotenv.config()

const APPLY = process.argv.includes('--apply')
const MIN_EXPECTED_FILES = 100

const Place = mongoose.model(
  'Place',
  new mongoose.Schema({}, { strict: false }),
  'places',
)

const fileExists = (url: string) =>
  fs.existsSync(path.join(process.cwd(), url.replace(/^\//, '')))

const keepExisting = (list: unknown): { next: string[]; dropped: string[] } => {
  const urls = (Array.isArray(list) ? list : []).filter(
    (item): item is string => typeof item === 'string',
  )
  const next: string[] = []
  const dropped: string[] = []

  for (const url of urls) {
    if (url.startsWith('/uploads/') && !fileExists(url)) dropped.push(url)
    else next.push(url)
  }

  return { next, dropped }
}

const run = async () => {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'images')
  const fileCount = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).length
    : 0

  if (fileCount < MIN_EXPECTED_FILES) {
    console.error(
      `❌ uploads/images has only ${fileCount} file(s). Run this on the server that holds the uploads.`,
    )
    process.exit(1)
  }

  await mongoose.connect(process.env.DATABASE_URL!)
  console.log(`✅ Connected  (${APPLY ? 'APPLY' : 'DRY RUN'})\n`)

  const places: any[] = await Place.find({}).lean()
  let removed = 0
  let touched = 0

  for (const place of places) {
    const media = keepExisting(place.media)
    const menuImages = keepExisting(place.menuImages)
    const dropped = media.dropped.length + menuImages.dropped.length
    if (!dropped) continue

    console.log(
      `🔧 ${place.name}: ${dropped} missing file(s), ${media.next.length} image(s) left`,
    )
    removed += dropped
    touched++

    if (APPLY) {
      await Place.findByIdAndUpdate(place._id, {
        $set: { media: media.next, menuImages: menuImages.next },
      })
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`🗑️  ${APPLY ? 'Removed' : 'Would remove'} : ${removed} entry`)
  console.log(`📍 Places affected      : ${touched}`)
  console.log('═══════════════════════════════════════\n')

  await mongoose.disconnect()
}

run().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
