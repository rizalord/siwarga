import api from './api'
import type { ApiResponse, MonthlyReport, YearlySummary } from '@/types/api'

export const reportsService = {
  getMonthly: (year: number, month: number) =>
    api.get<ApiResponse<MonthlyReport>>('/api/reports/monthly', { params: { year, month } }),
  getYearly: (year: number) =>
    api.get<ApiResponse<YearlySummary>>('/api/reports/yearly', { params: { year } }),
}
