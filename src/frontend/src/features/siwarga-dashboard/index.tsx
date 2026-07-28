import { useState } from 'react'
import { useYearlySummary } from '@/hooks/use-reports'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SummaryCards } from '@/features/siwarga-dashboard/summary-cards'
import { IncomeExpenseChart } from '@/features/siwarga-dashboard/income-expense-chart'

export function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: summary, isLoading } = useYearlySummary(year)

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground'>
            Ringkasan kas RT tahun berjalan.
          </p>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <>
            <SummaryCards data={summary} />
            <IncomeExpenseChart
              data={summary?.monthly_data ?? []}
              year={year}
              onYearChange={setYear}
            />
          </>
        )}
      </Main>
    </>
  )
}
