import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in .env')
  process.exit(1)
}

const Place = mongoose.model('Place', new mongoose.Schema({}, { strict: false }), 'places')

async function run() {
  try {
    await mongoose.connect(DATABASE_URL!)
    console.log('Connected to database successfully.')

    // Update all places (which currently have type: 'Regular') to type: 'Business'
    const result = await Place.updateMany(
      {},
      { 
        $set: { type: 'Business' } 
      }
    )

    console.log(`Migration Complete:`)
    console.log(`- Matched documents: ${result.matchedCount}`)
    console.log(`- Modified documents: ${result.modifiedCount}`)

    await mongoose.disconnect()
    console.log('Disconnected from database.')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

run()
