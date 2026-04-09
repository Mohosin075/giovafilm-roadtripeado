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
  name: string;
  count: number;
}

export interface IUsageStats {
  mostViewedMaps: IUsageItem[];
  mostOpenedPlaces: IUsageItem[];
  mostRedeemedOffers: IUsageItem[];
}

export interface IReportsData {
  salesAndTaxes: ISalesAndTaxesStats;
  usage: IUsageStats;
}
