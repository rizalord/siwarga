import { Link } from '@tanstack/react-router'
import type { PatrolShift } from '@/types/api'
import { CalendarClock, DoorOpen, Siren } from 'lucide-react'
import { useGuestLogs } from '@/hooks/use-guest-logs'
import { usePanicAlerts } from '@/hooks/use-panic'
import { usePatrols } from '@/hooks/use-patrols'
import { useHasPermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const SHIFT_LABELS: Record<PatrolShift, string> = {
  pagi: 'Pagi',
  siang: 'Siang',
  malam: 'Malam',
}

function formatTanggal(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function SecurityWidgets() {
  const canHandle = useHasPermission('panic-alerts.handle')
  const canGuest = useHasPermission('guest-logs.view')
  const canPatrol = useHasPermission('patrol-schedules.view')
  const { data: panic, isLoading: panicLoading } = usePanicAlerts(
    {
      status: 'active',
      per_page: 1,
    },
    { enabled: canHandle }
  )
  const { data: guests, isLoading: guestsLoading } = useGuestLogs(
    {
      date: todayISO(),
      per_page: 1,
    },
    { enabled: canGuest }
  )
  const { data: patrols, isLoading: patrolsLoading } = usePatrols(
    {
      from: todayISO(),
      per_page: 1,
    },
    { enabled: canPatrol }
  )

  const nextPatrol = patrols?.data[0]

  if (!canHandle && !canGuest && !canPatrol) {
    return (
      <Button asChild variant='destructive' size='lg' className='w-full'>
        <Link to='/panic'>
          <Siren className='size-4' />
          Lapor Darurat
        </Link>
      </Button>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid gap-4 sm:grid-cols-3'>
        {canHandle && (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Panic Aktif</CardTitle>
              <Siren className='size-4 text-destructive' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {panicLoading ? '…' : (panic?.total ?? 0)}
              </div>
              <Link
                to='/panic'
                className='text-xs text-muted-foreground underline underline-offset-4 hover:text-primary'
              >
                Lihat laporan darurat
              </Link>
            </CardContent>
          </Card>
        )}
        {canGuest && (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Tamu Hari Ini
              </CardTitle>
              <DoorOpen className='size-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {guestsLoading ? '…' : (guests?.total ?? 0)}
              </div>
              <Link
                to='/guest-logs'
                className='text-xs text-muted-foreground underline underline-offset-4 hover:text-primary'
              >
                Lihat buku tamu
              </Link>
            </CardContent>
          </Card>
        )}
        {canPatrol && (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Ronda Berikutnya
              </CardTitle>
              <CalendarClock className='size-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {patrolsLoading
                  ? '…'
                  : nextPatrol
                    ? formatTanggal(nextPatrol.date)
                    : 'Belum ada jadwal'}
              </div>
              <p className='text-xs text-muted-foreground'>
                {patrolsLoading || !nextPatrol
                  ? 'Lihat jadwal ronda'
                  : `Shift ${SHIFT_LABELS[nextPatrol.shift]} · ${nextPatrol.personnel_name}`}
              </p>
              <Link
                to='/patrols'
                className='text-xs text-muted-foreground underline underline-offset-4 hover:text-primary'
              >
                Lihat jadwal ronda
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
      {!canHandle && (
        <Button asChild variant='destructive' size='lg' className='w-full'>
          <Link to='/panic'>
            <Siren className='size-4' />
            Lapor Darurat
          </Link>
        </Button>
      )}
    </div>
  )
}
