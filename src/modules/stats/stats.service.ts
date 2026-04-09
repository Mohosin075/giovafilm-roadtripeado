import { Map } from '../map/map.model'
import { Place } from '../place/place.model'
import { Offer } from '../offer/offer.model'
import { User } from '../user/user.model'
import {
  IDashboardData,
  IRecentActivity,
  IReportsData,
  ISalesAndTaxesMonthly,
  IUsageItem,
} from './stats.interface'

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

const getReportsData = async (): Promise<IReportsData> => {
  // 1. Sales & Taxes Stats (Mocking based on image)
  const totalSales = 31900
  const taxesCollected = 3190
  const netRevenue = 28710

  const monthlyData: ISalesAndTaxesMonthly[] = [
    { month: 'Jan', totalSales: 4200, taxes: 420, netRevenue: 3780 },
    { month: 'Feb', totalSales: 5100, taxes: 510, netRevenue: 4590 },
    { month: 'Mar', totalSales: 3800, taxes: 380, netRevenue: 3420 },
    { month: 'Apr', totalSales: 6200, taxes: 620, netRevenue: 5580 },
    { month: 'May', totalSales: 5500, taxes: 550, netRevenue: 4950 },
    { month: 'Jun', totalSales: 7100, taxes: 710, netRevenue: 6390 },
  ]

  // 2. Usage Stats (Top 5 for each)
  const mostViewedMapsRaw = await Map.find()
    .sort({ viewCount: -1 })
    .limit(5)
    .select('name viewCount')
  const mostViewedMaps: IUsageItem[] = mostViewedMapsRaw.map(m => ({
    name: m.name,
    count: (m as any).viewCount || 0,
  }))

  const mostOpenedPlacesRaw = await Place.find()
    .sort({ openCount: -1 })
    .limit(5)
    .select('name openCount')
  const mostOpenedPlaces: IUsageItem[] = mostOpenedPlacesRaw.map(p => ({
    name: p.name,
    count: (p as any).openCount || 0,
  }))

  const mostRedeemedOffersRaw = await Offer.find()
    .sort({ redemptionsCount: -1 })
    .limit(5)
    .select('title redemptionsCount')
  const mostRedeemedOffers: IUsageItem[] = mostRedeemedOffersRaw.map(o => ({
    name: o.title,
    count: o.redemptionsCount || 0,
  }))

  return {
    salesAndTaxes: {
      totalSales,
      taxesCollected,
      netRevenue,
      monthlyData,
    },
    usage: {
      mostViewedMaps,
      mostOpenedPlaces,
      mostRedeemedOffers,
    },
  }
}

export const StatsService = {
  getDashboardData,
  getReportsData,
}
