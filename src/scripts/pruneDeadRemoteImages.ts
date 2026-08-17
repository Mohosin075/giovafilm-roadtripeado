/**
 * pruneDeadRemoteImages.ts
 *
 * DB তে থেকে যাওয়া Google hosted image link গুলো সরায়। ওই link এ API key থাকে
 * আর photo_reference expire করে, তাই browser এ broken image দেখায় —
 * entry মুছে দিলে UI placeholder দেখাবে।
 *
 * Run: npx ts-node src/scripts/pruneDeadRemoteImages.ts
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { isRemoteManagedImage } from '../utils/remoteImage'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL!

const Place = mongoose.model(
  'Place',
  new mongoose.Schema({}, { strict: false }),
  'places',
)
const Business = mongoose.model(
  'Business',
  new mongoose.Schema({}, { strict: false }),
  'businesses',
)

const keepUsable = (list: unknown): string[] =>
  (Array.isArray(list) ? list : [])
    .filter((item): item is string => typeof item === 'string')
    .filter(url => !isRemoteManagedImage(url))

const run = async () => {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  await mongoose.connect(DATABASE_URL)
  console.log('✅ Connected\n')

  let removed = 0
  let touchedPlaces = 0

  const places: any[] = await Place.find({}).lean()
  for (const place of places) {
    const media = keepUsable(place.media)
    const menuImages = keepUsable(place.menuImages)
    const before =
      (place.media?.length || 0) + (place.menuImages?.length || 0)
    const after = media.length + menuImages.length
    if (before === after) continue

    await Place.findByIdAndUpdate(place._id, { $set: { media, menuImages } })
    removed += before - after
    touchedPlaces++
    console.log(
      `🔧 ${place.name}: removed ${before - after}, kept ${after} image(s)`,
    )
  }

  let touchedBusinesses = 0
  const businesses: any[] = await Business.find({}).lean()
  for (const business of businesses) {
    const photos = keepUsable(business?.media?.photos)
    const before = business?.media?.photos?.length || 0
    if (before === photos.length) continue

    await Business.findByIdAndUpdate(business._id, {
      $set: { 'media.photos': photos },
    })
    removed += before - photos.length
    touchedBusinesses++
    console.log(
      `🔧 ${business.name}: removed ${before - photos.length}, kept ${photos.length} photo(s)`,
    )
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`🗑️  Dead links removed : ${removed}`)
  console.log(`📍 Places updated      : ${touchedPlaces}`)
  console.log(`🏢 Businesses updated  : ${touchedBusinesses}`)
  console.log('═══════════════════════════════════════\n')

  await mongoose.disconnect()
}

run().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
