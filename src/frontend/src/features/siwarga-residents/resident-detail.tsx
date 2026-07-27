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
import { useResident } from '@/hooks/use-residents'

export function ResidentDetail() {
  const { id } = useParams({ from: '/_authenticated/residents/$id' })
  const { data: resident, isLoading, isError } = useResident(Number(id))

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
      </div>
    )
  }

  if (isError || !resident) {
    return (
      <div className='flex flex-1 items-center justify-center p-6'>
        <p className='text-muted-foreground'>
          Gagal memuat data penghuni.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-6 p-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>
          {resident.full_name}
        </h2>
        <p className='text-muted-foreground'>
          Detail informasi penghuni
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Penghuni</CardTitle>
          <CardDescription>
            Data pribadi dan status penghuni
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Nama Lengkap
              </p>
              <p className='text-base'>{resident.full_name}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                No. Telepon
              </p>
              <p className='text-base'>{resident.phone_number}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Status
              </p>
              <Badge
                variant={
                  resident.status === 'tetap' ? 'default' : 'secondary'
                }
                className='mt-1'
              >
                {resident.status === 'tetap' ? 'Tetap' : 'Kontrak'}
              </Badge>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Status Nikah
              </p>
              <p className='text-base'>
                {resident.marital_status === 'menikah'
                  ? 'Menikah'
                  : 'Belum Menikah'}
              </p>
            </div>
            {resident.ktp_photo_url && (
              <div className='sm:col-span-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Foto KTP
                </p>
                <img
                  src={resident.ktp_photo_url}
                  alt='KTP'
                  className='mt-1 max-w-xs rounded-md border'
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Tempat Tinggal</CardTitle>
          <CardDescription>
            Daftar rumah yang pernah ditempati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            Riwayat tempat tinggal belum tersedia.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
