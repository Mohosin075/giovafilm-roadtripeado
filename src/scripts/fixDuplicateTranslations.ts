/**
 * Fix Duplicate Translations
 * ─────────────────────────────────────────────────────────────────────
 * Finds all documents across all translatable models where a field has
 * { en: X, es: X } (same string in both languages) and re-translates them.
 *
 * Run: npx.cmd ts-node src/scripts/fixDuplicateTranslations.ts
 */
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
import { I18nString } from '../interfaces/i18n.interface'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Returns true when the field is a duplicate { en: X, es: X } */
const isDuplicate = (val: any): boolean => {
  if (!val || typeof val !== 'object') return false
  const en = (val.en || '').trim()
  const es = (val.es || '').trim()
  return !!(en && es && en === es)
}

/** Re-translate a duplicate field */
async function fixField(val: any): Promise<I18nString | null> {
  if (!isDuplicate(val)) return null
  await sleep(200)
  return await autoTranslateField(val)
}

let totalFixed = 0

async function fixModel(
  label: string,
  docs: any[],
  fields: string[],
  Model: mongoose.Model<any>
) {
  console.log(`\n--- Fixing ${label} (${docs.length} docs) ---`)
  for (const doc of docs) {
    const updateData: any = {}
    for (const field of fields) {
      const nested = field.split('.')
      const val = nested.reduce((obj: any, key: string) => obj?.[key], doc as any)
      const fixed = await fixField(val)
      if (fixed) updateData[field] = fixed
    }
    if (Object.keys(updateData).length > 0) {
      await Model.updateOne({ _id: doc._id }, updateData)
      totalFixed++
      const sample = Object.values(updateData)[0] as I18nString
      console.log(
        `  Fixed [${doc._id}] — EN: "${(sample.en || '').slice(0, 40)}" | ES: "${(sample.es || '').slice(0, 40)}"`
      )
    }
  }
}

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is missing.')
    process.exit(1)
  }

  console.log('Connecting to database...')
  await mongoose.connect(DATABASE_URL)
  console.log('Connected! Scanning for en===es duplicates...\n')

  try {
    await fixModel('Categories', await Category.find({}), ['name'], Category)
    await fixModel('Maps', await Map.find({}), ['name', 'description'], Map)
    await fixModel('Businesses', await Business.find({}), ['name', 'description'], Business)
    await fixModel('Offers', await Offer.find({}), ['title', 'description', 'buttonLabel'], Offer)
    await fixModel('AwardConfigs', await AwardConfig.find({}), ['title', 'description'], AwardConfig)
    await fixModel('SubscriptionPlans', await SubscriptionPlan.find({}), ['name', 'description'], SubscriptionPlan)
    await fixModel(
      'Places',
      await Place.find({}),
      ['name', 'description', 'access', 'entryCost', 'difficulty', 'hikeTime', 'atmosphere', 'accessibility.notes', 'recommendations.tips'],
      Place
    )
    await fixModel('Reviews', await Review.find({}), ['review'], Review)
    await fixModel('Notifications', await Notification.find({}), ['title', 'content', 'actionText'], Notification)

    console.log(`\n✅ Done! Fixed ${totalFixed} duplicate translation fields.`)
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await mongoose.disconnect()
    console.log('Database disconnected.')
  }
}

main()
