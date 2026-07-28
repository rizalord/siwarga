import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { YearlySummary } from '@/types/api'

interface SummaryCardsProps {
  data?: YearlySummary
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function SummaryCards({ data }: SummaryCardsProps) {
  if (!data) return null

  const currentMonth = new Date().getMonth() + 1
  const currentMonthData = data.monthly_data.find(
    (m) => m.month === currentMonth
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

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Total Pemasukan
          </CardTitle>
          <TrendingUp className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatCurrency(currentMonthIncome)}
          </div>
          <p className='text-xs text-muted-foreground'>
            YTD: {formatCurrency(ytdIncome)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Total Pengeluaran
          </CardTitle>
          <TrendingDown className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatCurrency(currentMonthExpense)}
          </div>
          <p className='text-xs text-muted-foreground'>
            YTD: {formatCurrency(ytdExpense)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Saldo Berjalan
          </CardTitle>
          <Wallet className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
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
