import { Map } from '../map/map.model'
import { Place } from '../place/place.model'
import { Offer } from '../offer/offer.model'
import { OfferRedemption } from '../offer/offerRedemption.model'
import { User } from '../user/user.model'
import { Business } from '../business/business.model'
import { Payment } from '../payment/payment.model'
import { UsageView } from './usageView.model'
import mongoose from 'mongoose'
import {
  IDashboardData,
  IRecentActivity,
  IReportsData,
  ISalesAndTaxesMonthly,
  ISearchMatchItem,
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

const isObjectId = (id?: string) =>
  typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const searchReportEntities = async (
  searchTerm?: string,
): Promise<ISearchMatchItem[]> => {
  const q = searchTerm?.trim()
  if (!q || q.length < 2) return []

  const searchRegex = { $regex: escapeRegex(q), $options: 'i' }
  const [matchedPlaces, matchedBusinesses, matchedMaps, matchedOffers] =
    await Promise.all([
      Place.find({ name: searchRegex })
        .select('name country address')
        .limit(6)
        .lean(),
      Business.find({ name: searchRegex })
        .select('name location.country location.city location.address')
        .limit(6)
        .lean(),
      Map.find({ name: searchRegex }).select('name country').limit(5).lean(),
      Offer.find({ title: searchRegex }).select('title').limit(5).lean(),
    ])

  return [
    ...matchedPlaces.map((p: any) => ({
      type: 'place' as const,
      id: String(p._id),
      name: p.name,
      location: [p.address, p.country].filter(Boolean).join(', '),
    })),
    ...matchedBusinesses.map((b: any) => ({
      type: 'business' as const,
      id: String(b._id),
      name: b.name,
      location: [b.location?.address || b.location?.city, b.location?.country]
        .filter(Boolean)
        .join(', '),
    })),
    ...matchedMaps.map((m: any) => ({
      type: 'map' as const,
      id: String(m._id),
      name: m.name,
      location: m.country || '',
    })),
    ...matchedOffers.map((o: any) => ({
      type: 'offer' as const,
      id: String(o._id),
      name: o.title,
    })),
  ]
}

type EntityFilterResult = {
  mapIds: string[]
  usagePlace?: IUsageItem
}

const applySelectedEntity = async (
  query: Record<string, any>,
  mapFilter: Record<string, any>,
  placeFilter: Record<string, any>,
  offerFilter: Record<string, any>,
): Promise<EntityFilterResult> => {
  const entityType = String(query.entityType || '')
  const entityId = String(query.entityId || '')
  if (!isObjectId(entityId)) return { mapIds: [] }

  const oid = new mongoose.Types.ObjectId(entityId)

  if (entityType === 'place') {
    const place = await Place.findById(oid).select('map').lean()
    placeFilter._id = oid
    offerFilter.place = oid
    if (place?.map) {
      mapFilter._id = place.map
      return { mapIds: [String(place.map)] }
    }
    mapFilter._id = { $in: [] }
    return { mapIds: [] }
  }

  if (entityType === 'business') {
    offerFilter.business = oid
    placeFilter._id = { $in: [] }
    mapFilter._id = { $in: [] }
    const business = await Business.findById(oid).select('name viewCount').lean()
    return {
      mapIds: [],
      usagePlace: business
        ? { name: business.name, count: (business as any).viewCount || 0 }
        : undefined,
    }
  }

  if (entityType === 'map') {
    mapFilter._id = oid
    placeFilter.map = oid
    const placesOnMap = await Place.find({ map: oid }, '_id').lean()
    offerFilter.$or = [{ place: { $in: placesOnMap.map(p => p._id) } }]
    return { mapIds: [entityId] }
  }

  if (entityType === 'offer') {
    offerFilter._id = oid
    const offer = await Offer.findById(oid).select('place business').lean()
    if (offer?.place) {
      placeFilter._id = offer.place
      const place = await Place.findById(offer.place).select('map').lean()
      if (place?.map) {
        mapFilter._id = place.map
        return { mapIds: [String(place.map)] }
      }
    } else if (offer?.business) {
      placeFilter._id = { $in: [] }
      mapFilter._id = { $in: [] }
      const business = await Business.findById(offer.business)
        .select('name viewCount')
        .lean()
      return {
        mapIds: [],
        usagePlace: business
          ? { name: business.name, count: (business as any).viewCount || 0 }
          : undefined,
      }
    } else {
      placeFilter._id = { $in: [] }
      mapFilter._id = { $in: [] }
    }
    return { mapIds: [] }
  }

  return { mapIds: [] }
}

const getReportsData = async (query: Record<string, any> = {}): Promise<IReportsData> => {
  // Construct filters for Usage lists
  const mapFilter: Record<string, any> = {}
  const placeFilter: Record<string, any> = {}
  const offerFilter: Record<string, any> = {}
  // Time filter applies to sales (payment.createdAt) and offer redemptions.
  // Map/place visit totals are lifetime counters — do not filter by updatedAt.
  const dateRange = query.timeFilter ? getDateRangeQuery(query.timeFilter) : null

  const hasEntity = isObjectId(String(query.entityId || '')) && !!query.entityType

  // C. Country Filter
  if (query.country) {
    placeFilter.country = query.country
    mapFilter.country = query.country

    if (!hasEntity) {
      const [placesInCountry, businessesInCountry] = await Promise.all([
        Place.find({ country: query.country }, '_id'),
        Business.find({ 'location.country': query.country }, '_id'),
      ])
      offerFilter.$or = [
        { place: { $in: placesInCountry.map(p => p._id) } },
        { business: { $in: businessesInCountry.map(b => b._id) } },
      ]
    }
  }

  // D. Category Filter
  if (query.category) {
    placeFilter.category = query.category

    if (!hasEntity) {
      const placesInCat = await Place.find({ category: query.category }, 'map')
      const mapIds = Array.from(
        new Set(placesInCat.map(p => p.map?.toString()).filter(Boolean)),
      )
      mapFilter._id = { $in: mapIds }

      const [placesInCatForOffer, businessesInCatForOffer] = await Promise.all([
        Place.find({ category: query.category }, '_id'),
        Business.find({ category: query.category }, '_id'),
      ])
      offerFilter.$or = [
        { place: { $in: placesInCatForOffer.map(p => p._id) } },
        { business: { $in: businessesInCatForOffer.map(b => b._id) } },
      ]
    }
  }

  // B. Selected place / business / map / offer (applied last so it is not overwritten)
  const { mapIds: entityMapIds, usagePlace } = await applySelectedEntity(
    query,
    mapFilter,
    placeFilter,
    offerFilter,
  )

  // ==================== SALES & TAXES CALCULATION ====================
  // Check if we have real payment transactions
  const realPaymentsCount = await Payment.countDocuments({ status: 'succeeded' })
  let payments: any[] = []

  if (realPaymentsCount > 0) {
    // Construct real database payment filter
    const paymentFilter: Record<string, any> = { status: 'succeeded' }

    if (dateRange) {
      paymentFilter.createdAt = dateRange
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

    if (query.entityType && query.entityId) {
      paymentFilter.mapId = { $in: entityMapIds }
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
      if (dateRange) {
        const time = p.createdAt.getTime()
        if (time < dateRange.$gte.getTime() || (dateRange.$lte && time > dateRange.$lte.getTime())) {
          return false
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

      // 4. Selected entity (map-linked sales only)
      if (query.entityType && query.entityId) {
        if (!p.mapId || !entityMapIds.includes(String(p.mapId))) return false
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
  let mostViewedMaps: IUsageItem[] = []
  const allowedMapDocs = await Map.find(mapFilter).select('_id').lean()
  const allowedMapIds = allowedMapDocs.map(m => m._id.toString())

  if (dateRange) {
    const mapAgg = await UsageView.aggregate([
      {
        $match: {
          type: 'map',
          entityId: { $in: allowedMapIds },
          lastSeenAt: dateRange,
        },
      },
      { $group: { _id: '$entityId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    const mapIds = mapAgg.map(r => new mongoose.Types.ObjectId(r._id))
    const maps = await Map.find({ _id: { $in: mapIds } }).select('name').lean()
    const nameMap = new globalThis.Map<string, string>(maps.map(m => [m._id.toString(), m.name]))
    mostViewedMaps = mapAgg.map(r => ({
      name: nameMap.get(String(r._id)) || 'Unknown Map',
      count: r.count || 0,
    }))
  } else {
    const mostViewedMapsRaw = await Map.find(mapFilter)
      .sort({ viewCount: -1 })
      .limit(5)
      .select('name viewCount')
    mostViewedMaps = mostViewedMapsRaw.map(m => ({
      name: m.name,
      count: (m as any).viewCount || 0,
    }))
  }

  let mostOpenedPlaces: IUsageItem[] = []
  const allowedPlaceDocs = await Place.find(placeFilter).select('_id').lean()
  const allowedPlaceIds = allowedPlaceDocs.map(p => p._id.toString())

  if (dateRange) {
    const placeAgg = await UsageView.aggregate([
      {
        $match: {
          type: 'place',
          entityId: { $in: allowedPlaceIds },
          lastSeenAt: dateRange,
        },
      },
      { $group: { _id: '$entityId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    const placeIds = placeAgg.map(r => new mongoose.Types.ObjectId(r._id))
    const places = await Place.find({ _id: { $in: placeIds } }).select('name').lean()
    const nameMap = new globalThis.Map<string, string>(places.map(p => [p._id.toString(), p.name]))
    mostOpenedPlaces = placeAgg.map(r => ({
      name: nameMap.get(String(r._id)) || 'Unknown Place',
      count: r.count || 0,
    }))
  } else {
    const mostOpenedPlacesRaw = await Place.find(placeFilter)
      .sort({ openCount: -1 })
      .limit(5)
      .select('name openCount')
    mostOpenedPlaces = mostOpenedPlacesRaw.map(p => ({
      name: p.name,
      count: (p as any).openCount || 0,
    }))
  }
  if (usagePlace) {
    mostOpenedPlaces = [usagePlace]
  }

  let mostRedeemedOffers: IUsageItem[] = []
  if (dateRange) {
    const scopedOffers = await Offer.find(offerFilter).select('_id title').lean()
    const scopedIds = scopedOffers.map(o => o._id)
    const redemptionMatch: Record<string, any> = { redemptionTime: dateRange }
    if (Object.keys(offerFilter).length > 0) {
      redemptionMatch.offer = { $in: scopedIds }
    }
    const redemptionAgg = await OfferRedemption.aggregate([
      { $match: redemptionMatch },
      { $group: { _id: '$offer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    const titleById = new globalThis.Map<string, string>(
      scopedOffers.map((o: any) => [String(o._id), o.title]),
    )
    const missingIds = redemptionAgg
      .map((r: any) => r._id)
      .filter((id: any) => !titleById.has(String(id)))
    if (missingIds.length) {
      const extra = await Offer.find({ _id: { $in: missingIds } })
        .select('_id title')
        .lean()
      extra.forEach((o: any) => titleById.set(String(o._id), o.title))
    }
    mostRedeemedOffers = redemptionAgg.map((r: any) => ({
      name: titleById.get(String(r._id)) || 'Unknown offer',
      count: r.count || 0,
    }))
  } else {
    const mostRedeemedOffersRaw = await Offer.find(offerFilter)
      .sort({ redemptionsCount: -1 })
      .limit(5)
      .select('title redemptionsCount')
    mostRedeemedOffers = mostRedeemedOffersRaw.map(o => ({
      name: o.title,
      count: o.redemptionsCount || 0,
    }))
  }

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
  searchReportEntities,
}
