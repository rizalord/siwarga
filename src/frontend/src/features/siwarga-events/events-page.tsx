import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { AdminEvent, EventDocumentation, EventStatus } from '@/types/api'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAdminEvent,
  useAdminEvents,
  useCreateEvent,
  useDeleteDocumentation,
  useDeleteEvent,
  useEventDocumentation,
  useUpdateEvent,
  useUploadDocumentation,
} from '@/hooks/use-events-admin'
import { useHasPermission } from '@/hooks/use-permission'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/layout/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/events/')

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: 'Akan datang',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
}

const MAX_DOCS = 5
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocalInput(value: string): string {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EventFormDialog({
  open,
  onOpenChange,
  currentRow,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: AdminEvent | null
}) {
  const isUpdate = !!currentRow
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent(currentRow?.id ?? 0)

  const [title, setTitle] = useState(currentRow?.title ?? '')
  const [description, setDescription] = useState(currentRow?.description ?? '')
  const [startsAt, setStartsAt] = useState(
    currentRow ? toDateTimeLocalInput(currentRow.starts_at) : ''
  )
  const [endsAt, setEndsAt] = useState(
    currentRow?.ends_at ? toDateTimeLocalInput(currentRow.ends_at) : ''
  )
  const [status, setStatus] = useState<EventStatus>(
    currentRow?.status ?? 'upcoming'
  )
  const [isPublic, setIsPublic] = useState(currentRow?.is_public ?? false)

  const isPending = createEvent.isPending || updateEvent.isPending
  const canSubmit = title.trim().length > 0 && startsAt.length > 0 && !isPending

  const reset = () => {
    setTitle('')
    setDescription('')
    setStartsAt('')
    setEndsAt('')
    setStatus('upcoming')
    setIsPublic(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      status,
      is_public: isPublic,
    }
    if (isUpdate && currentRow) {
      updateEvent.mutate(payload, {
        // Keep the draft on failure so the user does not lose their input.
        onSuccess: () => onOpenChange(false),
      })
    } else {
      createEvent.mutate(payload, {
        // Keep the draft on failure so the user does not lose their input.
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state && !isUpdate) reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isUpdate ? 'Ubah Kegiatan' : 'Buat Kegiatan'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui detail kegiatan di sini.'
              : 'Tambahkan kegiatan baru untuk warga.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id='event-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='event-title'>Judul *</Label>
            <Input
              id='event-title'
              placeholder='Judul kegiatan'
              autoComplete='off'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='event-description'>Deskripsi</Label>
            <Textarea
              id='event-description'
              placeholder='Deskripsi kegiatan (opsional)'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='event-starts-at'>Mulai *</Label>
              <Input
                id='event-starts-at'
                type='datetime-local'
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='event-ends-at'>Selesai</Label>
              <Input
                id='event-ends-at'
                type='datetime-local'
                min={startsAt || undefined}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='event-status'>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as EventStatus)}
              >
                <SelectTrigger id='event-status' className='w-full'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='upcoming'>Akan datang</SelectItem>
                  <SelectItem value='ongoing'>Berlangsung</SelectItem>
                  <SelectItem value='completed'>Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2 pt-6'>
              <Checkbox
                id='event-is-public'
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <Label htmlFor='event-is-public' className='font-normal'>
                Tampilkan ke publik
              </Label>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' form='event-form' disabled={!canSubmit}>
            {isPending ? 'Menyimpan...' : 'Simpan Kegiatan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GallerySection({ eventId }: { eventId: number }) {
  const uploadDocumentation = useUploadDocumentation(eventId)
  const deleteDocumentation = useDeleteDocumentation()
  const {
    data: serverDocs,
    isLoading: docsLoading,
    isError: docsError,
    refetch: refetchDocs,
  } = useEventDocumentation(eventId)
  const [sessionDocs, setSessionDocs] = useState<EventDocumentation[]>([])
  const [caption, setCaption] = useState('')

  // Seed the grid from server history; session uploads are appended locally
  // and de-duplicated once the history query refetches them.
  const serverIds = new Set((serverDocs ?? []).map((d) => d.id))
  const extraDocs = sessionDocs.filter((d) => !serverIds.has(d.id))
  const allDocs = [...(serverDocs ?? []), ...extraDocs]
  const usedCount = allDocs.length
  const atLimit = usedCount >= MAX_DOCS

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || uploadDocumentation.isPending) return
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Ukuran foto maksimal 2MB')
      e.target.value = ''
      return
    }
    if (atLimit) {
      toast.error(`Maksimal ${MAX_DOCS} dokumentasi per kegiatan`)
      e.target.value = ''
      return
    }
    const captionValue = caption.trim()
    uploadDocumentation.mutate(
      {
        photo: file,
        media_type: 'foto',
        ...(captionValue ? { caption: captionValue } : {}),
      },
      {
        onSuccess: (res) => {
          setSessionDocs((prev) => [...prev, res.data.data])
          setCaption('')
        },
        onSettled: () => {
          e.target.value = ''
        },
      }
    )
  }

  const handleDeleteDoc = (doc: EventDocumentation) => {
    if (deleteDocumentation.isPending) return
    deleteDocumentation.mutate(doc.id, {
      onSuccess: () =>
        setSessionDocs((prev) => prev.filter((d) => d.id !== doc.id)),
    })
  }

  return (
    <div className='space-y-3 border-t pt-4'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold'>Galeri dokumentasi</h3>
        <span className='text-xs text-muted-foreground'>
          {usedCount}/{MAX_DOCS} terpakai
        </span>
      </div>
      {docsLoading ? (
        <p className='text-sm text-muted-foreground'>Memuat dokumentasi...</p>
      ) : docsError ? (
        <div className='flex items-center gap-2'>
          <p className='text-sm text-muted-foreground'>
            Gagal memuat dokumentasi.
          </p>
          <Button variant='outline' size='sm' onClick={() => refetchDocs()}>
            Coba lagi
          </Button>
        </div>
      ) : allDocs.length > 0 ? (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {allDocs.map((doc) => (
            <figure key={doc.id} className='overflow-hidden rounded-md border'>
              <img
                src={doc.url}
                alt={doc.caption ?? `Dokumentasi kegiatan ${eventId}`}
                className='h-24 w-full object-cover'
                loading='lazy'
              />
              <figcaption className='flex items-center justify-between gap-1 px-2 py-1.5'>
                <span className='truncate text-xs text-muted-foreground'>
                  {doc.caption ?? doc.media_type}
                </span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  aria-label={`Hapus dokumentasi ${doc.caption ?? `#${doc.id}`}`}
                  disabled={deleteDocumentation.isPending}
                  onClick={() => handleDeleteDoc(doc)}
                  className='h-7 px-2 text-xs text-destructive'
                >
                  Hapus
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className='text-sm text-muted-foreground'>Belum ada dokumentasi.</p>
      )}

      <div className='space-y-2'>
        <Label htmlFor={`event-doc-caption-${eventId}`}>
          Caption (opsional)
        </Label>
        <Input
          id={`event-doc-caption-${eventId}`}
          placeholder='Caption foto'
          autoComplete='off'
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={atLimit || uploadDocumentation.isPending}
        />
        <Label htmlFor={`event-doc-photo-${eventId}`}>Tambah dokumentasi</Label>
        <input
          id={`event-doc-photo-${eventId}`}
          type='file'
          accept='image/*'
          disabled={atLimit || uploadDocumentation.isPending}
          onChange={handleFileChange}
          className='block w-full text-sm'
        />
        <p className='text-xs text-muted-foreground'>
          Maksimal {MAX_DOCS} foto @ 2MB per kegiatan.
        </p>
        {uploadDocumentation.isPending && (
          <p className='text-xs text-muted-foreground'>Mengunggah foto...</p>
        )}
      </div>
    </div>
  )
}

function EventDetailBody({ eventId }: { eventId: number }) {
  const { data: event, isLoading, isError, refetch } = useAdminEvent(eventId)

  if (isLoading) {
    return (
      <p className='py-8 text-center text-sm text-muted-foreground'>
        Memuat detail kegiatan...
      </p>
    )
  }

  if (isError || !event) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-8'>
        <p className='text-sm text-muted-foreground'>
          Gagal memuat detail kegiatan.
        </p>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          Coba lagi
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='secondary'>{STATUS_LABELS[event.status]}</Badge>
        <Badge variant={event.is_public ? 'default' : 'outline'}>
          {event.is_public ? 'Publik' : 'Internal'}
        </Badge>
      </div>

      <div className='text-sm text-muted-foreground'>
        {formatDateTime(event.starts_at)}
        {event.ends_at ? ` – ${formatDateTime(event.ends_at)}` : ''} ·{' '}
        {event.documentation_count} dokumentasi
      </div>

      {event.description && (
        // Event descriptions are sanitized server-side before storage; safe to render as HTML.
        <div
          className='text-sm leading-relaxed'
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      )}

      <GallerySection key={event.id} eventId={event.id} />
    </div>
  )
}

function EventDetailDialog({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Detail Kegiatan</DialogTitle>
          <DialogDescription>
            Rincian kegiatan dan galeri dokumentasi.
          </DialogDescription>
        </DialogHeader>
        {open && eventId !== null ? (
          <EventDetailBody eventId={eventId} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function EventRow({
  event,
  onDetail,
  onEdit,
  onDelete,
}: {
  event: AdminEvent
  onDetail: (event: AdminEvent) => void
  onEdit: (event: AdminEvent) => void
  onDelete: (event: AdminEvent) => void
}) {
  const updateEvent = useUpdateEvent(event.id)

  return (
    <TableRow>
      <TableCell>
        <button
          type='button'
          onClick={() => onDetail(event)}
          aria-label={`Detail ${event.title}`}
          className='text-start font-medium underline-offset-4 hover:underline'
        >
          {event.title}
        </button>
        <div className='text-xs text-muted-foreground'>/{event.slug}</div>
      </TableCell>
      <TableCell className='text-sm whitespace-nowrap'>
        {formatDateTime(event.starts_at)}
        <div className='text-xs text-muted-foreground'>
          s/d {formatDateTime(event.ends_at)}
        </div>
      </TableCell>
      <TableCell>
        <div className='flex flex-col gap-1.5'>
          <Badge variant='secondary' className='w-fit'>
            {STATUS_LABELS[event.status]}
          </Badge>
          <Select
            value={event.status}
            onValueChange={(value) => {
              if (value !== event.status) updateEvent.mutate({ status: value })
            }}
            disabled={updateEvent.isPending}
          >
            <SelectTrigger
              aria-label={`Ubah status ${event.title}`}
              className='h-8 w-36'
            >
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='upcoming'>Akan datang</SelectItem>
              <SelectItem value='ongoing'>Berlangsung</SelectItem>
              <SelectItem value='completed'>Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-2'>
          <Switch
            id={`event-public-${event.id}`}
            aria-label={`Tampilkan ${event.title} ke publik`}
            checked={event.is_public}
            disabled={updateEvent.isPending}
            onCheckedChange={(checked) =>
              updateEvent.mutate({ is_public: checked })
            }
          />
          <Label
            htmlFor={`event-public-${event.id}`}
            className='text-xs font-normal'
          >
            {event.is_public ? 'Publik' : 'Internal'}
          </Label>
        </div>
      </TableCell>
      <TableCell className='text-center'>{event.documentation_count}</TableCell>
      <TableCell className='text-right'>
        <div className='flex justify-end gap-1.5'>
          <Button
            variant='outline'
            size='sm'
            aria-label={`Ubah ${event.title}`}
            disabled={updateEvent.isPending}
            onClick={() => onEdit(event)}
          >
            Ubah
          </Button>
          <Button
            variant='outline'
            size='sm'
            aria-label={`Hapus ${event.title}`}
            onClick={() => onDelete(event)}
          >
            Hapus
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EventsPageInner() {
  const canManage = useHasPermission('events.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isError, refetch } = useAdminEvents({
    page: search.page,
    per_page: search.pageSize,
    status: search.status,
    search: search.search,
  })
  const deleteEvent = useDeleteEvent()

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<AdminEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: value ? value : undefined,
          page: undefined,
        }),
      })
    }, 400)
  }

  const handleStatusChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: value === 'all' ? undefined : (value as EventStatus),
        page: undefined,
      }),
    })
  }

  const handleDetail = (event: AdminEvent) => {
    setDetailId(event.id)
    setDetailOpen(true)
  }

  const handleEdit = (event: AdminEvent) => {
    setEditingRow(event)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingRow(null)
    setFormOpen(true)
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
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Kegiatan</h2>
            <p className='text-muted-foreground'>
              Kelola kegiatan RT beserta galeri dokumentasinya.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={handleCreate}>
              <span>Buat Kegiatan</span> <Plus size={18} />
            </Button>
          )}
        </div>

        {!canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Akses ditolak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>
                Anda tidak memiliki izin untuk mengelola kegiatan.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <Input
                placeholder='Cari kegiatan'
                aria-label='Cari kegiatan'
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className='sm:max-w-sm'
              />
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
                  <SelectItem value='upcoming'>Akan datang</SelectItem>
                  <SelectItem value='ongoing'>Berlangsung</SelectItem>
                  <SelectItem value='completed'>Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className='flex flex-1 items-center justify-center rounded-md border py-12'>
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
                  Tidak ada kegiatan.
                </p>
              </div>
            ) : (
              <>
                <div className='overflow-hidden rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kegiatan</TableHead>
                        <TableHead>Jadwal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Publik</TableHead>
                        <TableHead className='text-center'>
                          Dokumentasi
                        </TableHead>
                        <TableHead className='text-right'>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.data ?? []).map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          onDetail={handleDetail}
                          onEdit={handleEdit}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </TableBody>
                  </Table>
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
          </>
        )}
      </Main>

      <EventFormDialog
        key={editingRow ? `event-edit-${editingRow.id}` : 'event-create'}
        open={formOpen}
        onOpenChange={(state) => {
          setFormOpen(state)
          if (!state) setEditingRow(null)
        }}
        currentRow={editingRow}
      />
      <EventDetailDialog
        eventId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(state) => {
          if (!state) setDeleteTarget(null)
        }}
        handleConfirm={() => {
          if (!deleteTarget) return
          deleteEvent.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
        disabled={deleteEvent.isPending}
        title='Hapus Kegiatan'
        desc={`Apakah Anda yakin ingin menghapus "${deleteTarget?.title}"?`}
        confirmText='Hapus'
        destructive
      />
    </>
  )
}

export function EventsPage() {
  return <EventsPageInner />
}
