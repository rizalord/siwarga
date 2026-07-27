import { useState } from 'react'
import { useYearlySummary } from '@/hooks/use-reports'
import { SummaryCards } from '@/features/siwarga-dashboard/summary-cards'
import { IncomeExpenseChart } from '@/features/siwarga-dashboard/income-expense-chart'

export function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: summary, isLoading } = useYearlySummary(year)

  if (isLoading) {
    return <div className='p-6'>Memuat data...</div>
  }

  return (
    <div className='space-y-6 p-6'>
      <h1 className='text-2xl font-bold'>Dashboard</h1>
      <SummaryCards data={summary} />
      <IncomeExpenseChart
        data={summary?.monthly_data ?? []}
        year={year}
        onYearChange={setYear}
      />
    </div>
  )
}
