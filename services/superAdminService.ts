
import { ExamStat } from '../types.ts';

export interface TenantSalesSummary {
    tenantId: string;
    tenantName: string;
    apiUrl: string;
    status: 'online' | 'offline';
    totalRevenue: number;
    totalSales: number;
    totalAttempts: number;
    platformFee: number;
    conversionRate: number;
    rawStats: ExamStat[];
}

export const superAdminService = {
    /**
     * Polls a specific tenant's public API for sales and engagement data.
     * Note: Requires the /exam-stats endpoint to be accessible or use a Master Admin Token.
     */
    fetchTenantData: async (apiUrl: string, tenantId: string, tenantName: string, feePercent: number): Promise<TenantSalesSummary> => {
        try {
            const response = await fetch(`${apiUrl.replace(/\/$/, '')}/wp-json/mco-app/v1/exam-stats`, {
                mode: 'cors',
                credentials: 'omit' // Public stats don't need user cookies, or use a master secret header
            });

            if (!response.ok) throw new Error("Offline");

            const stats: ExamStat[] = await response.json();
            
            const totals = stats.reduce((acc, curr) => {
                acc.revenue += Number(curr.totalRevenue || 0);
                acc.sales += Number(curr.totalSales || 0);
                acc.attempts += Number(curr.attempts || 0);
                return acc;
            }, { revenue: 0, sales: 0, attempts: 0 });

            return {
                tenantId,
                tenantName,
                apiUrl,
                status: 'online',
                totalRevenue: totals.revenue,
                totalSales: totals.sales,
                totalAttempts: totals.attempts,
                platformFee: (totals.revenue * feePercent) / 100,
                conversionRate: totals.attempts > 0 ? (totals.sales / totals.attempts) * 100 : 0,
                rawStats: stats
            };
        } catch (error) {
            return {
                tenantId,
                tenantName,
                apiUrl,
                status: 'offline',
                totalRevenue: 0,
                totalSales: 0,
                totalAttempts: 0,
                platformFee: 0,
                conversionRate: 0,
                rawStats: []
            };
        }
    }
};
