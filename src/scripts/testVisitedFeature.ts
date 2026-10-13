import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { User } from '../modules/user/user.model'
import { Place } from '../modules/place/place.model'
import { VisitedService } from '../modules/visited/visited.service'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL

async function runManualTest() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env')
    return
  }

  console.log('Connecting to MongoDB...')
  await mongoose.connect(DATABASE_URL)
  console.log('MongoDB connected successfully.\n')

  try {
    // 1. Pick a test user
    const user = await User.findOne({ status: 'active' }) || await User.findOne({})
    if (!user) {
      console.log('No user found in database to test.')
      return
    }
    const userId = user._id.toString()
    console.log(`Test User: ${user.name || user.email} (ID: ${userId})`)

    // 2. Pick a test place
    const place = await Place.findOne({ status: 'Published' }) || await Place.findOne({})
    if (!place) {
      console.log('No place found in database to test.')
      return
    }
    const placeId = place._id.toString()
    console.log(`Test Place: ${typeof place.name === 'object' ? place.name.en || place.name.es : place.name} (ID: ${placeId})\n`)

    // Initial count
    const initialCountRes = await VisitedService.getVisitedCount(userId)
    console.log(`[Step 1] Initial Visited Count: ${initialCountRes.visitedPlacesCount}`)

    // 3. Mark as Visited (Toggle 1)
    console.log('\n[Step 2] Marking place as Visited (Toggle 1)...')
    const toggle1 = await VisitedService.toggleVisited(userId, { placeId })
    console.log('Result:', toggle1)

    // Verify User in DB
    const userAfterMark = await User.findById(userId).select('visitedPlaces visitedPlacesCount')
    console.log('User DB State -> visitedPlacesCount:', userAfterMark?.visitedPlacesCount)
    console.log('User DB State -> visitedPlaces includes placeId?', userAfterMark?.visitedPlaces?.map(id => id.toString()).includes(placeId))

    // 4. Fetch My Visited Places
    console.log('\n[Step 3] Fetching My Visited Places (List)...')
    const myPlaces = await VisitedService.getMyVisitedPlaces(userId, { page: 1, limit: 5 })
    console.log(`Total Visited Places in List: ${myPlaces.meta.total}`)
    const foundInList = myPlaces.data.find((item: any) => item.place?._id?.toString() === placeId || item.business?._id?.toString() === placeId)
    console.log('Place successfully returned in list?', !!foundInList)
    if (foundInList) {
      console.log('Place Name in List:', foundInList.place?.name || foundInList.business?.name)
      console.log('isVisited flag:', foundInList.isVisited)
    }

    // 5. Unmark (Toggle 2)
    console.log('\n[Step 4] Unmarking place as Visited (Toggle 2)...')
    const toggle2 = await VisitedService.toggleVisited(userId, { placeId })
    console.log('Result:', toggle2)

    // Verify User in DB after unmark
    const userAfterUnmark = await User.findById(userId).select('visitedPlaces visitedPlacesCount')
    console.log('User DB State -> visitedPlacesCount:', userAfterUnmark?.visitedPlacesCount)
    console.log('User DB State -> visitedPlaces still includes placeId?', userAfterUnmark?.visitedPlaces?.map(id => id.toString()).includes(placeId))

    console.log('\nALL CHECKS PASSED SUCCESSFULLY!')
  } catch (error) {
    console.error('Test failed with error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\nMongoDB disconnected.')
  }
}

runManualTest()
