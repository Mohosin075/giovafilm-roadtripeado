import { Map } from '../map/map.model'
import { Place } from '../place/place.model'
import { Offer } from '../offer/offer.model'
import { User } from '../user/user.model'
import { IDashboardData, IRecentActivity } from './stats.interface'

const getDashboardData = async (): Promise<IDashboardData> => {
  const [totalMaps, totalPlaces, activeOffers] = await Promise.all([
    Map.countDocuments(),
    Place.countDocuments(),
    Offer.countDocuments({ status: 'ACTIVE' }),
  ])

  // Mocking revenue and sales for now as they are not explicitly stored in a Transaction model
  // In a real production scenario, these would be aggregated from a payments/subscriptions collection
  const totalSales = 12450
  const thisMonthRevenue = 3280
  const taxesCollected = 820

  const recentMaps = await Map.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .select('name createdAt')
  const recentPlaces = await Place.find()
    .sort({ updatedAt: -1 })
    .limit(3)
    .select('name updatedAt')
  const recentOffers = await Offer.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .select('title createdAt')
  const recentUsers = await User.find()
    .sort({ updatedAt: -1 })
    .limit(3)
    .select('name role updatedAt')

  const recentActivity: IRecentActivity[] = []

  recentPlaces.forEach((place: any) => {
    recentActivity.push({
      id: place._id.toString(),
      type: 'place',
      message: `Place updated: ${place.name}`,
      timestamp: place.updatedAt,
    })
  })

  recentOffers.forEach((offer: any) => {
    recentActivity.push({
      id: offer._id.toString(),
      type: 'offer',
      message: `Offer published: ${offer.title}`,
      timestamp: offer.createdAt,
    })
  })

  recentMaps.forEach((map: any) => {
    recentActivity.push({
      id: map._id.toString(),
      type: 'map',
      message: `Map created: ${map.name}`,
      timestamp: map.createdAt,
    })
  })

  recentUsers.forEach((user: any) => {
    recentActivity.push({
      id: user._id.toString(),
      type: 'user',
      message: `User role changed: ${user.name || 'Unknown User'} to ${user.role}`,
      timestamp: user.updatedAt,
    })
  })

  // Sort by timestamp descending and take top 6
  recentActivity.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  )

  return {
    stats: {
      totalMaps,
      totalPlaces,
      activeOffers,
      totalSales,
      thisMonthRevenue,
      taxesCollected,
    },
    recentActivity: recentActivity.slice(0, 6),
  }
}

export const StatsService = {
  getDashboardData,
}
