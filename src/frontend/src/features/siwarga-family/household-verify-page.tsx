import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import api from '@/services/api'
import { BadgeCheck, ShieldAlert } from 'lucide-react'
import { Main } from '@/components/layout/main'

interface VerifyResponse {
  data: { house_number: string; address: string | null; head_name: string }
}

export function HouseholdVerifyPage() {
  const { token } = useParams({ strict: false }) as { token: string }
  const { data, isLoading, isError } = useQuery({
    queryKey: ['household-verify', token],
    queryFn: () =>
      api
        .get<VerifyResponse>(`/api/public/households/${token}`)
        .then((r) => r.data),
    retry: false,
    enabled: !!token,
  })

  return (
    <Main className='flex min-h-screen items-center justify-center'>
      <div className='w-full max-w-md rounded-lg border p-6 text-center'>
        <h1 className='text-xl font-bold'>Verifikasi Kartu Keluarga</h1>
        {isLoading && (
          <p className='mt-4 text-muted-foreground'>Memeriksa...</p>
        )}
        {isError && (
          <div className='mt-4'>
            <ShieldAlert className='mx-auto h-10 w-10 text-destructive' />
            <p className='mt-2 font-semibold'>Kode tidak valid</p>
            <p className='text-sm text-muted-foreground'>
              QR ini tidak terdaftar di SIWarga.
            </p>
          </div>
        )}
        {data && (
          <div className='mt-4 space-y-1'>
            <BadgeCheck className='mx-auto h-10 w-10 text-green-600' />
            <p className='font-semibold text-green-700'>TERVERIFIKASI</p>
            <p className='text-lg font-bold'>{data.data.head_name}</p>
            <p>Rumah {data.data.house_number}</p>
            <p className='text-sm text-muted-foreground'>{data.data.address}</p>
          </div>
        )}
      </div>
    </Main>
  )
}
