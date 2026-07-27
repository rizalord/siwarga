import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { YearlySummary } from '@/types/api'

interface SummaryCardsProps {
  data?: YearlySummary
}

export function SummaryCards({ data }: SummaryCardsProps) {
  if (!data) return null

  const currentMonth = new Date().getMonth() + 1
  const currentMonthData = data.monthly_data.find(
    (m) => m.month === currentMonth,
  )

  const currentMonthIncome = currentMonthData?.total_income ?? 0
  const currentMonthExpense = currentMonthData?.total_expense ?? 0
  const currentMonthBalance = currentMonthData?.balance ?? 0

  const ytdIncome = data.monthly_data
    .filter((m) => m.month <= currentMonth)
    .reduce((sum, m) => sum + m.total_income, 0)
  const ytdExpense = data.monthly_data
    .filter((m) => m.month <= currentMonth)
    .reduce((sum, m) => sum + m.total_expense, 0)
  const ytdBalance = data.monthly_data
    .filter((m) => m.month <= currentMonth)
    .reduce((sum, m) => sum + m.balance, 0)

  const formatCurrency = (value: number) =>
    `Rp ${value.toLocaleString('id-ID')}`

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      <Card className='border-l-4 border-l-green-500'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Total Pemasukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-green-600'>
            {formatCurrency(currentMonthIncome)}
          </div>
          <p className='text-xs text-muted-foreground'>
            YTD: {formatCurrency(ytdIncome)}
          </p>
        </CardContent>
      </Card>
      <Card className='border-l-4 border-l-red-500'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Total Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-red-600'>
            {formatCurrency(currentMonthExpense)}
          </div>
          <p className='text-xs text-muted-foreground'>
            YTD: {formatCurrency(ytdExpense)}
          </p>
        </CardContent>
      </Card>
      <Card className='border-l-4 border-l-blue-500'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Saldo Berjalan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-blue-600'>
            {formatCurrency(currentMonthBalance)}
          </div>
          <p className='text-xs text-muted-foreground'>
            YTD: {formatCurrency(ytdBalance)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
