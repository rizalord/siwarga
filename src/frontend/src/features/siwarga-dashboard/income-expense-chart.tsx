import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { YearlySummary } from '@/types/api'

interface IncomeExpenseChartProps {
  data: YearlySummary['monthly_data']
  year: number
  onYearChange: (year: number) => void
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? ''
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function IncomeExpenseChart({
  data,
  year,
  onYearChange,
}: IncomeExpenseChartProps) {
  const chartData = data.map((m) => ({
    name: getMonthName(m.month),
    Pemasukan: m.total_income,
    Pengeluaran: m.total_expense,
  }))

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Grafik Pemasukan & Pengeluaran</CardTitle>
        <Select
          value={String(year)}
          onValueChange={(v) => onYearChange(Number(v))}
        >
          <SelectTrigger className='w-32'>
            <SelectValue placeholder='Pilih tahun' />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className='ps-2'>
        <ResponsiveContainer width='100%' height={350}>
          <BarChart data={chartData}>
            <XAxis
              dataKey='name'
              stroke='#888888'
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke='#888888'
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                `${(value / 1000).toLocaleString('id-ID')}rb`
              }
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              contentStyle={{
                backgroundColor: 'var(--popover)',
                color: 'var(--popover-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar
              dataKey='Pemasukan'
              fill='var(--color-primary)'
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey='Pengeluaran'
              fill='var(--color-destructive)'
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
