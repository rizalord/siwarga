import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
      <CardContent>
        <ResponsiveContainer width='100%' height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='name' />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey='Pemasukan'
              fill='#22c55e'
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey='Pengeluaran'
              fill='#ef4444'
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
