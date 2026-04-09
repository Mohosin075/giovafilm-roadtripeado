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
