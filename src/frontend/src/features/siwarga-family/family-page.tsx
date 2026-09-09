import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import type { FamilyMember, FamilyRelationship } from '@/types/api'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useCreateMember,
  useDeleteMember,
  useFamilyMembers,
  useHouseholdCard,
  useUpdateMember,
} from '@/hooks/use-family'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
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

const route = getRouteApi('/_authenticated/family/')

const RELATIONSHIP_LABELS: Record<FamilyRelationship, string> = {
  kepala_keluarga: 'Kepala Keluarga',
  pasangan: 'Pasangan',
  anak: 'Anak',
  orang_tua: 'Orang Tua',
  famili_lain: 'Famili Lain',
  pembantu: 'Pembantu',
  kontrak: 'Kontrak',
}

function formatMemberDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function HouseholdCardSection() {
  const { data, isLoading, isError, refetch } = useHouseholdCard()
  const card = data?.data

  const handleCopyVerifyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Tautan verifikasi disalin')
    } catch {
      toast.error('Gagal menyalin tautan')
    }
  }

  return (
    <section aria-label='Kartu keluarga'>
      {isLoading ? (
        <Card>
          <CardContent className='py-8'>
            <p className='text-muted-foreground'>Memuat kartu keluarga...</p>
          </CardContent>
        </Card>
      ) : isError || !card ? (
        <Card>
          <CardHeader>
            <CardTitle>Kartu Keluarga</CardTitle>
            <CardDescription>
              Kartu keluarga belum tersedia untuk akun Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant='outline' size='sm' onClick={() => refetch()}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Kartu Keluarga {card.house_number}</CardTitle>
            <CardDescription>
              {card.head_name} · {card.member_count} anggota
              {card.address ? ` · ${card.address}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <QRCodeSVG
              value={`${window.location.origin}/verifikasi-keluarga/${card.verify_token}`}
              size={160}
              aria-label={`Kode QR kartu keluarga ${card.house_number}`}
            />
            <div className='flex flex-col gap-1 text-sm'>
              <p>
                <span className='text-muted-foreground'>Kepala keluarga: </span>
                <span className='font-medium'>{card.head_name}</span>
              </p>
              <p>
                <span className='text-muted-foreground'>Nomor rumah: </span>
                <span className='font-medium'>{card.house_number}</span>
              </p>
              <p>
                <span className='text-muted-foreground'>Alamat: </span>
                <span className='font-medium'>{card.address ?? '—'}</span>
              </p>
              <p>
                <span className='text-muted-foreground'>Jumlah anggota: </span>
                <span className='font-medium'>{card.member_count}</span>
              </p>
              <div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    handleCopyVerifyUrl(
                      `${window.location.origin}/verifikasi-keluarga/${card.verify_token}`
                    )
                  }
                >
                  <Copy size={16} /> Salin tautan verifikasi
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

type MemberColumnsProps = {
  onEdit: (member: FamilyMember) => void
  onDelete: (member: FamilyMember) => void
}

function memberColumns({
  onEdit,
  onDelete,
}: MemberColumnsProps): ColumnDef<FamilyMember>[] {
  return [
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama' />
      ),
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <p className='font-medium'>{row.original.name}</p>
          {row.original.house_number && (
            <p className='text-sm text-muted-foreground'>
              {row.original.house_number}
            </p>
          )}
        </div>
      ),
      meta: { label: 'Nama' },
    },
    {
      id: 'relationship',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Hubungan' />
      ),
      accessorKey: 'relationship',
      cell: ({ row }) => (
        <Badge variant='outline'>
          {RELATIONSHIP_LABELS[row.original.relationship]}
        </Badge>
      ),
      meta: { label: 'Hubungan' },
    },
    {
      id: 'nik',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='NIK' />
      ),
      accessorKey: 'nik',
      cell: ({ row }) => (
        <code className='font-mono text-sm'>{row.original.nik ?? '—'}</code>
      ),
      meta: { label: 'NIK' },
    },
    {
      id: 'birth_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tanggal Lahir' />
      ),
      accessorKey: 'birth_date',
      cell: ({ row }) => formatMemberDate(row.original.birth_date),
      meta: { label: 'Tanggal Lahir' },
    },
    {
      id: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Telepon' />
      ),
      accessorKey: 'phone',
      cell: ({ row }) => row.original.phone ?? '—',
      meta: { label: 'Telepon' },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              aria-label={`Ubah ${member.name}`}
              onClick={() => onEdit(member)}
            >
              <Pencil size={16} /> Ubah
            </Button>
            <Button
              variant='outline'
              size='sm'
              aria-label={`Hapus ${member.name}`}
              onClick={() => onDelete(member)}
            >
              <Trash2 size={16} /> Hapus
            </Button>
          </div>
        )
      },
    },
  ]
}

function MemberFormDialog({
  open,
  onOpenChange,
  initial,
  canManage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: FamilyMember | null
  canManage: boolean
}) {
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const [name, setName] = useState(initial?.name ?? '')
  const [relationship, setRelationship] = useState<FamilyRelationship>(
    initial?.relationship ?? 'anak'
  )
  const [nik, setNik] = useState(initial?.nik ?? '')
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [houseId, setHouseId] = useState(
    initial ? String(initial.house_id) : ''
  )

  const pending = createMember.isPending || updateMember.isPending
  const canSubmit = name.trim().length > 0 && !pending

  const reset = () => {
    setName(initial?.name ?? '')
    setRelationship(initial?.relationship ?? 'anak')
    setNik(initial?.nik ?? '')
    setBirthDate(initial?.birth_date ?? '')
    setPhone(initial?.phone ?? '')
    setHouseId(initial ? String(initial.house_id) : '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const input = {
      name: name.trim(),
      relationship,
      ...(nik.trim() ? { nik: nik.trim() } : {}),
      ...(birthDate ? { birth_date: birthDate } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(canManage && houseId.trim() ? { house_id: Number(houseId) } : {}),
    }
    if (initial) {
      updateMember.mutate(
        { id: initial.id, input },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createMember.mutate(input, {
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
            {initial ? 'Ubah Anggota Keluarga' : 'Tambah Anggota Keluarga'}
          </DialogTitle>
          <DialogDescription>
            Lengkapi data anggota keluarga untuk kartu keluarga rumah Anda.
          </DialogDescription>
        </DialogHeader>
        <form
          id='member-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='member-name'>Nama *</Label>
            <Input
              id='member-name'
              placeholder='Nama lengkap anggota'
              autoComplete='off'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='member-relationship'>Hubungan *</Label>
              <Select
                value={relationship}
                onValueChange={(value) =>
                  setRelationship(value as FamilyRelationship)
                }
              >
                <SelectTrigger id='member-relationship'>
                  <SelectValue placeholder='Hubungan' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='kepala_keluarga'>
                    Kepala Keluarga
                  </SelectItem>
                  <SelectItem value='pasangan'>Pasangan</SelectItem>
                  <SelectItem value='anak'>Anak</SelectItem>
                  <SelectItem value='orang_tua'>Orang Tua</SelectItem>
                  <SelectItem value='famili_lain'>Famili Lain</SelectItem>
                  <SelectItem value='pembantu'>Pembantu</SelectItem>
                  <SelectItem value='kontrak'>Kontrak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='member-nik'>NIK</Label>
              <Input
                id='member-nik'
                placeholder='16 digit NIK'
                autoComplete='off'
                inputMode='numeric'
                pattern='[0-9]{16}'
                maxLength={16}
                title='NIK harus 16 digit angka'
                value={nik}
                onChange={(e) => setNik(e.target.value)}
              />
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='member-birth-date'>Tanggal lahir</Label>
              <Input
                id='member-birth-date'
                type='date'
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='member-phone'>Telepon</Label>
              <Input
                id='member-phone'
                placeholder='Nomor telepon'
                autoComplete='off'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          {canManage && (
            <div className='space-y-2'>
              <Label htmlFor='member-house'>ID rumah</Label>
              <Input
                id='member-house'
                type='number'
                min={1}
                placeholder='ID rumah'
                value={houseId}
                onChange={(e) => setHouseId(e.target.value)}
              />
            </div>
          )}
        </form>
        <DialogFooter>
          <Button type='submit' form='member-form' disabled={!canSubmit}>
            {pending ? 'Menyimpan...' : 'Simpan Anggota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FamilyPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const canManage = useHasPermission('family-members.manage')
  const deleteMember = useDeleteMember()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null)
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all')

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
    columnFilters: [],
    sorting: {},
  })

  const { data, isLoading, isFetching, isError, refetch } = useFamilyMembers({
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
    search: globalFilter ? globalFilter : undefined,
    relationship:
      relationshipFilter === 'all'
        ? undefined
        : (relationshipFilter as FamilyRelationship),
  })

  const pageCount = data?.last_page ?? 1

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.data ?? [],
    columns: memberColumns({
      onEdit: (member) => {
        setEditing(member)
        setDialogOpen(true)
      },
      onDelete: setDeleteTarget,
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
            <h2 className='text-2xl font-bold tracking-tight'>
              Kartu Keluarga
            </h2>
            <p className='text-muted-foreground'>
              Kartu keluarga digital dan daftar anggota keluarga rumah Anda.
            </p>
          </div>
          <Button
            className='space-x-1'
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <span>Tambah Anggota</span> <Plus size={18} />
          </Button>
        </div>

        <HouseholdCardSection />

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
            <DataTableToolbar
              table={table}
              searchPlaceholder='Cari anggota...'
            />
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <Select
                value={relationshipFilter}
                onValueChange={setRelationshipFilter}
              >
                <SelectTrigger
                  aria-label='Filter hubungan'
                  className='w-full sm:w-44'
                >
                  <SelectValue placeholder='Hubungan' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua hubungan</SelectItem>
                  <SelectItem value='kepala_keluarga'>
                    Kepala Keluarga
                  </SelectItem>
                  <SelectItem value='pasangan'>Pasangan</SelectItem>
                  <SelectItem value='anak'>Anak</SelectItem>
                  <SelectItem value='orang_tua'>Orang Tua</SelectItem>
                  <SelectItem value='famili_lain'>Famili Lain</SelectItem>
                  <SelectItem value='pembantu'>Pembantu</SelectItem>
                  <SelectItem value='kontrak'>Kontrak</SelectItem>
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
                          Tidak ada anggota keluarga.
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

      <MemberFormDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        canManage={canManage}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(state) => {
          if (!state) setDeleteTarget(null)
        }}
        handleConfirm={() => {
          if (!deleteTarget) return
          deleteMember.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
        disabled={deleteMember.isPending}
        title='Hapus Anggota'
        desc={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}" dari kartu keluarga?`}
        confirmText='Hapus'
        destructive
      />
    </>
  )
}

export function FamilyPage() {
  return <FamilyPageInner />
}
