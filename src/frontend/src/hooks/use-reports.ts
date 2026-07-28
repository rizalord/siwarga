import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports'

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: ['monthly-report', year, month],
    queryFn: () => reportsService.getMonthly(year, month),
    select: (res) => res.data.data,
    enabled: !!year && !!month,
  })
}

export function useYearlySummary(year: number) {
  return useQuery({
    queryKey: ['yearly-summary', year],
    queryFn: () => reportsService.getYearly(year),
    select: (res) => res.data.data,
    enabled: !!year,
  })
}
