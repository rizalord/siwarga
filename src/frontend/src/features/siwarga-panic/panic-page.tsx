import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { PanicAlert, PanicStatus } from '@/types/api'
import { Phone, Siren } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
  useCancelPanic,
  useEmergencyContacts,
  useHandlePanic,
  usePanicAlerts,
  useReportPanic,
  useResolvePanic,
} from '@/hooks/use-panic'
import { useHasPermission } from '@/hooks/use-permission'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/layout/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/panic/')

const STATUS_LABELS: Record<PanicStatus, string> = {
  active: 'Aktif',
  handled: 'Ditangani',
  resolved: 'Selesai',
  cancelled: 'Dibatalkan',
}

function formatPanicDate(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ReportPanicDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const reportPanic = useReportPanic()
  const [locationNote, setLocationNote] = useState('')
  const [note, setNote] = useState('')

  const reset = () => {
    setLocationNote('')
    setNote('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reportPanic.isPending) return
    reportPanic.mutate(
      {
        ...(locationNote.trim() ? { location_note: locationNote.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Lapor Kondisi Darurat</DialogTitle>
          <DialogDescription>
            Laporan ini langsung diteruskan ke satpam yang sedang bertugas.
            Gunakan hanya untuk keadaan darurat.
          </DialogDescription>
        </DialogHeader>
        <form
          id='report-panic-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='panic-location'>Lokasi kejadian</Label>
            <Input
              id='panic-location'
              placeholder='cth. Blok C no. 12, dekat pos ronda'
              autoComplete='off'
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='panic-note'>Keterangan</Label>
            <Textarea
              id='panic-note'
              placeholder='Jelaskan kondisi daruratnya'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type='submit'
            form='report-panic-form'
            disabled={reportPanic.isPending}
            className='bg-red-600 text-white hover:bg-red-700'
          >
            {reportPanic.isPending ? 'Mengirim...' : 'Kirim Laporan Darurat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PanicAlertCard({
  alert,
  canHandle,
  onHandle,
  onResolve,
  handlePending,
  resolvePending,
}: {
  alert: PanicAlert
  canHandle: boolean
  onHandle: (id: number) => void
  onResolve: (id: number) => void
  handlePending: boolean
  resolvePending: boolean
}) {
  return (
    <Card className={alert.status === 'active' ? 'border-red-500' : undefined}>
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge
            variant={alert.status === 'active' ? 'destructive' : 'secondary'}
          >
            {STATUS_LABELS[alert.status]}
          </Badge>
          {alert.house_number && (
            <Badge variant='outline'>{alert.house_number}</Badge>
          )}
        </div>
        <CardTitle className='leading-snug'>
          {alert.location_note ?? 'Lokasi tidak dicatat'}
        </CardTitle>
        <CardDescription>
          {alert.reporter_name ?? 'Warga'} · {formatPanicDate(alert.created_at)}
          {alert.handler_name ? ` · Ditangani ${alert.handler_name}` : ''}
        </CardDescription>
      </CardHeader>
      {(alert.note ||
        (canHandle &&
          alert.status !== 'resolved' &&
          alert.status !== 'cancelled')) && (
        <CardContent className='flex flex-col gap-3'>
          {alert.note && (
            <p className='text-sm whitespace-pre-wrap'>{alert.note}</p>
          )}
          {canHandle && alert.status === 'active' && (
            <div>
              <Button
                variant='outline'
                size='sm'
                disabled={handlePending}
                onClick={() => onHandle(alert.id)}
              >
                Tangani
              </Button>
            </div>
          )}
          {canHandle && alert.status === 'handled' && (
            <div>
              <Button
                variant='outline'
                size='sm'
                disabled={resolvePending}
                onClick={() => onResolve(alert.id)}
              >
                Selesaikan
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function PanicPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const canHandle = useHasPermission('panic-alerts.handle')
  const currentUserId = useAuthStore((state) => state.auth.user?.id)

  const { data, isLoading, isError, refetch } = usePanicAlerts({
    page: search.page,
    status: search.status,
  })
  const { data: contactsData } = useEmergencyContacts()
  const handlePanic = useHandlePanic()
  const resolvePanic = useResolvePanic()
  const cancelPanic = useCancelPanic()

  const [reportOpen, setReportOpen] = useState(false)

  const myActiveAlert = (data?.data ?? []).find(
    (alert) => alert.status === 'active' && alert.reporter_id === currentUserId
  )

  const handleStatusChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: value === 'all' ? undefined : (value as PanicStatus),
        page: undefined,
      }),
    })
  }

  const currentPage = data?.current_page ?? search.page ?? 1
  const lastPage = data?.last_page ?? 1

  const handlePageChange = (nextPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: nextPage <= 1 ? undefined : nextPage,
      }),
    })
  }

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
          <h2 className='text-2xl font-bold tracking-tight'>Panic Button</h2>
          <p className='text-muted-foreground'>
            Minta bantuan darurat ke satpam dalam satu sentuhan.
          </p>
        </div>

        <Button
          size='lg'
          className='w-full bg-red-600 py-8 text-lg font-bold text-white hover:bg-red-700 sm:w-auto sm:px-12'
          onClick={() => setReportOpen(true)}
        >
          <Siren size={24} /> Tombol Darurat
        </Button>

        {myActiveAlert && (
          <Card className='border-red-500 bg-red-50 dark:bg-red-950'>
            <CardHeader>
              <CardTitle>Laporan darurat Anda sedang aktif</CardTitle>
              <CardDescription>
                Satpam telah menerima laporan Anda
                {myActiveAlert.location_note
                  ? ` di ${myActiveAlert.location_note}`
                  : ''}
                . Batalkan jika kondisi sudah aman atau laporan terkirim tidak
                sengaja.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant='outline'
                size='sm'
                disabled={cancelPanic.isPending}
                onClick={() => cancelPanic.mutate(myActiveAlert.id)}
              >
                {cancelPanic.isPending ? 'Membatalkan...' : 'Batalkan'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <Select
            value={search.status ?? 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger
              aria-label='Filter status'
              className='w-full sm:w-44'
            >
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Semua status</SelectItem>
              <SelectItem value='active'>Aktif</SelectItem>
              <SelectItem value='handled'>Ditangani</SelectItem>
              <SelectItem value='resolved'>Selesai</SelectItem>
              <SelectItem value='cancelled'>Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : isError ? (
          <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
            <p className='text-muted-foreground'>Gagal memuat data.</p>
            <Button variant='outline' size='sm' onClick={() => refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className='flex flex-1 items-center justify-center rounded-md border'>
            <p className='py-12 text-muted-foreground'>
              Tidak ada laporan darurat.
            </p>
          </div>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2'>
              {(data?.data ?? []).map((alert) => (
                <PanicAlertCard
                  key={alert.id}
                  alert={alert}
                  canHandle={canHandle}
                  onHandle={(id) => handlePanic.mutate(id)}
                  onResolve={(id) => resolvePanic.mutate(id)}
                  handlePending={handlePanic.isPending}
                  resolvePending={resolvePanic.isPending}
                />
              ))}
            </div>

            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm text-muted-foreground'>
                Halaman {currentPage} dari {lastPage}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage >= lastPage}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Kontak Darurat</CardTitle>
            <CardDescription>
              Hubungi langsung jika tombol darurat tidak merespons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(contactsData?.data ?? []).length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                Belum ada kontak darurat.
              </p>
            ) : (
              <ul className='flex flex-col gap-2'>
                {(contactsData?.data ?? []).map((contact) => (
                  <li key={contact.id}>
                    <a
                      href={`tel:${contact.phone}`}
                      className='flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:border-primary'
                    >
                      <Phone size={18} className='shrink-0' />
                      <span className='font-medium'>{contact.name}</span>
                      <span className='ms-auto text-sm text-muted-foreground'>
                        {contact.phone}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Main>

      <ReportPanicDialog open={reportOpen} onOpenChange={setReportOpen} />
    </>
  )
}

export function PanicPage() {
  return <PanicPageInner />
}
