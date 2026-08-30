import mongoose from 'mongoose'
import { Map } from '../modules/map/map.model'
import * as dotenv from 'dotenv'

dotenv.config()

async function listMaps() {
  const uri = process.env.DATABASE_URL
  if (!uri) {
    console.error('DATABASE_URL is not set in env')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to database')

  const maps = await Map.find({}, 'name country isPaid price')
  console.log('--- Maps in Database ---')
  maps.forEach(m => {
    console.log(`ID: ${m._id}, Name: "${m.name}", Country: "${m.country}", Paid: ${m.isPaid}`)
  })

  await mongoose.disconnect()
  console.log('Disconnected')
}

listMaps()
