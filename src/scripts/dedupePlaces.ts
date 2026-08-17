/**
 * dedupePlaces.ts
 *
 * একই জায়গা একাধিকবার DB তে ঢুকে গেছে — সেগুলো সরায়।
 * প্রতি group এ সবচেয়ে সম্পূর্ণ doc রাখা হয় (বেশি ছবি → বড় description →
 * বেশি view), আর বাদ পড়া doc এ যদি address/description বেশি থাকে সেটা
 * রাখা doc এ merge হয়ে যায়। মোছার আগে পুরো doc backup হয়।
 *
 * Dry run : npx ts-node src/scripts/dedupePlaces.ts
 * Apply   : npx ts-node src/scripts/dedupePlaces.ts --apply
 */

import dotenv from 'dotenv'
import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'

dotenv.config()

const APPLY = process.argv.includes('--apply')

/** একই নাম হলেও এর চেয়ে দূরে হলে আলাদা জায়গা (যেমন দুই শহরের একই নামের গির্জা) */
const SAME_SPOT_M = 50

/** নাম আলাদা কিন্তু হাতে যাচাই করে দেখা গেছে একই জায়গা */
const MANUAL_DUPLICATE_GROUPS = [
  ['69ebd7c8668604cc975235ce', '6a024a2bd5f1a69dce5ad046'], // Pa Onde Sea
  ['6a024a15d5f1a69dce5acecc', '6a400ffe4f5c84ad3becfa2b'], // Escambrón
  ['6a024a54d5f1a69dce5ad2f8', '6a024a76d5f1a69dce5ad51c'], // Ruinas de Caparra
]

/** পুরো group টাই আবর্জনা — কোনো copy রাখার দরকার নেই */
const JUNK_NAMES = ['sdf']

const Place = mongoose.model(
  'Place',
  new mongoose.Schema({}, { strict: false }),
  'places',
)

const normalize = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const distanceM = ([lng1, lat1]: number[], [lng2, lat2]: number[]): number => {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(a))
}

const richness = (place: any) => [
  place.media?.length || 0,
  String(place.description || '').length,
  place.openCount || 0,
  String(place.address || '').length,
]

/** সবচেয়ে সম্পূর্ণ doc আগে */
const byRichness = (a: any, b: any) => {
  const left = richness(a)
  const right = richness(b)
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return right[i] - left[i]
  }
  return 0
}

/** বাদ পড়া doc এ যা বেশি আছে সেটুকু রাখা doc এ তুলে আনি */
const mergedFields = (keeper: any, dropped: any[]) => {
  const patch: Record<string, unknown> = {}
  for (const field of ['address', 'description', 'access', 'country'] as const) {
    const best = [keeper, ...dropped]
      .map(place => String(place[field] || '').trim())
      .sort((a, b) => b.length - a.length)[0]
    if (best && best !== String(keeper[field] || '').trim()) patch[field] = best
  }
  return patch
}

const groupDuplicates = (places: any[]): any[][] => {
  const groups: any[][] = []
  const used = new Set<string>()

  const idOf = (place: any) => String(place._id)

  for (const ids of MANUAL_DUPLICATE_GROUPS) {
    const group = places.filter(place => ids.includes(idOf(place)))
    if (group.length > 1) {
      group.forEach(place => used.add(idOf(place)))
      groups.push(group)
    }
  }

  const byName = new Map<string, any[]>()
  for (const place of places) {
    if (used.has(idOf(place))) continue
    const key = normalize(place.name)
    if (JUNK_NAMES.includes(key)) continue
    byName.set(key, [...(byName.get(key) || []), place])
  }

  for (const candidates of byName.values()) {
    if (candidates.length < 2) continue

    // একই নামের মধ্যে যারা একই বিন্দুতে, শুধু তারাই এক group
    const remaining = [...candidates]
    while (remaining.length) {
      const head = remaining.shift()!
      const cluster = [head]
      for (let i = remaining.length - 1; i >= 0; i--) {
        const a = head.location?.coordinates
        const b = remaining[i].location?.coordinates
        if (a && b && distanceM(a, b) <= SAME_SPOT_M) {
          cluster.push(remaining.splice(i, 1)[0])
        }
      }
      if (cluster.length > 1) groups.push(cluster)
    }
  }

  return groups
}

const run = async () => {
  await mongoose.connect(process.env.DATABASE_URL!)
  console.log(`✅ Connected  (${APPLY ? 'APPLY' : 'DRY RUN'})\n`)

  const places: any[] = await Place.find({}).lean()
  const groups = groupDuplicates(places)

  const toDelete: any[] = []
  const patches: { id: any; patch: Record<string, unknown> }[] = []

  for (const group of groups) {
    const [keeper, ...dropped] = [...group].sort(byRichness)
    toDelete.push(...dropped)

    console.log(`══ ${keeper.name}`)
    console.log(
      `   keep   ${keeper._id}  media=${keeper.media?.length || 0} desc=${String(keeper.description || '').length}ch`,
    )
    dropped.forEach(place =>
      console.log(
        `   delete ${place._id}  "${place.name}"  media=${place.media?.length || 0} desc=${String(place.description || '').length}ch`,
      ),
    )

    const patch = mergedFields(keeper, dropped)
    if (Object.keys(patch).length) {
      patches.push({ id: keeper._id, patch })
      console.log(`   merge  ${Object.keys(patch).join(', ')}`)
    }
  }

  const junk = places.filter(place => JUNK_NAMES.includes(normalize(place.name)))
  if (junk.length) {
    console.log(`\n══ junk entries`)
    junk.forEach(place => console.log(`   delete ${place._id}  "${place.name}"`))
    toDelete.push(...junk)
  }

  console.log(`\n═══════════════════════════════════════`)
  console.log(`duplicate groups : ${groups.length}`)
  console.log(`docs to delete   : ${toDelete.length}`)
  console.log(`docs to enrich   : ${patches.length}`)
  console.log(`═══════════════════════════════════════`)

  if (!APPLY) {
    console.log('\nDry run — nothing changed. Add --apply to run it.')
    await mongoose.disconnect()
    return
  }

  const backupDir = path.join(process.cwd(), 'scratch')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
  const backupPath = path.join(
    backupDir,
    `deduped-places-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  fs.writeFileSync(backupPath, JSON.stringify(toDelete, null, 2))
  console.log(`\n💾 Backup: ${backupPath}`)

  for (const { id, patch } of patches) {
    await Place.findByIdAndUpdate(id, { $set: patch })
  }

  const result = await Place.deleteMany({
    _id: { $in: toDelete.map(place => place._id) },
  })
  console.log(`🗑️  Deleted: ${result.deletedCount} place(s)`)

  await mongoose.disconnect()
}

run().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
