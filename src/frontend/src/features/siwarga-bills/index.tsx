import { getRouteApi } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import {
  useBills,
  useDeleteBill,
  useForceDeleteBill,
  useRestoreBill,
} from '@/hooks/use-bills'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { BillsGenerateButton } from './bills-generate-button'
import { BillsProvider, useBillsContext } from './bills-provider'
import { BillsTable } from './bills-table'

const route = getRouteApi('/_authenticated/bills/')

function BillsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useBillsContext()
  const deleteBill = useDeleteBill()
  const restoreBill = useRestoreBill()
  const forceDeleteBill = useForceDeleteBill()

  return (
    <>
      {currentRow && (
        <>
          <ConfirmDialog
            key={`bill-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              deleteBill.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={deleteBill.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Tagihan
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus tagihan ini?
                <br />
                Tindakan ini akan memindahkan tagihan ke data terhapus.
              </p>
            }
            confirmText='Hapus'
            destructive
          />

          <ConfirmDialog
            key={`bill-restore-${currentRow.id}`}
            open={open === 'restore'}
            onOpenChange={() => {
              setOpen('restore')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              restoreBill.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={restoreBill.isPending}
            isLoading={restoreBill.isPending}
            title='Pulihkan Tagihan'
            desc={<p>Apakah Anda yakin ingin memulihkan tagihan ini?</p>}
            confirmText='Pulihkan'
          />

          <ConfirmDialog
            key={`bill-force-delete-${currentRow.id}`}
            open={open === 'force-delete'}
            onOpenChange={() => {
              setOpen('force-delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              forceDeleteBill.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={forceDeleteBill.isPending}
            isLoading={forceDeleteBill.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Permanen Tagihan
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus permanen tagihan ini?
                <br />
                Tindakan ini tidak dapat dibatalkan.
              </p>
            }
            confirmText='Hapus Permanen'
            destructive
          />
        </>
      )}
    </>
  )
}

function BillsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useBills({
    page: search.page,
    per_page: search.pageSize,
    month: search.month ? Number(search.month) : undefined,
    year: search.year ? Number(search.year) : undefined,
    status: search.status,
    due_type_id: search.due_type_id,
    search: search.search,
    trashed: search.trashed,
    sort: search.sort,
    order: search.order,
  })

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
            <h2 className='text-2xl font-bold tracking-tight'>Tagihan</h2>
            <p className='text-muted-foreground'>
              Kelola tagihan iuran di sini.
            </p>
          </div>
          <BillsGenerateButton />
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <BillsTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
          />
        )}
      </Main>

      <BillsDialogs />
    </>
  )
}

export function BillsPage() {
  return (
    <BillsProvider>
      <BillsPageInner />
    </BillsProvider>
  )
}
