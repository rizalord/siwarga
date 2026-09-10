import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { CameraInput } from '@/services/cctv'
import type { Camera, CameraSnapshot, SnapshotEvent } from '@/types/api'
import { cn } from '@/lib/utils'
import {
  useCameras,
  useCreateCamera,
  useDeleteCamera,
  useDeleteSnapshot,
  useSimulateCamera,
  useSnapshot,
  useSnapshots,
  useUpdateCamera,
} from '@/hooks/use-cctv'
import { useHasPermission } from '@/hooks/use-permission'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
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

const route = getRouteApi('/_authenticated/cctv/')

const EVENT_LABELS: Record<SnapshotEvent, string> = {
  motion: 'Gerakan',
  panic: 'Panic',
  manual: 'Manual',
  simulated: 'Simulasi',
}

function formatSnapshotDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(value: number): string {
  if (value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  )
  const size = value / Math.pow(1024, i)
  return `${size.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${units[i]}`
}

function SnapshotDetailDialog({
  snapshot,
  onOpenChange,
}: {
  snapshot: CameraSnapshot | null
  onOpenChange: (open: boolean) => void
}) {
  const detailQuery = useSnapshot(snapshot?.id ?? null)
  const detail = detailQuery.data?.data ?? null
  const shown = detail ?? snapshot
  return (
    <Dialog open={snapshot !== null} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {shown ? (shown.camera_name ?? 'Snapshot') : 'Snapshot'}
          </DialogTitle>
          <DialogDescription>
            Pratinjau gambar beserta informasi akses snapshot.
          </DialogDescription>
        </DialogHeader>
        {detailQuery.isPending ? (
          <p className='text-muted-foreground'>Memuat...</p>
        ) : (
          shown && (
            <div className='space-y-4'>
              {shown.file_url ? (
                <img
                  src={shown.file_url}
                  alt={`Snapshot ${shown.camera_name ?? ''}`}
                  className='max-h-[50vh] w-full rounded-md border object-contain'
                />
              ) : (
                <p className='text-muted-foreground'>Tidak ada pratinjau.</p>
              )}
              <dl className='grid gap-2 text-sm sm:grid-cols-2'>
                <div>
                  <dt className='text-muted-foreground'>Kamera</dt>
                  <dd className='font-medium'>{shown.camera_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Jenis kejadian</dt>
                  <dd className='font-medium'>
                    {EVENT_LABELS[shown.event_type]}
                  </dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Waktu tangkap</dt>
                  <dd className='font-medium'>
                    {formatSnapshotDate(shown.captured_at)}
                  </dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Diunggah</dt>
                  <dd className='font-medium'>
                    {formatSnapshotDate(shown.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Tipe berkas</dt>
                  <dd className='font-medium'>{shown.mime}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Ukuran</dt>
                  <dd className='font-medium'>
                    {formatBytes(shown.size_bytes)}
                  </dd>
                </div>
              </dl>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}

function CameraFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Camera | null
}) {
  const createCamera = useCreateCamera()
  const updateCamera = useUpdateCamera()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [ftpUser, setFtpUser] = useState('')
  const [cameraType, setCameraType] = useState<'tapo' | 'simulator'>('tapo')
  const [streamUrl, setStreamUrl] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setLocation(editing?.location ?? '')
      setFtpUser(editing?.ftp_user ?? '')
      setCameraType(editing?.camera_type ?? 'tapo')
      setStreamUrl(editing?.stream_url ?? '')
      setIsActive(editing?.is_active ?? true)
    }
  }, [open, editing])

  const isPending = createCamera.isPending || updateCamera.isPending
  const canSubmit =
    name.trim().length > 0 && ftpUser.trim().length > 0 && !isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const input: CameraInput = {
      name: name.trim(),
      ftp_user: ftpUser.trim(),
      camera_type: cameraType,
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(streamUrl.trim() ? { stream_url: streamUrl.trim() } : {}),
      is_active: isActive,
    }
    if (editing) {
      updateCamera.mutate(
        { id: editing.id, input },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createCamera.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>{editing ? 'Ubah Kamera' : 'Tambah Kamera'}</DialogTitle>
          <DialogDescription>
            Daftarkan kamera CCTV beserta akun FTP untuk unggahan snapshot.
          </DialogDescription>
        </DialogHeader>
        <form
          id='camera-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='camera-name'>Nama *</Label>
            <Input
              id='camera-name'
              placeholder='Nama kamera'
              autoComplete='off'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='camera-location'>Lokasi</Label>
            <Input
              id='camera-location'
              placeholder='Lokasi pemasangan'
              autoComplete='off'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='camera-ftp-user'>FTP user *</Label>
              <Input
                id='camera-ftp-user'
                placeholder='Akun FTP kamera'
                autoComplete='off'
                value={ftpUser}
                onChange={(e) => setFtpUser(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='camera-type'>Tipe kamera</Label>
              <Select
                value={cameraType}
                onValueChange={(v) => setCameraType(v as 'tapo' | 'simulator')}
              >
                <SelectTrigger id='camera-type'>
                  <SelectValue placeholder='Tipe kamera' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='tapo'>Tapo</SelectItem>
                  <SelectItem value='simulator'>Simulator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='camera-stream-url'>Stream URL</Label>
            <Input
              id='camera-stream-url'
              placeholder='URL streaming (opsional)'
              autoComplete='off'
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
            />
          </div>
          <div className='flex items-center justify-between'>
            <Label htmlFor='camera-is-active'>Aktif</Label>
            <Switch
              id='camera-is-active'
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' form='camera-form' disabled={!canSubmit}>
            {isPending ? 'Menyimpan...' : 'Simpan Kamera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CctvPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const canManage = useHasPermission('cameras.manage')

  const [tab, setTab] = useState<'galeri' | 'kamera'>('galeri')
  const [selected, setSelected] = useState<CameraSnapshot | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Camera | null>(null)

  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: search as unknown as Record<string, unknown>,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 12 },
    globalFilter: { enabled: false },
    columnFilters: [
      {
        columnId: 'camera_id',
        searchKey: 'camera_id',
        type: 'string',
        serialize: (value: unknown) =>
          typeof value === 'string' && value !== '' ? Number(value) : undefined,
        deserialize: (value: unknown) =>
          value === null || value === undefined || value === ''
            ? ''
            : String(value),
      },
      { columnId: 'event_type', searchKey: 'event_type', type: 'string' },
      { columnId: 'date', searchKey: 'date', type: 'string' },
    ],
    sorting: {},
  })

  const cameraIdFilter = columnFilters.find((f) => f.id === 'camera_id')
    ?.value as string | undefined
  const eventFilter = columnFilters.find((f) => f.id === 'event_type')
    ?.value as SnapshotEvent | undefined
  const dateFilter = columnFilters.find((f) => f.id === 'date')?.value as
    string | undefined

  const {
    data: snapshotsData,
    isLoading: snapshotsLoading,
    isFetching: snapshotsFetching,
    isError: snapshotsError,
    refetch: refetchSnapshots,
  } = useSnapshots({
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
    ...(cameraIdFilter ? { camera_id: Number(cameraIdFilter) } : {}),
    ...(eventFilter ? { event_type: eventFilter } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
  })

  const {
    data: camerasData,
    isLoading: camerasLoading,
    isError: camerasError,
    refetch: refetchCameras,
  } = useCameras()

  const deleteSnapshot = useDeleteSnapshot()
  const deleteCamera = useDeleteCamera()
  const simulateCamera = useSimulateCamera()

  const snapshotPageCount = snapshotsData?.last_page ?? 1

  useEffect(() => {
    ensurePageInRange(snapshotPageCount)
  }, [snapshotPageCount, ensurePageInRange])

  const setFilter = (id: string, value: string | undefined) => {
    onColumnFiltersChange((prev) => {
      const rest = prev.filter((f) => f.id !== id)
      return !value || value === 'all' ? rest : [...rest, { id, value }]
    })
  }

  const goToPage = (page: number) => {
    onPaginationChange({ pageIndex: page - 1, pageSize: pagination.pageSize })
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>CCTV</h2>
            <p className='text-muted-foreground'>
              Pantau galeri snapshot kamera dan kelola perangkat CCTV.
            </p>
          </div>
          {tab === 'kamera' && canManage && (
            <Button
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              Tambah Kamera
            </Button>
          )}
        </div>

        <div className='flex gap-2' role='tablist' aria-label='Navigasi CCTV'>
          <Button
            role='tab'
            aria-selected={tab === 'galeri'}
            variant={tab === 'galeri' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setTab('galeri')}
          >
            Galeri
          </Button>
          <Button
            role='tab'
            aria-selected={tab === 'kamera'}
            variant={tab === 'kamera' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setTab('kamera')}
          >
            Kamera
          </Button>
        </div>

        {tab === 'galeri' && (
          <div className='flex min-h-0 flex-1 flex-col gap-4'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <Select
                value={cameraIdFilter ?? 'all'}
                onValueChange={(v) => setFilter('camera_id', v)}
              >
                <SelectTrigger
                  aria-label='Filter kamera'
                  className='w-full sm:w-52'
                >
                  <SelectValue placeholder='Semua kamera' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua kamera</SelectItem>
                  {(camerasData?.data ?? []).map((camera) => (
                    <SelectItem key={camera.id} value={String(camera.id)}>
                      {camera.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={eventFilter ?? 'all'}
                onValueChange={(v) => setFilter('event_type', v)}
              >
                <SelectTrigger
                  aria-label='Filter kejadian'
                  className='w-full sm:w-44'
                >
                  <SelectValue placeholder='Semua kejadian' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua kejadian</SelectItem>
                  <SelectItem value='motion'>Gerakan</SelectItem>
                  <SelectItem value='panic'>Panic</SelectItem>
                  <SelectItem value='manual'>Manual</SelectItem>
                  <SelectItem value='simulated'>Simulasi</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type='date'
                aria-label='Filter tanggal'
                className='w-full sm:w-44'
                value={dateFilter ?? ''}
                onChange={(e) => setFilter('date', e.target.value || undefined)}
              />
            </div>

            {snapshotsLoading ? (
              <div className='flex flex-1 items-center justify-center'>
                <p className='text-muted-foreground'>Memuat data...</p>
              </div>
            ) : snapshotsError ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
                <p className='text-muted-foreground'>Gagal memuat data.</p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetchSnapshots()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : (snapshotsData?.data ?? []).length === 0 ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
                <p className='text-muted-foreground'>Tidak ada snapshot.</p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                    snapshotsFetching && 'opacity-60'
                  )}
                >
                  {(snapshotsData?.data ?? []).map((snapshot) => (
                    <Card key={snapshot.id} className='overflow-hidden'>
                      <button
                        type='button'
                        className='block w-full cursor-pointer'
                        onClick={() => setSelected(snapshot)}
                        aria-label={`Lihat snapshot ${snapshot.camera_name ?? ''}`}
                      >
                        {snapshot.file_url ? (
                          <img
                            src={snapshot.file_url}
                            alt={`Snapshot ${snapshot.camera_name ?? ''}`}
                            loading='lazy'
                            className='aspect-video w-full object-cover'
                          />
                        ) : (
                          <span className='flex aspect-video w-full items-center justify-center text-sm text-muted-foreground'>
                            Tidak ada pratinjau
                          </span>
                        )}
                      </button>
                      <CardContent className='flex flex-col gap-2 p-3'>
                        <div className='flex items-center justify-between gap-2'>
                          <p className='truncate text-sm font-medium'>
                            {snapshot.camera_name ?? '—'}
                          </p>
                          <Badge variant='outline'>
                            {EVENT_LABELS[snapshot.event_type]}
                          </Badge>
                        </div>
                        <div className='flex items-center justify-between gap-2'>
                          <p className='text-xs text-muted-foreground'>
                            {formatSnapshotDate(
                              snapshot.captured_at ?? snapshot.created_at
                            )}
                          </p>
                          {canManage && (
                            <Button
                              variant='destructive'
                              size='sm'
                              disabled={deleteSnapshot.isPending}
                              onClick={() => deleteSnapshot.mutate(snapshot.id)}
                            >
                              Hapus
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className='mt-auto flex items-center justify-between gap-2'>
                  <p className='text-sm font-medium'>
                    Halaman {snapshotsData?.current_page ?? 1} dari{' '}
                    {snapshotPageCount}
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={(snapshotsData?.current_page ?? 1) <= 1}
                      onClick={() =>
                        goToPage((snapshotsData?.current_page ?? 2) - 1)
                      }
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={
                        (snapshotsData?.current_page ?? 1) >= snapshotPageCount
                      }
                      onClick={() =>
                        goToPage((snapshotsData?.current_page ?? 0) + 1)
                      }
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'kamera' && (
          <div className='flex min-h-0 flex-1 flex-col gap-4'>
            {camerasLoading ? (
              <div className='flex flex-1 items-center justify-center'>
                <p className='text-muted-foreground'>Memuat data...</p>
              </div>
            ) : camerasError ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
                <p className='text-muted-foreground'>Gagal memuat data.</p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetchCameras()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : (
              <div className='min-h-0 flex-1 overflow-auto'>
                <div className='overflow-hidden rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>FTP User</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Snapshot</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(camerasData?.data ?? []).length ? (
                        (camerasData?.data ?? []).map((camera) => (
                          <TableRow key={camera.id}>
                            <TableCell className='font-medium'>
                              {camera.name}
                            </TableCell>
                            <TableCell>{camera.location ?? '—'}</TableCell>
                            <TableCell>{camera.ftp_user}</TableCell>
                            <TableCell>{camera.camera_type}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  camera.is_active ? 'default' : 'outline'
                                }
                              >
                                {camera.is_active ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {camera.snapshots_count ?? '—'}
                            </TableCell>
                            <TableCell>
                              <div className='flex flex-wrap gap-2'>
                                {import.meta.env.DEV && (
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={simulateCamera.isPending}
                                    onClick={() =>
                                      simulateCamera.mutate({ id: camera.id })
                                    }
                                  >
                                    Simulasi
                                  </Button>
                                )}
                                {canManage && (
                                  <>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      onClick={() => {
                                        setEditing(camera)
                                        setDialogOpen(true)
                                      }}
                                    >
                                      Ubah
                                    </Button>
                                    <Button
                                      variant='destructive'
                                      size='sm'
                                      disabled={deleteCamera.isPending}
                                      onClick={() =>
                                        deleteCamera.mutate(camera.id)
                                      }
                                    >
                                      Hapus
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className='h-24 text-center'>
                            Tidak ada kamera.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </Main>

      <SnapshotDetailDialog
        snapshot={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
      <CameraFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </>
  )
}

export function CctvPage() {
  return <CctvPageInner />
}
