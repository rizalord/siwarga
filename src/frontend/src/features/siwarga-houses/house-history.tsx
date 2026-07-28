import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useHouseResidents } from '@/hooks/use-houses'
import type { HouseResident } from '@/types/api'

type HouseHistoryProps = {
  houseId: number
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDuration(startDate: string, endDate: string | null): string {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  months = Math.max(months, 0)

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  const parts: string[] = []
  if (years > 0) parts.push(`${years} tahun`)
  if (remainingMonths > 0 || years === 0) parts.push(`${remainingMonths} bulan`)

  return parts.join(' ')
}

function TimelineItem({ record }: { record: HouseResident }) {
  const isActive = record.end_date === null

  return (
    <div className='relative flex gap-4 pb-8 last:pb-0'>
      {/* Timeline line */}
      <div className='flex flex-col items-center'>
        <div
          className={`z-10 h-3 w-3 rounded-full ${
            isActive
              ? 'bg-primary'
              : 'bg-muted-foreground'
          }`}
        />
        {!isActive && (
          <div className='mt-1 h-full w-px bg-border' />
        )}
      </div>

      {/* Content */}
      <div className='flex-1 space-y-1'>
        <div className='flex items-center gap-2'>
          <p className='font-medium'>
            {record.resident?.full_name ?? 'Penghuni tidak ditemukan'}
          </p>
          {isActive && (
            <Badge variant='default' className='text-xs'>
              Aktif
            </Badge>
          )}
          {record.resident?.deleted_at && (
            <Badge variant='secondary' className='text-xs'>
              Dihapus
            </Badge>
          )}
        </div>
        <p className='text-sm text-muted-foreground'>
          {formatDate(record.start_date)}
          {record.end_date ? ` - ${formatDate(record.end_date)}` : ' - Sekarang'}
        </p>
        <p className='text-xs text-muted-foreground'>
          Lama menghuni: {formatDuration(record.start_date, record.end_date)}
        </p>
      </div>
    </div>
  )
}

export function HouseHistory({ houseId }: HouseHistoryProps) {
  const { data: residents, isLoading, isError } = useHouseResidents(houseId)

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-6 w-48' />
        <Skeleton className='h-4 w-72' />
        <Skeleton className='h-4 w-72' />
        <Skeleton className='h-4 w-72' />
      </div>
    )
  }

  if (isError) {
    return (
      <p className='text-sm text-muted-foreground'>
        Gagal memuat riwayat penghuni.
      </p>
    )
  }

  if (!residents || residents.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        Belum ada riwayat penghuni.
      </p>
    )
  }

  return (
    <div className='space-y-0'>
      {residents.map((record) => (
        <TimelineItem key={record.id} record={record} />
      ))}
    </div>
  )
}
