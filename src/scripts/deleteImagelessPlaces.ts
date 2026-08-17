/**
 * deleteImagelessPlaces.ts
 *
 * যেসব Place এ কোনো ছবি নেই সেগুলো DB থেকে মুছে দেয়।
 * মোছার আগে সবসময় scratch/deleted-places-<timestamp>.json এ পুরো document
 * backup রাখে, যাতে ভুল হলে ফিরিয়ে আনা যায়।
 *
 * Dry run : npx ts-node src/scripts/deleteImagelessPlaces.ts
 * Apply   : npx ts-node src/scripts/deleteImagelessPlaces.ts --apply
 */

import dotenv from 'dotenv'
import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'

dotenv.config()

const APPLY = process.argv.includes('--apply')

const Place = mongoose.model(
  'Place',
  new mongoose.Schema({}, { strict: false }),
  'places',
)

const run = async () => {
  await mongoose.connect(process.env.DATABASE_URL!)
  console.log(`✅ Connected  (${APPLY ? 'APPLY' : 'DRY RUN'})\n`)

  const places: any[] = await Place.find({}).lean()
  const targets = places.filter(
    place => !Array.isArray(place.media) || place.media.length === 0,
  )

  targets.forEach((place, index) =>
    console.log(
      `${String(index + 1).padStart(2)}. ${place.name}  [${place.country || '-'}]`,
    ),
  )
  console.log(`\ntotal: ${targets.length}`)

  if (!APPLY) {
    console.log('\nDry run — nothing deleted. Add --apply to delete.')
    await mongoose.disconnect()
    return
  }

  const backupDir = path.join(process.cwd(), 'scratch')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
  const backupPath = path.join(
    backupDir,
    `deleted-places-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  fs.writeFileSync(backupPath, JSON.stringify(targets, null, 2))
  console.log(`\n💾 Backup: ${backupPath}`)

  const result = await Place.deleteMany({
    _id: { $in: targets.map(place => place._id) },
  })
  console.log(`🗑️  Deleted: ${result.deletedCount} place(s)`)

  await mongoose.disconnect()
}

run().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
