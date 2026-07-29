import { getRouteApi } from '@tanstack/react-router'
import { AlertTriangle, Plus } from 'lucide-react'
import {
  useResidents,
  useForceDeleteResident,
  useRestoreResident,
} from '@/hooks/use-residents'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ResidentDeleteDialog } from './resident-delete-dialog'
import { ResidentFormDialog } from './resident-form'
import { ResidentsProvider, useResidentsContext } from './residents-provider'
import { ResidentsTable } from './residents-table'

const route = getRouteApi('/_authenticated/residents/')

function ResidentsPrimaryButtons() {
  const { setOpen } = useResidentsContext()
  return (
    <Button className='space-x-1' onClick={() => setOpen('create')}>
      <span>Tambah Penghuni</span> <Plus size={18} />
    </Button>
  )
}

function ResidentsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useResidentsContext()
  const restoreResident = useRestoreResident()
  const forceDeleteResident = useForceDeleteResident()
  return (
    <>
      <ResidentFormDialog
        key='resident-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <ResidentFormDialog
            key={`resident-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ResidentDeleteDialog
            key={`resident-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key={`resident-restore-${currentRow.id}`}
            open={open === 'restore'}
            onOpenChange={() => {
              setOpen('restore')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              restoreResident.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={restoreResident.isPending}
            isLoading={restoreResident.isPending}
            title='Pulihkan Penghuni'
            desc={
              <p>
                Apakah Anda yakin ingin memulihkan{' '}
                <span className='font-bold'>{currentRow.full_name}</span>?
              </p>
            }
            confirmText='Pulihkan'
          />

          <ConfirmDialog
            key={`resident-force-delete-${currentRow.id}`}
            open={open === 'force-delete'}
            onOpenChange={() => {
              setOpen('force-delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              forceDeleteResident.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={forceDeleteResident.isPending}
            isLoading={forceDeleteResident.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Permanen Penghuni
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus permanen{' '}
                <span className='font-bold'>{currentRow.full_name}</span>?
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

function ResidentsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useResidents({
    page: search.page,
    per_page: search.pageSize,
    status: search.status,
    marital_status: search.marital_status,
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
            <h2 className='text-2xl font-bold tracking-tight'>Data Penghuni</h2>
            <p className='text-muted-foreground'>
              Kelola data penghuni di sini.
            </p>
          </div>
          <ResidentsPrimaryButtons />
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <ResidentsTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
          />
        )}
      </Main>

      <ResidentsDialogs />
    </>
  )
}

export function ResidentsPage() {
  return (
    <ResidentsProvider>
      <ResidentsPageInner />
    </ResidentsProvider>
  )
}
