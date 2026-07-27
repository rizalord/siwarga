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
            {record.resident.full_name}
          </p>
          {isActive && (
            <Badge variant='default' className='text-xs'>
              Aktif
            </Badge>
          )}
        </div>
        <p className='text-sm text-muted-foreground'>
          {formatDate(record.start_date)}
          {record.end_date ? ` - ${formatDate(record.end_date)}` : ' - Sekarang'}
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
