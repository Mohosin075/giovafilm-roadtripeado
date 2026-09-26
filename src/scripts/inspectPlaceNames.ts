import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env')
    process.exit(1)
  }

  await mongoose.connect(DATABASE_URL)
  console.log('Connected to database')

  const Place = mongoose.model('Place', new mongoose.Schema({}, { strict: false }), 'places')

  const places = await Place.find({}, { name: 1, location: 1 }).limit(30)

  console.log('\n--- Sample 30 Places in Database ---')
  places.forEach((p: any, i: number) => {
    console.log(`${i + 1}. [${p._id}] EN: "${p.name?.en}" | ES: "${p.name?.es}"`)
  })

  // Read KML file and extract names
  const kmlPath = path.join(__dirname, '../../Roadtripeado Maps 1.0 🇵🇷.kml')
  if (fs.existsSync(kmlPath)) {
    const kmlContent = fs.readFileSync(kmlPath, 'utf-8')
    const kmlNames = Array.from(kmlContent.matchAll(/<name>(.*?)<\/name>/g)).map(m => m[1])
    console.log(`\n--- Found ${kmlNames.length} names in KML file ---`)
    console.log('KML Sample Names:', kmlNames.slice(0, 15))
  } else {
    console.log('\nKML file not found at:', kmlPath)
  }

  await mongoose.disconnect()
}

main().catch(console.error)
