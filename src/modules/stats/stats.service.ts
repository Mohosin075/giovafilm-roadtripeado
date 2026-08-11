import { Map } from '../map/map.model'
import { Place } from '../place/place.model'
import { Offer } from '../offer/offer.model'
import { User } from '../user/user.model'
import { Business } from '../business/business.model'
import { Payment } from '../payment/payment.model'
import mongoose from 'mongoose'
import {
  IDashboardData,
  IRecentActivity,
  IReportsData,
  ISalesAndTaxesMonthly,
  IUsageItem,
} from './stats.interface'

const getDashboardData = async (): Promise<IDashboardData> => {
  // Run all DB queries in parallel
  const [
    totalMaps,
    totalPlaces,
    activeOffers,
    recentMaps,
    recentPlaces,
    recentOffers,
    recentUsers,
  ] = await Promise.all([
    Map.countDocuments(),
    Place.countDocuments(),
    Offer.countDocuments({ status: 'ACTIVE' }),
    Map.find().sort({ createdAt: -1 }).limit(3).select('name createdAt').lean(),
    Place.find().sort({ updatedAt: -1 }).limit(3).select('name updatedAt').lean(),
    Offer.find().sort({ createdAt: -1 }).limit(3).select('title createdAt').lean(),
    User.find().sort({ updatedAt: -1 }).limit(3).select('name role updatedAt').lean(),
  ])

  // Mocking revenue and sales for now
  const totalSales = 12450
  const thisMonthRevenue = 3280
  const taxesCollected = 820

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

const getDateRangeQuery = (timeFilter?: string) => {
  const now = new Date()
  let startDate: Date | null = null
  let endDate: Date | null = null

  if (timeFilter === 'today') {
    startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
  } else if (timeFilter === 'this_week') {
    startDate = new Date()
    const day = startDate.getDay()
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // Monday
    startDate.setDate(diff)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
  } else if (timeFilter === 'this_month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
  } else if (timeFilter === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  }

  if (startDate && endDate) {
    return { $gte: startDate, $lte: endDate }
  }
  return null
}

const getReportsData = async (query: Record<string, any> = {}): Promise<IReportsData> => {
  // Construct filters for Usage lists
  const mapFilter: Record<string, any> = {}
  const placeFilter: Record<string, any> = {}
  const offerFilter: Record<string, any> = {}

  // A. Time Filter (Date Range)
  if (query.timeFilter) {
    const dateRange = getDateRangeQuery(query.timeFilter)
    if (dateRange) {
      mapFilter.updatedAt = dateRange
      placeFilter.updatedAt = dateRange
      offerFilter.updatedAt = dateRange
    }
  }

  // B. Search Term (search places/maps by name, offers by title)
  if (query.searchTerm) {
    const searchRegex = { $regex: query.searchTerm, $options: 'i' }
    placeFilter.name = searchRegex
    mapFilter.name = searchRegex
    offerFilter.title = searchRegex
  }

  // C. Country Filter
  if (query.country) {
    placeFilter.country = query.country
    mapFilter.country = query.country

    // Find offers tied to places/businesses in this country
    const [placesInCountry, businessesInCountry] = await Promise.all([
      Place.find({ country: query.country }, '_id'),
      Business.find({ 'location.country': query.country }, '_id')
    ])
    offerFilter.$or = [
      { place: { $in: placesInCountry.map(p => p._id) } },
      { business: { $in: businessesInCountry.map(b => b._id) } }
    ]
  }

  // D. Category Filter
  if (query.category) {
    placeFilter.category = query.category

    // Find maps that contain at least one place in this category
    const placesInCat = await Place.find({ category: query.category }, 'map')
    const mapIds = Array.from(new Set(placesInCat.map(p => p.map?.toString()).filter(Boolean)))
    mapFilter._id = { $in: mapIds }

    // Find offers tied to places/businesses in this category
    const [placesInCatForOffer, businessesInCatForOffer] = await Promise.all([
      Place.find({ category: query.category }, '_id'),
      Business.find({ category: query.category }, '_id')
    ])
    offerFilter.$or = [
      { place: { $in: placesInCatForOffer.map(p => p._id) } },
      { business: { $in: businessesInCatForOffer.map(b => b._id) } }
    ]
  }

  // ==================== SALES & TAXES CALCULATION ====================
  // Check if we have real payment transactions
  const realPaymentsCount = await Payment.countDocuments({ status: 'succeeded' })
  let payments: any[] = []

  if (realPaymentsCount > 0) {
    // Construct real database payment filter
    const paymentFilter: Record<string, any> = { status: 'succeeded' }

    if (query.timeFilter) {
      const dateRange = getDateRangeQuery(query.timeFilter)
      if (dateRange) paymentFilter.createdAt = dateRange
    }

    if (query.country) {
      const mapsInCountry = await Map.find({ country: query.country }, '_id')
      paymentFilter.mapId = { $in: mapsInCountry.map(m => m._id) }
    }

    if (query.category) {
      const placesInCat = await Place.find({ category: query.category }, 'map')
      const mapIds = Array.from(new Set(placesInCat.map(p => p.map?.toString()).filter(Boolean)))
      paymentFilter.mapId = { $in: mapIds }
    }

    if (query.searchTerm) {
      const mapsMatchingSearch = await Map.find({ name: { $regex: query.searchTerm, $options: 'i' } }, '_id')
      paymentFilter.mapId = { $in: mapsMatchingSearch.map(m => m._id) }
    }

    payments = await Payment.find(paymentFilter).lean()
  } else {
    // GENERATE DYNAMIC MOCK TRANSATIONS based on existing maps to support dev environment filters
    const allMaps = await Map.find({}, 'name country createdAt').lean()
    const mockPayments: any[] = []
    const now = new Date()

    if (allMaps.length > 0) {
      allMaps.forEach((map, index) => {
        // Generate 5 payments for each map spread over the last 6 months
        for (let i = 0; i < 5; i++) {
          const pDate = new Date(now.getFullYear(), now.getMonth() - i, 10 + (index * 3) % 15)
          mockPayments.push({
            mapId: map._id.toString(),
            amount: 25 + (index * 12) + (i * 6),
            status: 'succeeded',
            createdAt: pDate,
            updatedAt: pDate
          })
        }
      })
    } else {
      // Fallback if there are 0 maps in the DB as well
      for (let i = 0; i < 30; i++) {
        const pDate = new Date(now.getFullYear(), now.getMonth() - (i % 6), 15)
        mockPayments.push({
          amount: 60 + (i * 15),
          status: 'succeeded',
          createdAt: pDate,
          updatedAt: pDate
        })
      }
    }

    // Filter the mock payments in-memory matching selected filters
    payments = mockPayments.filter(p => {
      // 1. Time Filter
      if (query.timeFilter) {
        const dateRange = getDateRangeQuery(query.timeFilter)
        if (dateRange) {
          const time = p.createdAt.getTime()
          if (time < dateRange.$gte.getTime() || (dateRange.$lte && time > dateRange.$lte.getTime())) {
            return false
          }
        }
      }

      // 2. Country Filter
      if (query.country && p.mapId) {
        const map = allMaps.find(m => m._id.toString() === p.mapId)
        if (!map || map.country !== query.country) return false
      }

      // 3. Category Filter
      if (query.category && p.mapId) {
        // Since it's mock, we map the map filter directly from mapFilter._id
        if (mapFilter._id && mapFilter._id.$in) {
          const allowedMapIds = mapFilter._id.$in.map((id: any) => id.toString())
          if (!allowedMapIds.includes(p.mapId)) return false
        }
      }

      // 4. Search Term
      if (query.searchTerm && p.mapId) {
        const map = allMaps.find(m => m._id.toString() === p.mapId)
        if (!map || !map.name.toLowerCase().includes(query.searchTerm.toLowerCase())) return false
      }

      return true
    })
  }

  // Calculate sales and taxes
  let totalSales = 0
  payments.forEach(p => {
    totalSales += p.amount || 0
  })
  const taxesCollected = Math.round(totalSales * 0.10 * 100) / 100
  const netRevenue = Math.round((totalSales - taxesCollected) * 100) / 100

  // ------------------ monthly data chart grouping ------------------
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyMap: Record<string, { totalSales: number; taxes: number; netRevenue: number }> = {}

  // Initialize last 6 months
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = monthNames[d.getMonth()]
    monthlyMap[label] = { totalSales: 0, taxes: 0, netRevenue: 0 }
  }

  payments.forEach(p => {
    const date = new Date(p.createdAt)
    const label = monthNames[date.getMonth()]
    if (monthlyMap[label] !== undefined) {
      monthlyMap[label].totalSales += p.amount || 0
    }
  })

  const monthlyData = Object.keys(monthlyMap).map(month => {
    const data = monthlyMap[month]
    const taxes = Math.round(data.totalSales * 0.10 * 100) / 100
    const netRevenue = Math.round((data.totalSales - taxes) * 100) / 100
    return {
      month,
      totalSales: data.totalSales,
      taxes,
      netRevenue
    }
  })

  // 2. Usage Stats (Top 5 for each)
  const mostViewedMapsRaw = await Map.find(mapFilter)
    .sort({ viewCount: -1 })
    .limit(5)
    .select('name viewCount')
  const mostViewedMaps: IUsageItem[] = mostViewedMapsRaw.map(m => ({
    name: m.name,
    count: (m as any).viewCount || 0,
  }))

  const mostOpenedPlacesRaw = await Place.find(placeFilter)
    .sort({ openCount: -1 })
    .limit(5)
    .select('name openCount')
  const mostOpenedPlaces: IUsageItem[] = mostOpenedPlacesRaw.map(p => ({
    name: p.name,
    count: (p as any).openCount || 0,
  }))

  const mostRedeemedOffersRaw = await Offer.find(offerFilter)
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
