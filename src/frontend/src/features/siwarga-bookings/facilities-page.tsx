import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Facility } from '@/types/api'
import { Plus } from 'lucide-react'
import {
  useCreateFacility,
  useDeleteFacility,
  useFacilities,
} from '@/hooks/use-bookings'
import { useDueTypes } from '@/hooks/use-due-types'
import { useHasPermission } from '@/hooks/use-permission'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/facilities/')

function formatFee(fee: string | null): string {
  const amount = fee === null ? NaN : Number(fee)
  if (fee === null || Number.isNaN(amount) || amount <= 0) return 'Gratis'
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function FacilityFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createFacility = useCreateFacility()
  const { data: dueTypesData } = useDueTypes({ per_page: 100 })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rentalFee, setRentalFee] = useState('')
  const [dueTypeId, setDueTypeId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const canSubmit = name.trim().length > 0 && !createFacility.isPending

  const reset = () => {
    setName('')
    setDescription('')
    setRentalFee('')
    setDueTypeId('')
    setIsActive(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const feeNumber = rentalFee.trim() ? Number(rentalFee) : null
    createFacility.mutate(
      {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        rental_fee:
          feeNumber !== null && !Number.isNaN(feeNumber) ? feeNumber : null,
        due_type_id: dueTypeId ? Number(dueTypeId) : null,
        is_active: isActive,
      },
      {
        // Keep the draft on failure so the user does not lose their input.
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Tambah Fasilitas</DialogTitle>
          <DialogDescription>
            Daftarkan fasilitas baru yang bisa dibooking warga.
          </DialogDescription>
        </DialogHeader>
        <form
          id='facility-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='facility-name'>Nama *</Label>
            <Input
              id='facility-name'
              placeholder='Nama fasilitas'
              autoComplete='off'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='facility-description'>Deskripsi</Label>
            <Textarea
              id='facility-description'
              placeholder='Deskripsi fasilitas (opsional)'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='facility-fee'>Biaya sewa (Rp)</Label>
              <Input
                id='facility-fee'
                type='number'
                min={0}
                placeholder='0 = gratis'
                value={rentalFee}
                onChange={(e) => setRentalFee(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='facility-due-type'>Petakan ke iuran</Label>
              <Select value={dueTypeId} onValueChange={setDueTypeId}>
                <SelectTrigger id='facility-due-type' className='w-full'>
                  <SelectValue placeholder='Tanpa pemetaan' />
                </SelectTrigger>
                <SelectContent>
                  {(dueTypesData?.data ?? []).map((dueType) => (
                    <SelectItem key={dueType.id} value={String(dueType.id)}>
                      {dueType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Switch
              id='facility-is-active'
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor='facility-is-active'>Aktif</Label>
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' form='facility-form' disabled={!canSubmit}>
            {createFacility.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FacilitiesPageInner() {
  const canManage = useHasPermission('facilities.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isError, refetch } = useFacilities({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
  })
  const deleteFacility = useDeleteFacility()

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null)

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    navigate({
      search: (prev) => ({
        ...prev,
        search: value ? value : undefined,
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
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Kelola Fasilitas
            </h2>
            <p className='text-muted-foreground'>
              Tambah dan kelola fasilitas yang bisa dibooking warga.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setCreateOpen(true)}>
              <span>Tambah Fasilitas</span> <Plus size={18} />
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
                Anda tidak memiliki izin untuk mengelola fasilitas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <Input
                placeholder='Cari fasilitas'
                aria-label='Cari fasilitas'
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className='sm:max-w-sm'
              />
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
                  Tidak ada fasilitas.
                </p>
              </div>
            ) : (
              <>
                <div className='overflow-hidden rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Biaya</TableHead>
                        <TableHead>Iuran</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.data ?? []).map((facility) => (
                        <TableRow key={facility.id}>
                          <TableCell>
                            <div className='font-medium'>{facility.name}</div>
                            {facility.description && (
                              <div className='text-sm text-muted-foreground'>
                                {facility.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className='whitespace-nowrap'>
                            {formatFee(facility.rental_fee)}
                          </TableCell>
                          <TableCell>
                            {facility.due_type_name ?? (
                              <span className='text-muted-foreground'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                facility.is_active ? 'default' : 'secondary'
                              }
                            >
                              {facility.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button
                              variant='outline'
                              size='sm'
                              aria-label={`Hapus ${facility.name}`}
                              disabled={deleteFacility.isPending}
                              onClick={() => setDeleteTarget(facility)}
                            >
                              Hapus
                            </Button>
                          </TableCell>
                        </TableRow>
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

      <FacilityFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(state) => {
          if (!state) setDeleteTarget(null)
        }}
        handleConfirm={() => {
          if (!deleteTarget) return
          deleteFacility.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
        disabled={deleteFacility.isPending}
        title='Hapus Fasilitas'
        desc={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"?`}
        confirmText='Hapus'
        destructive
      />
    </>
  )
}

export function FacilitiesPage() {
  return <FacilitiesPageInner />
}
