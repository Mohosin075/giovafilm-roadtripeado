export interface IDashboardStats {
  totalMaps: number;
  totalPlaces: number;
  activeOffers: number;
  totalSales: number;
  thisMonthRevenue: number;
  taxesCollected: number;
}

export interface IRecentActivity {
  id: string;
  type: 'place' | 'offer' | 'map' | 'user';
  message: string;
  timestamp: Date;
}

export interface IQuickAction {
  label: string;
  action: string;
}

export interface IDashboardData {
  stats: IDashboardStats;
  recentActivity: IRecentActivity[];
}

export interface ISalesAndTaxesMonthly {
  month: string;
  totalSales: number;
  taxes: number;
  netRevenue: number;
}

export interface ISalesAndTaxesStats {
  totalSales: number;
  taxesCollected: number;
  netRevenue: number;
  monthlyData: ISalesAndTaxesMonthly[];
}

export interface IUsageItem {
  id?: string;
  name: string;
  count: number;
  businessName?: string;
  businessId?: string;
  placeId?: string;
}

export interface IUsageStats {
  mostViewedMaps: IUsageItem[];
  mostOpenedPlaces: IUsageItem[];
  mostRedeemedOffers: IUsageItem[];
}

export interface ISearchMatchItem {
  type: 'place' | 'business' | 'map' | 'offer';
  id: string;
  name: string;
  location?: string;
}

export interface IUserActivityItem {
  id: string;
  type: 'visit' | 'review' | 'redemption' | 'registration';
  userId?: string;
  userName: string;
  userEmail?: string;
  userProfile?: string;
  title: string;
  subtitle?: string;
  targetId?: string;
  targetType?: 'place' | 'business' | 'offer' | 'map';
  timestamp: Date;
}

export interface IUserActivityStats {
  activeUsersToday: number;
  activeUsersThisWeek: number;
  activeUsersThisMonth: number;
  totalRegisteredUsers: number;
  totalPlacesVisited: number;
  totalOffersRedeemed: number;
  totalReviews: number;
  recentActivities: IUserActivityItem[];
}

export interface IReportsData {
  salesAndTaxes: ISalesAndTaxesStats;
  usage: IUsageStats;
  userActivity?: IUserActivityStats;
}
