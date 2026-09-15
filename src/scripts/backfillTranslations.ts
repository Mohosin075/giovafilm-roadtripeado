import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Category } from '../modules/category/category.model'
import { Place } from '../modules/place/place.model'
import { Business } from '../modules/business/business.model'
import { Offer } from '../modules/offer/offer.model'
import { Map } from '../modules/map/map.model'
import { AwardConfig } from '../modules/award/awardConfig.model'
import { SubscriptionPlan } from '../modules/subscription/subscription-plan.model'
import { Review } from '../modules/review/review.model'
import { Notification } from '../modules/notification/notification.model'
import { autoTranslateField } from '../utils/autoTranslate'
import { I18nString, TranslatableString } from '../interfaces/i18n.interface'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function safeTranslate(field: TranslatableString | undefined | null): Promise<I18nString | undefined> {
  if (!field) return undefined
  if (typeof field === 'string' && field.trim() === '') return undefined
  if (typeof field === 'object' && field !== null) {
    const en = (field.en || '').trim()
    const es = (field.es || '').trim()
    if (en && es && en !== es) {
      return undefined // Already properly translated with different languages
    }
    // If en === es, fall through to autoTranslateField to fix the duplicate
  }

  await sleep(150) // Throttle to prevent rate-limiting
  return await autoTranslateField(field)
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
      const i18n = await safeTranslate(cat.name)
      if (i18n) {
        await Category.updateOne({ _id: cat._id }, { name: i18n })
        console.log(`Updated Category [${cat._id}]: ES: "${i18n.es}" | EN: "${i18n.en}"`)
      }
    }

    // 2. Backfill Maps
    console.log('\n--- Backfilling Maps ---')
    const maps = await Map.find({})
    for (const map of maps) {
      const updateData: any = {}
      const nameI18n = await safeTranslate(map.name)
      if (nameI18n) updateData.name = nameI18n

      const descI18n = await safeTranslate(map.description)
      if (descI18n) updateData.description = descI18n

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
      const nameI18n = await safeTranslate(bus.name)
      if (nameI18n) updateData.name = nameI18n

      const descI18n = await safeTranslate(bus.description)
      if (descI18n) updateData.description = descI18n

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
      const titleI18n = await safeTranslate(off.title)
      if (titleI18n) updateData.title = titleI18n

      const descI18n = await safeTranslate(off.description)
      if (descI18n) updateData.description = descI18n

      const btnI18n = await safeTranslate(off.buttonLabel)
      if (btnI18n) updateData.buttonLabel = btnI18n

      if (Object.keys(updateData).length > 0) {
        await Offer.updateOne({ _id: off._id }, updateData)
        console.log(`Updated Offer [${off._id}]`)
      }
    }

    // 5. Backfill Award Configs
    console.log('\n--- Backfilling Award Configs ---')
    const awards = await AwardConfig.find({})
    for (const aw of awards) {
      const updateData: any = {}
      const titleI18n = await safeTranslate(aw.title)
      if (titleI18n) updateData.title = titleI18n

      const descI18n = await safeTranslate(aw.description)
      if (descI18n) updateData.description = descI18n

      if (Object.keys(updateData).length > 0) {
        await AwardConfig.updateOne({ _id: aw._id }, updateData)
        console.log(`Updated AwardConfig [${aw._id}]`)
      }
    }

    // 6. Backfill Subscription Plans
    console.log('\n--- Backfilling Subscription Plans ---')
    const plans = await SubscriptionPlan.find({})
    for (const plan of plans) {
      const updateData: any = {}
      const nameI18n = await safeTranslate(plan.name)
      if (nameI18n) updateData.name = nameI18n

      const descI18n = await safeTranslate(plan.description)
      if (descI18n) updateData.description = descI18n

      if (plan.features && Array.isArray(plan.features)) {
        const translatedFeatures = []
        let featChanged = false
        for (const f of plan.features) {
          const featI18n = await safeTranslate(f)
          if (featI18n) {
            translatedFeatures.push(featI18n)
            featChanged = true
          } else {
            translatedFeatures.push(f)
          }
        }
        if (featChanged) {
          updateData.features = translatedFeatures
        }
      }

      if (Object.keys(updateData).length > 0) {
        await SubscriptionPlan.updateOne({ _id: plan._id }, updateData)
        console.log(`Updated SubscriptionPlan [${plan._id}]`)
      }
    }

    // 7. Backfill Places
    console.log('\n--- Backfilling Places ---')
    const places = await Place.find({})
    let placeCount = 0
    for (const place of places) {
      const updateData: any = {}
      const nameI18n = await safeTranslate(place.name)
      if (nameI18n) updateData.name = nameI18n

      const descI18n = await safeTranslate(place.description)
      if (descI18n) updateData.description = descI18n

      const accessI18n = await safeTranslate(place.access)
      if (accessI18n) updateData.access = accessI18n

      const entryCostI18n = await safeTranslate(place.entryCost)
      if (entryCostI18n) updateData.entryCost = entryCostI18n

      const diffI18n = await safeTranslate(place.difficulty)
      if (diffI18n) updateData.difficulty = diffI18n

      const hikeI18n = await safeTranslate(place.hikeTime)
      if (hikeI18n) updateData.hikeTime = hikeI18n

      const atmosI18n = await safeTranslate(place.atmosphere)
      if (atmosI18n) updateData.atmosphere = atmosI18n

      const notesI18n = await safeTranslate(place.accessibility?.notes)
      if (notesI18n) updateData['accessibility.notes'] = notesI18n

      const tipsI18n = await safeTranslate(place.recommendations?.tips)
      if (tipsI18n) updateData['recommendations.tips'] = tipsI18n

      if (Object.keys(updateData).length > 0) {
        await Place.updateOne({ _id: place._id }, updateData)
        placeCount++
        console.log(`[${placeCount}/${places.length}] Updated Place [${place._id}]: "${(updateData.name?.es || (typeof place.name === 'string' ? place.name : (place.name as any)?.es) || 'Place').slice(0, 40)}"`)
      }
    }

    // 8. Backfill Reviews
    console.log('\n--- Backfilling Reviews ---')
    const reviews = await Review.find({})
    for (const rev of reviews) {
      const reviewI18n = await safeTranslate(rev.review)
      if (reviewI18n) {
        await Review.updateOne({ _id: rev._id }, { review: reviewI18n })
        console.log(`Updated Review [${rev._id}]`)
      }
    }

    // 9. Backfill Notifications
    console.log('\n--- Backfilling Notifications ---')
    const notifications = await Notification.find({})
    for (const notif of notifications) {
      const updateData: any = {}
      const titleI18n = await safeTranslate(notif.title)
      if (titleI18n) updateData.title = titleI18n
      const contentI18n = await safeTranslate(notif.content)
      if (contentI18n) updateData.content = contentI18n
      const actionI18n = await safeTranslate(notif.actionText)
      if (actionI18n) updateData.actionText = actionI18n

      if (Object.keys(updateData).length > 0) {
        await Notification.updateOne({ _id: notif._id }, updateData)
        console.log(`Updated Notification [${notif._id}]`)
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

