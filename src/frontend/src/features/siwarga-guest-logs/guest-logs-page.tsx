import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import type { GuestLog, GuestLogStatus } from '@/types/api'
import { Copy, LogIn, LogOut, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useCheckInGuest,
  useCheckOutGuest,
  useGuestLogs,
  useRegisterGuest,
} from '@/hooks/use-guest-logs'
import { useHasPermission } from '@/hooks/use-permission'
import { useTableUrlState } from '@/hooks/use-table-url-state'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/guest-logs/')

const STATUS_LABELS: Record<GuestLogStatus, string> = {
  registered: 'Terdaftar',
  checked_in: 'Masuk',
  checked_out: 'Keluar',
}

function formatGuestLogDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type GuestLogsColumnsProps = {
  canManage: boolean
  onCheckIn: (id: number) => void
  onCheckOut: (id: number) => void
  checkInPending: boolean
  checkOutPending: boolean
}

function guestLogsColumns({
  canManage,
  onCheckIn,
  onCheckOut,
  checkInPending,
  checkOutPending,
}: GuestLogsColumnsProps): ColumnDef<GuestLog>[] {
  return [
    {
      id: 'guest_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tamu' />
      ),
      accessorKey: 'guest_name',
      cell: ({ row }) => (
        <div>
          <p className='font-medium'>{row.original.guest_name}</p>
          {row.original.purpose && (
            <p className='text-sm text-muted-foreground'>
              {row.original.purpose}
            </p>
          )}
        </div>
      ),
      meta: { label: 'Tamu' },
    },
    {
      id: 'house_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Rumah Tujuan' />
      ),
      accessorKey: 'house_number',
      cell: ({ row }) => row.original.house_number ?? '—',
      meta: { label: 'Rumah Tujuan' },
    },
    {
      id: 'plate_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Plat Nomor' />
      ),
      accessorKey: 'plate_number',
      cell: ({ row }) => row.original.plate_number ?? '—',
      meta: { label: 'Plat Nomor' },
    },
    {
      id: 'visit_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tanggal Kunjungan' />
      ),
      accessorKey: 'visit_date',
      cell: ({ row }) => formatGuestLogDate(row.original.visit_date),
      meta: { label: 'Tanggal Kunjungan' },
    },
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'checked_out' ? 'outline' : 'default'
          }
        >
          {STATUS_LABELS[row.original.status]}
        </Badge>
      ),
      meta: { label: 'Status' },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        if (!canManage) return <span className='text-muted-foreground'>—</span>
        const log = row.original
        if (log.status === 'registered') {
          return (
            <Button
              variant='outline'
              size='sm'
              disabled={checkInPending}
              onClick={() => onCheckIn(log.id)}
            >
              <LogIn size={16} /> Check-in
            </Button>
          )
        }
        if (log.status === 'checked_in') {
          return (
            <Button
              variant='outline'
              size='sm'
              disabled={checkOutPending}
              onClick={() => onCheckOut(log.id)}
            >
              <LogOut size={16} /> Check-out
            </Button>
          )
        }
        return <span className='text-muted-foreground'>—</span>
      },
    },
  ]
}

function RegisterGuestDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered: (log: GuestLog) => void
}) {
  const registerGuest = useRegisterGuest()
  const [guestName, setGuestName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [houseId, setHouseId] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [visitDate, setVisitDate] = useState('')

  const canSubmit =
    guestName.trim().length > 0 &&
    Number(houseId) > 0 &&
    !registerGuest.isPending

  const reset = () => {
    setGuestName('')
    setPurpose('')
    setHouseId('')
    setPlateNumber('')
    setVisitDate('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    registerGuest.mutate(
      {
        guest_name: guestName.trim(),
        house_id: Number(houseId),
        ...(purpose.trim() ? { purpose: purpose.trim() } : {}),
        ...(plateNumber.trim() ? { plate_number: plateNumber.trim() } : {}),
        ...(visitDate ? { visit_date: visitDate } : {}),
      },
      {
        onSuccess: (res) => {
          onRegistered(res.data.data)
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
          <DialogTitle>Daftarkan Tamu</DialogTitle>
          <DialogDescription>
            Daftarkan tamu sebelum berkunjung agar satpam dapat mencatat kode
            kunjungannya di gerbang.
          </DialogDescription>
        </DialogHeader>
        <form
          id='register-guest-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='guest-name'>Nama tamu *</Label>
            <Input
              id='guest-name'
              placeholder='Nama lengkap tamu'
              autoComplete='off'
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='guest-purpose'>Keperluan</Label>
            <Input
              id='guest-purpose'
              placeholder='Keperluan kunjungan'
              autoComplete='off'
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='guest-house'>ID rumah tujuan *</Label>
              <Input
                id='guest-house'
                type='number'
                min={1}
                placeholder='ID rumah'
                value={houseId}
                onChange={(e) => setHouseId(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='guest-plate'>Plat nomor</Label>
              <Input
                id='guest-plate'
                placeholder='B 1234 ABC'
                autoComplete='off'
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='guest-visit-date'>Tanggal kunjungan</Label>
            <Input
              id='guest-visit-date'
              type='date'
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type='submit'
            form='register-guest-form'
            disabled={!canSubmit}
          >
            {registerGuest.isPending ? 'Mengirim...' : 'Kirim Pendaftaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GuestTokenCard({
  log,
  onCopy,
}: {
  log: GuestLog
  onCopy: (token: string) => void
}) {
  if (!log.qr_token) return null
  return (
    <Card className='border-dashed'>
      <CardHeader>
        <CardTitle>Kode kunjungan {log.guest_name}</CardTitle>
        <CardDescription>
          Tunjukkan kode ini kepada satpam saat tiba di gerbang. Tampilan kode
          QR menyusul — untuk saat ini gunakan kode teks di bawah ini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex flex-wrap items-center gap-2'>
          <code className='rounded-md bg-muted px-3 py-2 font-mono text-sm break-all'>
            {log.qr_token}
          </code>
          <Button
            variant='outline'
            size='sm'
            onClick={() => log.qr_token && onCopy(log.qr_token)}
          >
            <Copy size={16} /> Salin kode
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function GuestLogsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const canManage = useHasPermission('guest-logs.manage')
  const checkInGuest = useCheckInGuest()
  const checkOutGuest = useCheckOutGuest()

  const [registerOpen, setRegisterOpen] = useState(false)
  const [registeredLog, setRegisteredLog] = useState<GuestLog | null>(null)

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: search as unknown as Record<string, unknown>,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: true, key: 'search' },
    columnFilters: [
      { columnId: 'status', searchKey: 'status', type: 'string' },
    ],
    sorting: {},
  })

  const statusFilter = columnFilters.find((f) => f.id === 'status')?.value as
    GuestLogStatus | undefined

  const { data, isLoading, isFetching, isError, refetch } = useGuestLogs({
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
    status: statusFilter,
    search: globalFilter ? globalFilter : undefined,
  })

  const pageCount = data?.last_page ?? 1

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.data ?? [],
    columns: guestLogsColumns({
      canManage,
      onCheckIn: (id) => checkInGuest.mutate(id),
      onCheckOut: (id) => checkOutGuest.mutate(id),
      checkInPending: checkInGuest.isPending,
      checkOutPending: checkOutGuest.isPending,
    }),
    state: {
      columnFilters,
      globalFilter,
      pagination,
      sorting,
    },
    pageCount,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    onSortingChange,
  })

  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  const handleStatusChange = (value: string) => {
    onColumnFiltersChange((prev) => {
      const rest = prev.filter((f) => f.id !== 'status')
      return value === 'all' ? rest : [...rest, { id: 'status', value }]
    })
  }

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Kode kunjungan disalin')
    } catch {
      toast.error('Gagal menyalin kode')
    }
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
            <h2 className='text-2xl font-bold tracking-tight'>Buku Tamu</h2>
            <p className='text-muted-foreground'>
              Daftarkan tamu sebelum berkunjung dan catat check-in/check-out di
              gerbang.
            </p>
          </div>
          <Button className='space-x-1' onClick={() => setRegisterOpen(true)}>
            <span>Daftarkan Tamu</span> <Plus size={18} />
          </Button>
        </div>

        {registeredLog && (
          <GuestTokenCard log={registeredLog} onCopy={handleCopyToken} />
        )}

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
        ) : (
          <div className='flex min-h-0 flex-1 flex-col gap-4'>
            <DataTableToolbar table={table} searchPlaceholder='Cari tamu...' />
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <Select
                value={statusFilter ?? 'all'}
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
                  <SelectItem value='registered'>Terdaftar</SelectItem>
                  <SelectItem value='checked_in'>Masuk</SelectItem>
                  <SelectItem value='checked_out'>Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='min-h-0 flex-1 overflow-auto'>
              <div
                className={cn(
                  'overflow-hidden rounded-md border transition-opacity',
                  isFetching && 'opacity-60'
                )}
              >
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className='h-24 text-center'>
                          Tidak ada tamu.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DataTablePagination table={table} className='mt-auto' />
          </div>
        )}
      </Main>

      <RegisterGuestDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={setRegisteredLog}
      />
    </>
  )
}

export function GuestLogsPage() {
  return <GuestLogsPageInner />
}
