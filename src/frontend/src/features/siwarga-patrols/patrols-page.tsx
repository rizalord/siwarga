import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import type { PatrolSchedule, PatrolShift } from '@/types/api'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCreatePatrol,
  useDeletePatrol,
  usePatrols,
  useUpdatePatrol,
} from '@/hooks/use-patrols'
import { useHasPermission } from '@/hooks/use-permission'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableColumnHeader,
  DataTablePagination,
} from '@/components/data-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/patrols/')

const SHIFT_LABELS: Record<PatrolShift, string> = {
  pagi: 'Pagi',
  siang: 'Siang',
  malam: 'Malam',
}

function formatPatrolDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type PatrolColumnsProps = {
  canManage: boolean
  onEdit: (schedule: PatrolSchedule) => void
  onDelete: (schedule: PatrolSchedule) => void
}

function patrolColumns({
  canManage,
  onEdit,
  onDelete,
}: PatrolColumnsProps): ColumnDef<PatrolSchedule>[] {
  return [
    {
      id: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tanggal' />
      ),
      accessorKey: 'date',
      cell: ({ row }) => formatPatrolDate(row.original.date),
      meta: { label: 'Tanggal' },
    },
    {
      id: 'shift',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Shift' />
      ),
      accessorKey: 'shift',
      cell: ({ row }) => (
        <Badge
          variant={row.original.shift === 'malam' ? 'destructive' : 'default'}
        >
          {SHIFT_LABELS[row.original.shift]}
        </Badge>
      ),
      meta: { label: 'Shift' },
    },
    {
      id: 'personnel_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Petugas' />
      ),
      accessorKey: 'personnel_name',
      cell: ({ row }) => row.original.personnel_name,
      meta: { label: 'Petugas' },
    },
    {
      id: 'area',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Area' />
      ),
      accessorKey: 'area',
      cell: ({ row }) => row.original.area ?? '—',
      meta: { label: 'Area' },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        if (!canManage) return <span className='text-muted-foreground'>—</span>
        const schedule = row.original
        return (
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              aria-label={`Ubah jadwal ${formatPatrolDate(schedule.date)}`}
              onClick={() => onEdit(schedule)}
            >
              <Pencil size={16} /> Ubah
            </Button>
            <Button
              variant='outline'
              size='sm'
              aria-label={`Hapus jadwal ${formatPatrolDate(schedule.date)}`}
              onClick={() => onDelete(schedule)}
            >
              <Trash2 size={16} /> Hapus
            </Button>
          </div>
        )
      },
    },
  ]
}

function PatrolFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: PatrolSchedule | null
}) {
  const createPatrol = useCreatePatrol()
  const updatePatrol = useUpdatePatrol()
  const [date, setDate] = useState(initial?.date ?? '')
  const [shift, setShift] = useState<PatrolShift>(initial?.shift ?? 'malam')
  const [personnelName, setPersonnelName] = useState(
    initial?.personnel_name ?? ''
  )
  const [userId, setUserId] = useState(
    initial?.user_id != null ? String(initial.user_id) : ''
  )
  const [area, setArea] = useState(initial?.area ?? '')
  const [note, setNote] = useState(initial?.note ?? '')

  const pending = createPatrol.isPending || updatePatrol.isPending
  const canSubmit =
    date.trim().length > 0 && personnelName.trim().length > 0 && !pending

  const reset = () => {
    setDate(initial?.date ?? '')
    setShift(initial?.shift ?? 'malam')
    setPersonnelName(initial?.personnel_name ?? '')
    setUserId(initial?.user_id != null ? String(initial.user_id) : '')
    setArea(initial?.area ?? '')
    setNote(initial?.note ?? '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const input = {
      date,
      shift,
      personnel_name: personnelName.trim(),
      ...(userId.trim() ? { user_id: Number(userId) } : {}),
      ...(area.trim() ? { area: area.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    if (initial) {
      updatePatrol.mutate(
        { id: initial.id, input },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createPatrol.mutate(input, {
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
        if (!state) reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {initial ? 'Ubah Jadwal Ronda' : 'Tambah Jadwal Ronda'}
          </DialogTitle>
          <DialogDescription>
            Atur tanggal, shift, dan petugas ronda untuk jadwal keamanan
            lingkungan.
          </DialogDescription>
        </DialogHeader>
        <form
          id='patrol-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='patrol-date'>Tanggal *</Label>
              <Input
                id='patrol-date'
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='patrol-shift'>Shift *</Label>
              <Select
                value={shift}
                onValueChange={(value) => setShift(value as PatrolShift)}
              >
                <SelectTrigger id='patrol-shift'>
                  <SelectValue placeholder='Shift' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='pagi'>Pagi</SelectItem>
                  <SelectItem value='siang'>Siang</SelectItem>
                  <SelectItem value='malam'>Malam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='patrol-personnel'>Nama petugas *</Label>
            <Input
              id='patrol-personnel'
              placeholder='Nama petugas ronda'
              autoComplete='off'
              value={personnelName}
              onChange={(e) => setPersonnelName(e.target.value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='patrol-user'>ID pengguna (opsional)</Label>
              <Input
                id='patrol-user'
                type='number'
                min={1}
                placeholder='ID pengguna'
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='patrol-area'>Area</Label>
              <Input
                id='patrol-area'
                placeholder='cth. Blok A'
                autoComplete='off'
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='patrol-note'>Catatan</Label>
            <Textarea
              id='patrol-note'
              placeholder='Catatan tambahan'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' form='patrol-form' disabled={!canSubmit}>
            {pending ? 'Menyimpan...' : 'Simpan Jadwal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PatrolsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const canManage = useHasPermission('patrol-schedules.manage')
  const deletePatrol = useDeletePatrol()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PatrolSchedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PatrolSchedule | null>(null)

  const {
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
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: 'from', searchKey: 'from', type: 'string' },
      { columnId: 'to', searchKey: 'to', type: 'string' },
    ],
    sorting: {},
  })

  const fromFilter = columnFilters.find((f) => f.id === 'from')?.value as
    string | undefined
  const toFilter = columnFilters.find((f) => f.id === 'to')?.value as
    string | undefined

  const { data, isLoading, isFetching, isError, refetch } = usePatrols({
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
    from: fromFilter,
    to: toFilter,
  })

  const pageCount = data?.last_page ?? 1

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.data ?? [],
    columns: patrolColumns({
      canManage,
      onEdit: (schedule) => {
        setEditing(schedule)
        setDialogOpen(true)
      },
      onDelete: setDeleteTarget,
    }),
    state: {
      columnFilters,
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
    onColumnFiltersChange,
    onSortingChange,
  })

  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  const handleDateFilterChange = (id: 'from' | 'to', value: string) => {
    onColumnFiltersChange((prev) => {
      const rest = prev.filter((f) => f.id !== id)
      return value ? [...rest, { id, value }] : rest
    })
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
            <h2 className='text-2xl font-bold tracking-tight'>Jadwal Ronda</h2>
            <p className='text-muted-foreground'>
              Daftar jadwal ronda dan petugas keamanan lingkungan.
            </p>
          </div>
          {canManage && (
            <Button
              className='space-x-1'
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <span>Tambah Jadwal</span> <Plus size={18} />
            </Button>
          )}
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
        ) : (
          <div className='flex min-h-0 flex-1 flex-col gap-4'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
              <div className='space-y-1'>
                <Label htmlFor='patrol-filter-from'>Dari tanggal</Label>
                <Input
                  id='patrol-filter-from'
                  type='date'
                  className='w-full sm:w-44'
                  value={fromFilter ?? ''}
                  onChange={(e) =>
                    handleDateFilterChange('from', e.target.value)
                  }
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='patrol-filter-to'>Sampai tanggal</Label>
                <Input
                  id='patrol-filter-to'
                  type='date'
                  className='w-full sm:w-44'
                  value={toFilter ?? ''}
                  onChange={(e) => handleDateFilterChange('to', e.target.value)}
                />
              </div>
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
                        <TableCell colSpan={5} className='h-24 text-center'>
                          Tidak ada jadwal ronda.
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

      <PatrolFormDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(state) => {
          if (!state) setDeleteTarget(null)
        }}
        handleConfirm={() => {
          if (!deleteTarget) return
          deletePatrol.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
        disabled={deletePatrol.isPending}
        title='Hapus Jadwal'
        desc={`Apakah Anda yakin ingin menghapus jadwal ronda tanggal ${deleteTarget ? formatPatrolDate(deleteTarget.date) : ''}?`}
        confirmText='Hapus'
        destructive
      />
    </>
  )
}

export function PatrolsPage() {
  return <PatrolsPageInner />
}
