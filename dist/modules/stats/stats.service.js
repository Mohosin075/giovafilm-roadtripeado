"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const map_model_1 = require("../map/map.model");
const place_model_1 = require("../place/place.model");
const offer_model_1 = require("../offer/offer.model");
const offerRedemption_model_1 = require("../offer/offerRedemption.model");
const user_model_1 = require("../user/user.model");
const business_model_1 = require("../business/business.model");
const payment_model_1 = require("../payment/payment.model");
const mongoose_1 = __importDefault(require("mongoose"));
const getDashboardData = async () => {
    // Run all DB queries in parallel
    const [totalMaps, totalPlaces, activeOffers, recentMaps, recentPlaces, recentOffers, recentUsers,] = await Promise.all([
        map_model_1.Map.countDocuments(),
        place_model_1.Place.countDocuments(),
        offer_model_1.Offer.countDocuments({ status: 'ACTIVE' }),
        map_model_1.Map.find().sort({ createdAt: -1 }).limit(3).select('name createdAt').lean(),
        place_model_1.Place.find().sort({ updatedAt: -1 }).limit(3).select('name updatedAt').lean(),
        offer_model_1.Offer.find().sort({ createdAt: -1 }).limit(3).select('title createdAt').lean(),
        user_model_1.User.find().sort({ updatedAt: -1 }).limit(3).select('name role updatedAt').lean(),
    ]);
    // Mocking revenue and sales for now
    const totalSales = 12450;
    const thisMonthRevenue = 3280;
    const taxesCollected = 820;
    const recentActivity = [];
    recentPlaces.forEach((place) => {
        recentActivity.push({
            id: place._id.toString(),
            type: 'place',
            message: `Place updated: ${place.name}`,
            timestamp: place.updatedAt,
        });
    });
    recentOffers.forEach((offer) => {
        recentActivity.push({
            id: offer._id.toString(),
            type: 'offer',
            message: `Offer published: ${offer.title}`,
            timestamp: offer.createdAt,
        });
    });
    recentMaps.forEach((map) => {
        recentActivity.push({
            id: map._id.toString(),
            type: 'map',
            message: `Map created: ${map.name}`,
            timestamp: map.createdAt,
        });
    });
    recentUsers.forEach((user) => {
        recentActivity.push({
            id: user._id.toString(),
            type: 'user',
            message: `User role changed: ${user.name || 'Unknown User'} to ${user.role}`,
            timestamp: user.updatedAt,
        });
    });
    // Sort by timestamp descending and take top 6
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
    };
};
const getDateRangeQuery = (timeFilter) => {
    const now = new Date();
    let startDate = null;
    let endDate = null;
    if (timeFilter === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    else if (timeFilter === 'this_week') {
        startDate = new Date();
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    else if (timeFilter === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    else if (timeFilter === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }
    if (startDate && endDate) {
        return { $gte: startDate, $lte: endDate };
    }
    return null;
};
const isObjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const searchReportEntities = async (searchTerm) => {
    const q = searchTerm === null || searchTerm === void 0 ? void 0 : searchTerm.trim();
    if (!q || q.length < 2)
        return [];
    const searchRegex = { $regex: escapeRegex(q), $options: 'i' };
    const [matchedPlaces, matchedBusinesses, matchedMaps, matchedOffers] = await Promise.all([
        place_model_1.Place.find({ name: searchRegex })
            .select('name country address')
            .limit(6)
            .lean(),
        business_model_1.Business.find({ name: searchRegex })
            .select('name location.country location.city location.address')
            .limit(6)
            .lean(),
        map_model_1.Map.find({ name: searchRegex }).select('name country').limit(5).lean(),
        offer_model_1.Offer.find({ title: searchRegex }).select('title').limit(5).lean(),
    ]);
    return [
        ...matchedPlaces.map((p) => ({
            type: 'place',
            id: String(p._id),
            name: p.name,
            location: [p.address, p.country].filter(Boolean).join(', '),
        })),
        ...matchedBusinesses.map((b) => {
            var _a, _b, _c;
            return ({
                type: 'business',
                id: String(b._id),
                name: b.name,
                location: [((_a = b.location) === null || _a === void 0 ? void 0 : _a.address) || ((_b = b.location) === null || _b === void 0 ? void 0 : _b.city), (_c = b.location) === null || _c === void 0 ? void 0 : _c.country]
                    .filter(Boolean)
                    .join(', '),
            });
        }),
        ...matchedMaps.map((m) => ({
            type: 'map',
            id: String(m._id),
            name: m.name,
            location: m.country || '',
        })),
        ...matchedOffers.map((o) => ({
            type: 'offer',
            id: String(o._id),
            name: o.title,
        })),
    ];
};
const applySelectedEntity = async (query, mapFilter, placeFilter, offerFilter) => {
    const entityType = String(query.entityType || '');
    const entityId = String(query.entityId || '');
    if (!isObjectId(entityId))
        return { mapIds: [] };
    const oid = new mongoose_1.default.Types.ObjectId(entityId);
    if (entityType === 'place') {
        const place = await place_model_1.Place.findById(oid).select('map').lean();
        placeFilter._id = oid;
        offerFilter.place = oid;
        if (place === null || place === void 0 ? void 0 : place.map) {
            mapFilter._id = place.map;
            return { mapIds: [String(place.map)] };
        }
        mapFilter._id = { $in: [] };
        return { mapIds: [] };
    }
    if (entityType === 'business') {
        offerFilter.business = oid;
        placeFilter._id = { $in: [] };
        mapFilter._id = { $in: [] };
        const business = await business_model_1.Business.findById(oid).select('name viewCount').lean();
        return {
            mapIds: [],
            usagePlace: business
                ? { name: business.name, count: business.viewCount || 0 }
                : undefined,
        };
    }
    if (entityType === 'map') {
        mapFilter._id = oid;
        placeFilter.map = oid;
        const placesOnMap = await place_model_1.Place.find({ map: oid }, '_id').lean();
        offerFilter.$or = [{ place: { $in: placesOnMap.map(p => p._id) } }];
        return { mapIds: [entityId] };
    }
    if (entityType === 'offer') {
        offerFilter._id = oid;
        const offer = await offer_model_1.Offer.findById(oid).select('place business').lean();
        if (offer === null || offer === void 0 ? void 0 : offer.place) {
            placeFilter._id = offer.place;
            const place = await place_model_1.Place.findById(offer.place).select('map').lean();
            if (place === null || place === void 0 ? void 0 : place.map) {
                mapFilter._id = place.map;
                return { mapIds: [String(place.map)] };
            }
        }
        else if (offer === null || offer === void 0 ? void 0 : offer.business) {
            placeFilter._id = { $in: [] };
            mapFilter._id = { $in: [] };
            const business = await business_model_1.Business.findById(offer.business)
                .select('name viewCount')
                .lean();
            return {
                mapIds: [],
                usagePlace: business
                    ? { name: business.name, count: business.viewCount || 0 }
                    : undefined,
            };
        }
        else {
            placeFilter._id = { $in: [] };
            mapFilter._id = { $in: [] };
        }
        return { mapIds: [] };
    }
    return { mapIds: [] };
};
const getReportsData = async (query = {}) => {
    // Construct filters for Usage lists
    const mapFilter = {};
    const placeFilter = {};
    const offerFilter = {};
    // Time filter applies to sales (payment.createdAt) and offer redemptions.
    // Map/place visit totals are lifetime counters — do not filter by updatedAt.
    const dateRange = query.timeFilter ? getDateRangeQuery(query.timeFilter) : null;
    const hasEntity = isObjectId(String(query.entityId || '')) && !!query.entityType;
    // C. Country Filter
    if (query.country) {
        placeFilter.country = query.country;
        mapFilter.country = query.country;
        if (!hasEntity) {
            const [placesInCountry, businessesInCountry] = await Promise.all([
                place_model_1.Place.find({ country: query.country }, '_id'),
                business_model_1.Business.find({ 'location.country': query.country }, '_id'),
            ]);
            offerFilter.$or = [
                { place: { $in: placesInCountry.map(p => p._id) } },
                { business: { $in: businessesInCountry.map(b => b._id) } },
            ];
        }
    }
    // D. Category Filter
    if (query.category) {
        placeFilter.category = query.category;
        if (!hasEntity) {
            const placesInCat = await place_model_1.Place.find({ category: query.category }, 'map');
            const mapIds = Array.from(new Set(placesInCat.map(p => { var _a; return (_a = p.map) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)));
            mapFilter._id = { $in: mapIds };
            const [placesInCatForOffer, businessesInCatForOffer] = await Promise.all([
                place_model_1.Place.find({ category: query.category }, '_id'),
                business_model_1.Business.find({ category: query.category }, '_id'),
            ]);
            offerFilter.$or = [
                { place: { $in: placesInCatForOffer.map(p => p._id) } },
                { business: { $in: businessesInCatForOffer.map(b => b._id) } },
            ];
        }
    }
    // B. Selected place / business / map / offer (applied last so it is not overwritten)
    const { mapIds: entityMapIds, usagePlace } = await applySelectedEntity(query, mapFilter, placeFilter, offerFilter);
    // ==================== SALES & TAXES CALCULATION ====================
    // Check if we have real payment transactions
    const realPaymentsCount = await payment_model_1.Payment.countDocuments({ status: 'succeeded' });
    let payments = [];
    if (realPaymentsCount > 0) {
        // Construct real database payment filter
        const paymentFilter = { status: 'succeeded' };
        if (dateRange) {
            paymentFilter.createdAt = dateRange;
        }
        if (query.country) {
            const mapsInCountry = await map_model_1.Map.find({ country: query.country }, '_id');
            paymentFilter.mapId = { $in: mapsInCountry.map(m => m._id) };
        }
        if (query.category) {
            const placesInCat = await place_model_1.Place.find({ category: query.category }, 'map');
            const mapIds = Array.from(new Set(placesInCat.map(p => { var _a; return (_a = p.map) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)));
            paymentFilter.mapId = { $in: mapIds };
        }
        if (query.entityType && query.entityId) {
            paymentFilter.mapId = { $in: entityMapIds };
        }
        payments = await payment_model_1.Payment.find(paymentFilter).lean();
    }
    else {
        // GENERATE DYNAMIC MOCK TRANSATIONS based on existing maps to support dev environment filters
        const allMaps = await map_model_1.Map.find({}, 'name country createdAt').lean();
        const mockPayments = [];
        const now = new Date();
        if (allMaps.length > 0) {
            allMaps.forEach((map, index) => {
                // Generate 5 payments for each map spread over the last 6 months
                for (let i = 0; i < 5; i++) {
                    const pDate = new Date(now.getFullYear(), now.getMonth() - i, 10 + (index * 3) % 15);
                    mockPayments.push({
                        mapId: map._id.toString(),
                        amount: 25 + (index * 12) + (i * 6),
                        status: 'succeeded',
                        createdAt: pDate,
                        updatedAt: pDate
                    });
                }
            });
        }
        else {
            // Fallback if there are 0 maps in the DB as well
            for (let i = 0; i < 30; i++) {
                const pDate = new Date(now.getFullYear(), now.getMonth() - (i % 6), 15);
                mockPayments.push({
                    amount: 60 + (i * 15),
                    status: 'succeeded',
                    createdAt: pDate,
                    updatedAt: pDate
                });
            }
        }
        // Filter the mock payments in-memory matching selected filters
        payments = mockPayments.filter(p => {
            // 1. Time Filter
            if (dateRange) {
                const time = p.createdAt.getTime();
                if (time < dateRange.$gte.getTime() || (dateRange.$lte && time > dateRange.$lte.getTime())) {
                    return false;
                }
            }
            // 2. Country Filter
            if (query.country && p.mapId) {
                const map = allMaps.find(m => m._id.toString() === p.mapId);
                if (!map || map.country !== query.country)
                    return false;
            }
            // 3. Category Filter
            if (query.category && p.mapId) {
                // Since it's mock, we map the map filter directly from mapFilter._id
                if (mapFilter._id && mapFilter._id.$in) {
                    const allowedMapIds = mapFilter._id.$in.map((id) => id.toString());
                    if (!allowedMapIds.includes(p.mapId))
                        return false;
                }
            }
            // 4. Selected entity (map-linked sales only)
            if (query.entityType && query.entityId) {
                if (!p.mapId || !entityMapIds.includes(String(p.mapId)))
                    return false;
            }
            return true;
        });
    }
    // Calculate sales and taxes
    let totalSales = 0;
    payments.forEach(p => {
        totalSales += p.amount || 0;
    });
    const taxesCollected = Math.round(totalSales * 0.10 * 100) / 100;
    const netRevenue = Math.round((totalSales - taxesCollected) * 100) / 100;
    // ------------------ monthly data chart grouping ------------------
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = monthNames[d.getMonth()];
        monthlyMap[label] = { totalSales: 0, taxes: 0, netRevenue: 0 };
    }
    payments.forEach(p => {
        const date = new Date(p.createdAt);
        const label = monthNames[date.getMonth()];
        if (monthlyMap[label] !== undefined) {
            monthlyMap[label].totalSales += p.amount || 0;
        }
    });
    const monthlyData = Object.keys(monthlyMap).map(month => {
        const data = monthlyMap[month];
        const taxes = Math.round(data.totalSales * 0.10 * 100) / 100;
        const netRevenue = Math.round((data.totalSales - taxes) * 100) / 100;
        return {
            month,
            totalSales: data.totalSales,
            taxes,
            netRevenue
        };
    });
    // 2. Usage Stats (Top 5 for each)
    const mostViewedMapsRaw = await map_model_1.Map.find(mapFilter)
        .sort({ viewCount: -1 })
        .limit(5)
        .select('name viewCount');
    const mostViewedMaps = mostViewedMapsRaw.map(m => ({
        name: m.name,
        count: m.viewCount || 0,
    }));
    const mostOpenedPlacesRaw = await place_model_1.Place.find(placeFilter)
        .sort({ openCount: -1 })
        .limit(5)
        .select('name openCount');
    let mostOpenedPlaces = mostOpenedPlacesRaw.map(p => ({
        name: p.name,
        count: p.openCount || 0,
    }));
    if (usagePlace) {
        mostOpenedPlaces = [usagePlace];
    }
    let mostRedeemedOffers = [];
    if (dateRange) {
        const scopedOffers = await offer_model_1.Offer.find(offerFilter).select('_id title').lean();
        const scopedIds = scopedOffers.map(o => o._id);
        const redemptionMatch = { redemptionTime: dateRange };
        if (Object.keys(offerFilter).length > 0) {
            redemptionMatch.offer = { $in: scopedIds };
        }
        const redemptionAgg = await offerRedemption_model_1.OfferRedemption.aggregate([
            { $match: redemptionMatch },
            { $group: { _id: '$offer', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);
        const titleById = new globalThis.Map(scopedOffers.map((o) => [String(o._id), o.title]));
        const missingIds = redemptionAgg
            .map((r) => r._id)
            .filter((id) => !titleById.has(String(id)));
        if (missingIds.length) {
            const extra = await offer_model_1.Offer.find({ _id: { $in: missingIds } })
                .select('_id title')
                .lean();
            extra.forEach((o) => titleById.set(String(o._id), o.title));
        }
        mostRedeemedOffers = redemptionAgg.map((r) => ({
            name: titleById.get(String(r._id)) || 'Unknown offer',
            count: r.count || 0,
        }));
    }
    else {
        const mostRedeemedOffersRaw = await offer_model_1.Offer.find(offerFilter)
            .sort({ redemptionsCount: -1 })
            .limit(5)
            .select('title redemptionsCount');
        mostRedeemedOffers = mostRedeemedOffersRaw.map(o => ({
            name: o.title,
            count: o.redemptionsCount || 0,
        }));
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
    };
};
exports.StatsService = {
    getDashboardData,
    getReportsData,
    searchReportEntities,
};
