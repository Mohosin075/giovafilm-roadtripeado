"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const map_model_1 = require("../map/map.model");
const place_model_1 = require("../place/place.model");
const offer_model_1 = require("../offer/offer.model");
const user_model_1 = require("../user/user.model");
const business_model_1 = require("../business/business.model");
const payment_model_1 = require("../payment/payment.model");
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
const getReportsData = async (query = {}) => {
    // Construct filters for Usage lists
    const mapFilter = {};
    const placeFilter = {};
    const offerFilter = {};
    // A. Time Filter (Date Range)
    if (query.timeFilter) {
        const dateRange = getDateRangeQuery(query.timeFilter);
        if (dateRange) {
            mapFilter.updatedAt = dateRange;
            placeFilter.updatedAt = dateRange;
            offerFilter.updatedAt = dateRange;
        }
    }
    // B. Search Term (search places/maps by name, offers by title)
    if (query.searchTerm) {
        const searchRegex = { $regex: query.searchTerm, $options: 'i' };
        placeFilter.name = searchRegex;
        mapFilter.name = searchRegex;
        offerFilter.title = searchRegex;
    }
    // C. Country Filter
    if (query.country) {
        placeFilter.country = query.country;
        mapFilter.country = query.country;
        // Find offers tied to places/businesses in this country
        const [placesInCountry, businessesInCountry] = await Promise.all([
            place_model_1.Place.find({ country: query.country }, '_id'),
            business_model_1.Business.find({ 'location.country': query.country }, '_id')
        ]);
        offerFilter.$or = [
            { place: { $in: placesInCountry.map(p => p._id) } },
            { business: { $in: businessesInCountry.map(b => b._id) } }
        ];
    }
    // D. Category Filter
    if (query.category) {
        placeFilter.category = query.category;
        // Find maps that contain at least one place in this category
        const placesInCat = await place_model_1.Place.find({ category: query.category }, 'map');
        const mapIds = Array.from(new Set(placesInCat.map(p => { var _a; return (_a = p.map) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)));
        mapFilter._id = { $in: mapIds };
        // Find offers tied to places/businesses in this category
        const [placesInCatForOffer, businessesInCatForOffer] = await Promise.all([
            place_model_1.Place.find({ category: query.category }, '_id'),
            business_model_1.Business.find({ category: query.category }, '_id')
        ]);
        offerFilter.$or = [
            { place: { $in: placesInCatForOffer.map(p => p._id) } },
            { business: { $in: businessesInCatForOffer.map(b => b._id) } }
        ];
    }
    // ==================== SALES & TAXES CALCULATION ====================
    // Check if we have real payment transactions
    const realPaymentsCount = await payment_model_1.Payment.countDocuments({ status: 'succeeded' });
    let payments = [];
    if (realPaymentsCount > 0) {
        // Construct real database payment filter
        const paymentFilter = { status: 'succeeded' };
        if (query.timeFilter) {
            const dateRange = getDateRangeQuery(query.timeFilter);
            if (dateRange)
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
        if (query.searchTerm) {
            const mapsMatchingSearch = await map_model_1.Map.find({ name: { $regex: query.searchTerm, $options: 'i' } }, '_id');
            paymentFilter.mapId = { $in: mapsMatchingSearch.map(m => m._id) };
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
            if (query.timeFilter) {
                const dateRange = getDateRangeQuery(query.timeFilter);
                if (dateRange) {
                    const time = p.createdAt.getTime();
                    if (time < dateRange.$gte.getTime() || (dateRange.$lte && time > dateRange.$lte.getTime())) {
                        return false;
                    }
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
            // 4. Search Term
            if (query.searchTerm && p.mapId) {
                const map = allMaps.find(m => m._id.toString() === p.mapId);
                if (!map || !map.name.toLowerCase().includes(query.searchTerm.toLowerCase()))
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
    const mostOpenedPlaces = mostOpenedPlacesRaw.map(p => ({
        name: p.name,
        count: p.openCount || 0,
    }));
    const mostRedeemedOffersRaw = await offer_model_1.Offer.find(offerFilter)
        .sort({ redemptionsCount: -1 })
        .limit(5)
        .select('title redemptionsCount');
    const mostRedeemedOffers = mostRedeemedOffersRaw.map(o => ({
        name: o.title,
        count: o.redemptionsCount || 0,
    }));
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
};
