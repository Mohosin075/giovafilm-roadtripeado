"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeFilterQuery = void 0;
const getTimeFilterQuery = (timeFilter) => {
    if (!timeFilter || timeFilter === 'all_time')
        return null;
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
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    else if (timeFilter === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }
    if (startDate && endDate) {
        return { $gte: startDate, $lte: endDate };
    }
    return null;
};
exports.getTimeFilterQuery = getTimeFilterQuery;
