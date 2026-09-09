import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type {
  Asset,
  AssetCondition,
  AssetLoan,
  AssetLoanStatus,
} from '@/types/api'
import { Minus, Plus } from 'lucide-react'
import {
  useAssetLoans,
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useRequestAssetLoan,
  useReturnAssetLoan,
  useReviewAssetLoan,
} from '@/hooks/use-assets'
import { useHasPermission } from '@/hooks/use-permission'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/layout/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/assets/')

const CONDITION_LABELS: Record<AssetCondition, string> = {
  baik: 'Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
}

const LOAN_STATUS_LABELS: Record<AssetLoanStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
}

function availableOf(asset: Asset): number {
  return asset.available ?? asset.quantity
}

function AssetCard({
  asset,
  canManage,
  onBorrow,
  onDelete,
  deletePending,
}: {
  asset: Asset
  canManage: boolean
  onBorrow: (asset: Asset) => void
  onDelete: (asset: Asset) => void
  deletePending: boolean
}) {
  const available = availableOf(asset)
  return (
    <Card
      role='article'
      tabIndex={0}
      aria-label={`Aset ${asset.name}`}
    >
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge
            variant={asset.condition === 'baik' ? 'default' : 'secondary'}
          >
            {CONDITION_LABELS[asset.condition]}
          </Badge>
        </div>
        <CardTitle className='leading-snug'>{asset.name}</CardTitle>
        <CardDescription>
          Tersedia {available} dari {asset.quantity}
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-wrap gap-2'>
        <Button
          size='sm'
          disabled={available <= 0}
          onClick={() => onBorrow(asset)}
        >
          Pinjam
        </Button>
        {canManage && (
          <Button
            size='sm'
            variant='outline'
            aria-label={`Hapus ${asset.name}`}
            disabled={deletePending}
            onClick={() => onDelete(asset)}
          >
            Hapus
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function LoanCard({
  loan,
  canReview,
  isOwn,
  busy,
  onReview,
  onReturn,
}: {
  loan: AssetLoan
  canReview: boolean
  isOwn: boolean
  busy: boolean
  onReview: (loan: AssetLoan, action: 'approve' | 'reject') => void
  onReturn: (loan: AssetLoan) => void
}) {
  const isPending = loan.status === 'pending'
  const isApproved = loan.status === 'approved'
  return (
    <Card
      role='article'
      tabIndex={0}
      aria-label={`Peminjaman ${loan.asset_name ?? `#${loan.id}`} oleh ${loan.borrower_name ?? 'warga'}`}
    >
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge
            variant={loan.status === 'approved' ? 'default' : 'secondary'}
          >
            {LOAN_STATUS_LABELS[loan.status]}
          </Badge>
        </div>
        <CardTitle className='leading-snug'>
          {loan.asset_name ?? `Aset #${loan.asset_id}`} · {loan.quantity} unit
        </CardTitle>
        <CardDescription>
          {loan.borrower_name ?? 'Warga'}
        </CardDescription>
      </CardHeader>
      {(canReview && isPending) || ((isOwn || canReview) && isApproved) ? (
        <CardContent className='flex flex-wrap gap-2'>
          {canReview && isPending && (
            <>
              <Button
                size='sm'
                disabled={busy}
                onClick={() => onReview(loan, 'approve')}
              >
                Setujui
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={busy}
                onClick={() => onReview(loan, 'reject')}
              >
                Tolak
              </Button>
            </>
          )}
          {isApproved && (isOwn || canReview) && (
            <Button
              size='sm'
              variant='outline'
              disabled={busy}
              onClick={() => onReturn(loan)}
            >
              Kembalikan
            </Button>
          )}
        </CardContent>
      ) : null}
    </Card>
  )
}

function RequestLoanDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const requestLoan = useRequestAssetLoan()
  const max = asset ? availableOf(asset) : 1
  const [quantity, setQuantity] = useState(1)

  const clamp = (value: number) => {
    if (Number.isNaN(value)) return 1
    return Math.min(Math.max(1, Math.floor(value)), Math.max(1, max))
  }

  const canSubmit =
    asset != null && max > 0 && !requestLoan.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || asset == null) return
    requestLoan.mutate(
      { asset_id: asset.id, quantity: clamp(quantity) },
      {
        // Keep the draft on failure so the user does not lose their input.
        onSuccess: () => {
          setQuantity(1)
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Pinjam {asset?.name}</DialogTitle>
          <DialogDescription>
            {asset
              ? `Tersedia ${availableOf(asset)} dari ${asset.quantity}.`
              : 'Pilih jumlah unit yang ingin dipinjam.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id='asset-loan-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='asset-loan-quantity'>Jumlah</Label>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                aria-label='Kurangi jumlah'
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => clamp(q - 1))}
              >
                <Minus size={16} />
              </Button>
              <Input
                id='asset-loan-quantity'
                type='number'
                min={1}
                max={Math.max(1, max)}
                value={quantity}
                onChange={(e) => setQuantity(clamp(Number(e.target.value)))}
                className='text-center'
              />
              <Button
                type='button'
                variant='outline'
                size='icon'
                aria-label='Tambah jumlah'
                disabled={quantity >= max}
                onClick={() => setQuantity((q) => clamp(q + 1))}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            type='submit'
            form='asset-loan-form'
            disabled={!canSubmit}
          >
            {requestLoan.isPending ? 'Mengirim...' : 'Ajukan Pinjaman'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AssetFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createAsset = useCreateAsset()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [condition, setCondition] = useState<AssetCondition>('baik')

  const quantityNumber = Number(quantity)
  const canSubmit =
    name.trim().length > 0 &&
    Number.isInteger(quantityNumber) &&
    quantityNumber >= 1 &&
    !createAsset.isPending

  const reset = () => {
    setName('')
    setQuantity('1')
    setCondition('baik')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createAsset.mutate(
      { name: name.trim(), quantity: quantityNumber, condition },
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
          <DialogTitle>Tambah Aset</DialogTitle>
          <DialogDescription>
            Daftarkan aset inventaris baru yang bisa dipinjam warga.
          </DialogDescription>
        </DialogHeader>
        <form
          id='asset-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='asset-name'>Nama *</Label>
            <Input
              id='asset-name'
              placeholder='Nama aset'
              autoComplete='off'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='asset-quantity'>Jumlah *</Label>
              <Input
                id='asset-quantity'
                type='number'
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='asset-condition'>Kondisi</Label>
              <Select
                value={condition}
                onValueChange={(value) =>
                  setCondition(value as AssetCondition)
                }
              >
                <SelectTrigger id='asset-condition' className='w-full'>
                  <SelectValue placeholder='Kondisi' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='baik'>Baik</SelectItem>
                  <SelectItem value='rusak_ringan'>Rusak Ringan</SelectItem>
                  <SelectItem value='rusak_berat'>Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' form='asset-form' disabled={!canSubmit}>
            {createAsset.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AssetsPageInner() {
  const canManage = useHasPermission('assets.manage')
  const canReview = useHasPermission('asset-loans.review')
  const currentUserId = useAuthStore((state) => state.auth.user?.id)

  const search = route.useSearch()
  const navigate = route.useNavigate()

  const {
    data: assetsData,
    isLoading: assetsLoading,
    isError: assetsError,
    refetch: refetchAssets,
  } = useAssets({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
  })

  const [loanPage, setLoanPage] = useState(1)
  const {
    data: loansData,
    isLoading: loansLoading,
    isError: loansError,
    refetch: refetchLoans,
  } = useAssetLoans({
    status: search.status,
    page: loanPage,
    per_page: 10,
  })

  const reviewLoan = useReviewAssetLoan()
  const returnLoan = useReturnAssetLoan()
  const deleteAsset = useDeleteAsset()

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [borrowTarget, setBorrowTarget] = useState<Asset | null>(null)
  const [borrowOpen, setBorrowOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)

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
    setLoanPage(1)
    navigate({
      search: (prev) => ({
        ...prev,
        status: value === 'all' ? undefined : (value as AssetLoanStatus),
      }),
    })
  }

  const handleBorrow = (asset: Asset) => {
    setBorrowTarget(asset)
    setBorrowOpen(true)
  }

  const assetsCurrentPage = assetsData?.current_page ?? search.page ?? 1
  const assetsLastPage = assetsData?.last_page ?? 1
  const loansCurrentPage = loansData?.current_page ?? loanPage
  const loansLastPage = loansData?.last_page ?? 1

  const handleAssetsPageChange = (nextPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: nextPage <= 1 ? undefined : nextPage,
      }),
    })
  }

  const loanBusy = reviewLoan.isPending || returnLoan.isPending

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
            <h2 className='text-2xl font-bold tracking-tight'>
              Inventaris Aset
            </h2>
            <p className='text-muted-foreground'>
              Lihat stok aset RT dan kelola peminjaman warga.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setCreateOpen(true)}>
              <span>Tambah Aset</span> <Plus size={18} />
            </Button>
          )}
        </div>

        <section aria-label='Daftar aset' className='flex flex-col gap-3'>
          <h3 className='text-lg font-semibold tracking-tight'>
            Daftar Aset
          </h3>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <Input
              placeholder='Cari aset'
              aria-label='Cari aset'
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='sm:max-w-sm'
            />
          </div>

          {assetsLoading ? (
            <div className='flex flex-1 items-center justify-center rounded-md border py-12'>
              <p className='text-muted-foreground'>Memuat data...</p>
            </div>
          ) : assetsError ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
              <p className='text-muted-foreground'>Gagal memuat data.</p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => refetchAssets()}
              >
                Coba lagi
              </Button>
            </div>
          ) : (assetsData?.data ?? []).length === 0 ? (
            <div className='flex flex-1 items-center justify-center rounded-md border'>
              <p className='py-12 text-muted-foreground'>Tidak ada aset.</p>
            </div>
          ) : (
            <>
              <div className='grid gap-4 sm:grid-cols-2'>
                {(assetsData?.data ?? []).map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    canManage={canManage}
                    onBorrow={handleBorrow}
                    onDelete={setDeleteTarget}
                    deletePending={deleteAsset.isPending}
                  />
                ))}
              </div>

              <div className='flex items-center justify-between gap-2'>
                <p className='text-sm text-muted-foreground'>
                  Halaman {assetsCurrentPage} dari {assetsLastPage}
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={assetsCurrentPage <= 1}
                    onClick={() =>
                      handleAssetsPageChange(assetsCurrentPage - 1)
                    }
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={assetsCurrentPage >= assetsLastPage}
                    onClick={() =>
                      handleAssetsPageChange(assetsCurrentPage + 1)
                    }
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        <section aria-label='Daftar peminjaman' className='flex flex-col gap-3'>
          <h3 className='text-lg font-semibold tracking-tight'>
            Daftar Peminjaman
          </h3>

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
                <SelectItem value='pending'>Menunggu</SelectItem>
                <SelectItem value='approved'>Disetujui</SelectItem>
                <SelectItem value='rejected'>Ditolak</SelectItem>
                <SelectItem value='returned'>Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loansLoading ? (
            <div className='flex flex-1 items-center justify-center rounded-md border py-12'>
              <p className='text-muted-foreground'>Memuat data...</p>
            </div>
          ) : loansError ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
              <p className='text-muted-foreground'>Gagal memuat data.</p>
              <Button variant='outline' size='sm' onClick={() => refetchLoans()}>
                Coba lagi
              </Button>
            </div>
          ) : (loansData?.data ?? []).length === 0 ? (
            <div className='flex flex-1 items-center justify-center rounded-md border'>
              <p className='py-12 text-muted-foreground'>
                Tidak ada peminjaman.
              </p>
            </div>
          ) : (
            <>
              <div className='grid gap-4 sm:grid-cols-2'>
                {(loansData?.data ?? []).map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    canReview={canReview}
                    isOwn={
                      currentUserId != null &&
                      loan.borrowed_by === currentUserId
                    }
                    busy={loanBusy}
                    onReview={(target, action) =>
                      reviewLoan.mutate({ id: target.id, action })
                    }
                    onReturn={(target) => returnLoan.mutate(target.id)}
                  />
                ))}
              </div>

              <div className='flex items-center justify-between gap-2'>
                <p className='text-sm text-muted-foreground'>
                  Halaman {loansCurrentPage} dari {loansLastPage}
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={loansCurrentPage <= 1}
                    onClick={() => setLoanPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={loansCurrentPage >= loansLastPage}
                    onClick={() => setLoanPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </Main>

      <RequestLoanDialog
        key={borrowTarget?.id ?? 'none'}
        asset={borrowTarget}
        open={borrowOpen}
        onOpenChange={setBorrowOpen}
      />
      <AssetFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(state) => {
          if (!state) setDeleteTarget(null)
        }}
        handleConfirm={() => {
          if (!deleteTarget) return
          deleteAsset.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
        disabled={deleteAsset.isPending}
        title='Hapus Aset'
        desc={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"?`}
        confirmText='Hapus'
        destructive
      />
    </>
  )
}

export function AssetsPage() {
  return <AssetsPageInner />
}
