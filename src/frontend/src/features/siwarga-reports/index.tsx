import { useState, useMemo } from 'react'
import type { Payment, Expense } from '@/types/api'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useMonthlyReport } from '@/hooks/use-reports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

interface Transaction {
  id: string
  date: string
  description: string
  income: number
  expense: number
  balance: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const MONTHS = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
]

export function MonthlyReportPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: report, isLoading } = useMonthlyReport(year, month)

  const transactions = useMemo<Transaction[]>(() => {
    if (!report) return []

    const paymentTransactions: Transaction[] = (report.payments ?? []).map(
      (p: Payment) => ({
        id: `payment-${p.id}`,
        date: p.payment_date,
        description: p.notes ?? `Pembayaran #${p.id}`,
        income: p.amount_paid,
        expense: 0,
        balance: 0,
      })
    )

    const expenseTransactions: Transaction[] = (report.expenses ?? []).map(
      (e: Expense) => ({
        id: `expense-${e.id}`,
        date: e.expense_date,
        description: e.description ?? e.category.name,
        income: 0,
        expense: e.amount,
        balance: 0,
      })
    )

    const all = [...paymentTransactions, ...expenseTransactions]

    all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let balance = 0
    return all.map((tx) => {
      balance += tx.income - tx.expense
      return { ...tx, balance }
    })
  }, [report])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)

  if (isLoading) {
    return (
      <>
        <Header fixed>
          <Search className='me-auto' />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </Header>
        <Main>
          <div className='flex flex-1 items-center justify-center p-6'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Laporan Bulanan
            </h2>
            <p className='text-muted-foreground'>
              Ringkasan pemasukan dan pengeluaran bulanan.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger className='w-36'>
                <SelectValue placeholder='Bulan' />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className='w-28'>
                <SelectValue placeholder='Tahun' />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {report && (
          <>
            <div className='grid gap-4 sm:grid-cols-3'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Pemasukan
                  </CardTitle>
                  <TrendingUp className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatCurrency(report.total_income)}
                  </div>
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
                    {formatCurrency(report.total_expense)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Saldo</CardTitle>
                  <Wallet className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatCurrency(report.balance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transaksi</CardTitle>
              </CardHeader>
              <CardContent className='p-0 sm:p-6'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className='text-right'>Pemasukan</TableHead>
                        <TableHead className='text-right'>
                          Pengeluaran
                        </TableHead>
                        <TableHead className='text-right'>Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className='text-center text-muted-foreground'
                          >
                            Tidak ada transaksi untuk bulan ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className='whitespace-nowrap'>
                              {formatDate(tx.date)}
                            </TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell className='text-right font-medium tabular-nums'>
                              {tx.income > 0 ? formatCurrency(tx.income) : '-'}
                            </TableCell>
                            <TableCell className='text-right font-medium tabular-nums'>
                              {tx.expense > 0
                                ? formatCurrency(tx.expense)
                                : '-'}
                            </TableCell>
                            <TableCell className='text-right font-medium tabular-nums'>
                              {formatCurrency(tx.balance)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </Main>
    </>
  )
}
