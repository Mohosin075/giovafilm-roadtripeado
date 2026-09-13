import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Category } from '../modules/category/category.model'
import { Place } from '../modules/place/place.model'
import { Business } from '../modules/business/business.model'
import { Offer } from '../modules/offer/offer.model'
import { Map } from '../modules/map/map.model'
import { autoTranslateField } from '../utils/autoTranslate'
import { I18nString } from '../interfaces/i18n.interface'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function safeTranslate(text: string | undefined): Promise<I18nString | undefined> {
  if (!text || typeof text !== 'string' || text.trim() === '') return undefined
  await sleep(200) // Throttle to prevent rate-limiting
  return await autoTranslateField(text, 'es')
}

async function backfillTranslations() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is missing in environment variables.')
    process.exit(1)
  }

  console.log('Connecting to database for rate-limit safe translation backfill...')
  await mongoose.connect(DATABASE_URL)
  console.log('Connected to Database successfully!')

  try {
    // 1. Backfill Categories
    console.log('\n--- Backfilling Categories ---')
    const categories = await Category.find({})
    for (const cat of categories) {
      if (typeof cat.name === 'string') {
        const i18n = await safeTranslate(cat.name)
        if (i18n) {
          await Category.updateOne({ _id: cat._id }, { name: i18n })
          console.log(`Updated Category [${cat._id}]: "${cat.name}" -> EN: "${i18n.en}"`)
        }
      }
    }

    // 2. Backfill Maps
    console.log('\n--- Backfilling Maps ---')
    const maps = await Map.find({})
    for (const map of maps) {
      const updateData: any = {}
      if (typeof map.name === 'string') {
        updateData.name = await safeTranslate(map.name)
      }
      if (typeof map.description === 'string') {
        updateData.description = await safeTranslate(map.description)
      }
      if (Object.keys(updateData).length > 0) {
        await Map.updateOne({ _id: map._id }, updateData)
        console.log(`Updated Map [${map._id}]`)
      }
    }

    // 3. Backfill Businesses
    console.log('\n--- Backfilling Businesses ---')
    const businesses = await Business.find({})
    for (const bus of businesses) {
      const updateData: any = {}
      if (typeof bus.name === 'string') {
        updateData.name = await safeTranslate(bus.name)
      }
      if (typeof bus.description === 'string') {
        updateData.description = await safeTranslate(bus.description)
      }
      if (Object.keys(updateData).length > 0) {
        await Business.updateOne({ _id: bus._id }, updateData)
        console.log(`Updated Business [${bus._id}]`)
      }
    }

    // 4. Backfill Offers
    console.log('\n--- Backfilling Offers ---')
    const offers = await Offer.find({})
    for (const off of offers) {
      const updateData: any = {}
      if (typeof off.title === 'string') {
        updateData.title = await safeTranslate(off.title)
      }
      if (typeof off.description === 'string') {
        updateData.description = await safeTranslate(off.description)
      }
      if (typeof off.buttonLabel === 'string') {
        updateData.buttonLabel = await safeTranslate(off.buttonLabel)
      }
      if (Object.keys(updateData).length > 0) {
        await Offer.updateOne({ _id: off._id }, updateData)
        console.log(`Updated Offer [${off._id}]`)
      }
    }

    // 5. Backfill Places
    console.log('\n--- Backfilling Places ---')
    const places = await Place.find({})
    let placeCount = 0
    for (const place of places) {
      const updateData: any = {}
      if (typeof place.name === 'string') {
        updateData.name = await safeTranslate(place.name)
      }
      if (typeof place.description === 'string') {
        updateData.description = await safeTranslate(place.description)
      }
      if (place.access && typeof place.access === 'string') {
        updateData.access = await safeTranslate(place.access)
      }
      if (place.entryCost && typeof place.entryCost === 'string') {
        updateData.entryCost = await safeTranslate(place.entryCost)
      }
      if (place.hikeTime && typeof place.hikeTime === 'string') {
        updateData.hikeTime = await safeTranslate(place.hikeTime)
      }
      if (place.atmosphere && typeof place.atmosphere === 'string') {
        updateData.atmosphere = await safeTranslate(place.atmosphere)
      }
      if (place.accessibility?.notes && typeof place.accessibility.notes === 'string') {
        updateData['accessibility.notes'] = await safeTranslate(place.accessibility.notes)
      }
      if (place.recommendations?.tips && typeof place.recommendations.tips === 'string') {
        updateData['recommendations.tips'] = await safeTranslate(place.recommendations.tips)
      }

      if (Object.keys(updateData).length > 0) {
        await Place.updateOne({ _id: place._id }, updateData)
        placeCount++
        console.log(`[${placeCount}/${places.length}] Updated Place [${place._id}]: "${typeof place.name === 'string' ? place.name : (updateData.name?.es || 'Place')}"`)
      }
    }

    console.log('\n✅ All database records pre-translated and backfilled successfully!')
  } catch (error) {
    console.error('Error backfilling translations:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Database disconnected.')
  }
}

backfillTranslations()
