import { useParams } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHouse } from '@/hooks/use-houses'
import { HouseHistory } from './house-history'

export function HouseDetail() {
  const { id } = useParams({ from: '/_authenticated/houses/$id' })
  const { data: house, isLoading, isError } = useHouse(Number(id))

  if (isLoading) {
    return (
      <div className='space-y-4 p-6'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-4 w-96' />
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-48' />
          </CardHeader>
          <CardContent className='space-y-2'>
            <Skeleton className='h-4 w-72' />
            <Skeleton className='h-4 w-72' />
            <Skeleton className='h-4 w-72' />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-48' />
          </CardHeader>
          <CardContent className='space-y-2'>
            <Skeleton className='h-4 w-72' />
            <Skeleton className='h-4 w-72' />
            <Skeleton className='h-4 w-72' />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError || !house) {
    return (
      <div className='flex flex-1 items-center justify-center p-6'>
        <p className='text-muted-foreground'>
          Gagal memuat data rumah.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-6 p-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>
          Rumah {house.house_number}
        </h2>
        <p className='text-muted-foreground'>
          Detail informasi rumah
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Rumah</CardTitle>
          <CardDescription>
            Data dan status rumah
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Nomor Rumah
              </p>
              <p className='text-base'>{house.house_number}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Status
              </p>
              <Badge
                variant={
                  house.status === 'dihuni' ? 'default' : 'secondary'
                }
                className='mt-1'
              >
                {house.status === 'dihuni' ? 'Dihuni' : 'Kosong'}
              </Badge>
            </div>
            <div className='sm:col-span-2'>
              <p className='text-sm font-medium text-muted-foreground'>
                Alamat
              </p>
              <p className='text-base'>{house.address || '-'}</p>
            </div>
            {house.current_resident && (
              <div className='sm:col-span-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Penghuni Saat Ini
                </p>
                <p className='text-base'>
                  {house.current_resident.full_name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penghuni</CardTitle>
          <CardDescription>
            Daftar penghuni yang pernah menempati rumah ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HouseHistory houseId={house.id} />
        </CardContent>
      </Card>
    </div>
  )
}
