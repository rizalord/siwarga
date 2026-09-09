import { useState } from 'react'
import type { ExportDataset } from '@/types/api'
import {
  useDownloadBackup,
  useDownloadDataset,
  useDownloadMonthlyPdf,
  useDownloadSummaryPdf,
} from '@/hooks/use-exports'
import { useHasPermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/layout/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const DATASET_LABELS: Record<ExportDataset, string> = {
  residents: 'Penghuni',
  houses: 'Rumah',
  bills: 'Tagihan',
  payments: 'Pembayaran',
  expenses: 'Pengeluaran',
}

const now = new Date()

function MonthlyPdfCard() {
  const canView = useHasPermission('reports.view')
  const download = useDownloadMonthlyPdf()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const invalid =
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    year < 2020

  if (!canView) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Bulanan (PDF)</CardTitle>
        <CardDescription>
          Unduh laporan keuangan bulanan sebagai PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='monthly-year'>Tahun</Label>
            <Input
              id='monthly-year'
              type='number'
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='monthly-month'>Bulan</Label>
            <Input
              id='monthly-month'
              type='number'
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          disabled={download.isPending || invalid}
          onClick={() => download.mutate({ year, month })}
        >
          {download.isPending ? 'Mengunduh...' : 'Unduh PDF Bulanan'}
        </Button>
      </CardContent>
    </Card>
  )
}

function SummaryPdfCard() {
  const canView = useHasPermission('reports.view')
  const download = useDownloadSummaryPdf()
  const [year, setYear] = useState(now.getFullYear())
  const invalid = !Number.isInteger(year) || year < 2020

  if (!canView) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Tahunan (PDF)</CardTitle>
        <CardDescription>
          Unduh ringkasan keuangan tahunan sebagai PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='summary-year'>Tahun</Label>
          <Input
            id='summary-year'
            type='number'
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <Button
          disabled={download.isPending || invalid}
          onClick={() => download.mutate(year)}
        >
          {download.isPending ? 'Mengunduh...' : 'Unduh PDF Tahunan'}
        </Button>
      </CardContent>
    </Card>
  )
}

function DatasetCard({ dataset }: { dataset: ExportDataset }) {
  const download = useDownloadDataset()
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const isFinance =
    dataset === 'bills' || dataset === 'payments' || dataset === 'expenses'
  const monthNum = month === '' ? undefined : Number(month)
  const yearNum = year === '' ? undefined : Number(year)
  const invalid =
    (monthNum !== undefined &&
      (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12)) ||
    (yearNum !== undefined && (!Number.isInteger(yearNum) || yearNum < 2020))

  const handleDownload = () => {
    download.mutate({
      dataset,
      params: {
        month: month === '' ? undefined : Number(month),
        year: year === '' ? undefined : Number(year),
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{DATASET_LABELS[dataset]}</CardTitle>
        <CardDescription>
          Unduh data {DATASET_LABELS[dataset]} sebagai Excel.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {isFinance && (
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor={`dataset-month-${dataset}`}>Bulan</Label>
              <Input
                id={`dataset-month-${dataset}`}
                type='number'
                min={1}
                max={12}
                placeholder='Semua'
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor={`dataset-year-${dataset}`}>Tahun</Label>
              <Input
                id={`dataset-year-${dataset}`}
                type='number'
                placeholder='Semua'
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>
        )}
        <Button
          variant='outline'
          disabled={download.isPending || invalid}
          onClick={handleDownload}
        >
          {download.isPending
            ? 'Mengunduh...'
            : `Unduh ${DATASET_LABELS[dataset]}`}
        </Button>
      </CardContent>
    </Card>
  )
}

function DatasetsSection() {
  const canResidents = useHasPermission('residents.view')
  const canHouses = useHasPermission('houses.view')
  const canReports = useHasPermission('reports.view')

  const visible: ExportDataset[] = (
    Object.keys(DATASET_LABELS) as ExportDataset[]
  ).filter((dataset) => {
    if (dataset === 'residents') return canResidents
    if (dataset === 'houses') return canHouses
    return canReports
  })

  if (visible.length === 0) return null

  return (
    <section aria-label='Export dataset' className='flex flex-col gap-4'>
      <div>
        <h3 className='text-lg font-semibold tracking-tight'>Export Dataset</h3>
        <p className='text-sm text-muted-foreground'>
          Unduh data master dan keuangan sebagai file Excel.
        </p>
      </div>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {visible.map((dataset) => (
          <DatasetCard key={dataset} dataset={dataset} />
        ))}
      </div>
    </section>
  )
}

function BackupCard() {
  const canBackup = useHasPermission('users.manage')
  const download = useDownloadBackup()

  if (!canBackup) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup Data (JSON)</CardTitle>
        <CardDescription>
          Unduh salinan seluruh data aplikasi sebagai file JSON.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant='outline'
          disabled={download.isPending}
          onClick={() => download.mutate()}
        >
          {download.isPending ? 'Mengunduh...' : 'Unduh Backup JSON'}
        </Button>
      </CardContent>
    </Card>
  )
}

function ExportsPageInner() {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <NotificationBell />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Export & Backup</h2>
          <p className='text-muted-foreground'>
            Unduh laporan, dataset, dan salinan data aplikasi.
          </p>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <MonthlyPdfCard />
          <SummaryPdfCard />
        </div>

        <DatasetsSection />

        <BackupCard />
      </Main>
    </>
  )
}

export function ExportsPage() {
  return <ExportsPageInner />
}
