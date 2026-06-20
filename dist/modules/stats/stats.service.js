"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const map_model_1 = require("../map/map.model");
const place_model_1 = require("../place/place.model");
const offer_model_1 = require("../offer/offer.model");
const user_model_1 = require("../user/user.model");
const getDashboardData = async () => {
    const [totalMaps, totalPlaces, activeOffers] = await Promise.all([
        map_model_1.Map.countDocuments(),
        place_model_1.Place.countDocuments(),
        offer_model_1.Offer.countDocuments({ status: 'ACTIVE' }),
    ]);
    // Mocking revenue and sales for now as they are not explicitly stored in a Transaction model
    // In a real production scenario, these would be aggregated from a payments/subscriptions collection
    const totalSales = 12450;
    const thisMonthRevenue = 3280;
    const taxesCollected = 820;
    const recentMaps = await map_model_1.Map.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .select('name createdAt');
    const recentPlaces = await place_model_1.Place.find()
        .sort({ updatedAt: -1 })
        .limit(3)
        .select('name updatedAt');
    const recentOffers = await offer_model_1.Offer.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .select('title createdAt');
    const recentUsers = await user_model_1.User.find()
        .sort({ updatedAt: -1 })
        .limit(3)
        .select('name role updatedAt');
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
const getReportsData = async () => {
    // 1. Sales & Taxes Stats (Mocking based on image)
    const totalSales = 31900;
    const taxesCollected = 3190;
    const netRevenue = 28710;
    const monthlyData = [
        { month: 'Jan', totalSales: 4200, taxes: 420, netRevenue: 3780 },
        { month: 'Feb', totalSales: 5100, taxes: 510, netRevenue: 4590 },
        { month: 'Mar', totalSales: 3800, taxes: 380, netRevenue: 3420 },
        { month: 'Apr', totalSales: 6200, taxes: 620, netRevenue: 5580 },
        { month: 'May', totalSales: 5500, taxes: 550, netRevenue: 4950 },
        { month: 'Jun', totalSales: 7100, taxes: 710, netRevenue: 6390 },
    ];
    // 2. Usage Stats (Top 5 for each)
    const mostViewedMapsRaw = await map_model_1.Map.find()
        .sort({ viewCount: -1 })
        .limit(5)
        .select('name viewCount');
    const mostViewedMaps = mostViewedMapsRaw.map(m => ({
        name: m.name,
        count: m.viewCount || 0,
    }));
    const mostOpenedPlacesRaw = await place_model_1.Place.find()
        .sort({ openCount: -1 })
        .limit(5)
        .select('name openCount');
    const mostOpenedPlaces = mostOpenedPlacesRaw.map(p => ({
        name: p.name,
        count: p.openCount || 0,
    }));
    const mostRedeemedOffersRaw = await offer_model_1.Offer.find()
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
