import { getRouteApi } from '@tanstack/react-router'
import { AlertTriangle, Plus } from 'lucide-react'
import {
  useForceDeleteHouse,
  useHouses,
  useRestoreHouse,
} from '@/hooks/use-houses'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useHasPermission } from '@/hooks/use-permission'
import { HouseAssignDialog } from './house-assign-dialog'
import { HouseDeleteDialog } from './house-delete-dialog'
import { HouseFormDialog } from './house-form'
import { HouseVacateDialog } from './house-vacate-dialog'
import { HousesProvider, useHousesContext } from './houses-provider'
import { HousesTable } from './houses-table'

const route = getRouteApi('/_authenticated/houses/')

function HousesPrimaryButtons() {
  const { setOpen } = useHousesContext()
  const canCreate = useHasPermission('houses.create')

  if (!canCreate) {
    return null
  }

  return (
    <Button className='space-x-1' onClick={() => setOpen('create')}>
      <span>Tambah Rumah</span> <Plus size={18} />
    </Button>
  )
}

function HousesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useHousesContext()
  const restoreHouse = useRestoreHouse()
  const forceDeleteHouse = useForceDeleteHouse()
  return (
    <>
      <HouseFormDialog
        key='house-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <HouseFormDialog
            key={`house-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <HouseDeleteDialog
            key={`house-delete-${currentRow.id}`}
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
            key={`house-restore-${currentRow.id}`}
            open={open === 'restore'}
            onOpenChange={() => {
              setOpen('restore')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              restoreHouse.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={restoreHouse.isPending}
            isLoading={restoreHouse.isPending}
            title='Pulihkan Rumah'
            desc={
              <p>
                Apakah Anda yakin ingin memulihkan{' '}
                <span className='font-bold'>{currentRow.house_number}</span>?
              </p>
            }
            confirmText='Pulihkan'
          />

          <ConfirmDialog
            key={`house-force-delete-${currentRow.id}`}
            open={open === 'force-delete'}
            onOpenChange={() => {
              setOpen('force-delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              forceDeleteHouse.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={forceDeleteHouse.isPending}
            isLoading={forceDeleteHouse.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Permanen Rumah
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus permanen{' '}
                <span className='font-bold'>{currentRow.house_number}</span>?
                <br />
                Tindakan ini tidak dapat dibatalkan.
              </p>
            }
            confirmText='Hapus Permanen'
            destructive
          />

          <HouseAssignDialog
            key={`house-assign-${currentRow.id}`}
            open={open === 'assign'}
            onOpenChange={() => {
              setOpen('assign')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <HouseVacateDialog
            key={`house-vacate-${currentRow.id}`}
            open={open === 'vacate'}
            onOpenChange={() => {
              setOpen('vacate')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}

function HousesPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useHouses({
    page: search.page,
    per_page: search.pageSize,
    status: search.status,
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
            <h2 className='text-2xl font-bold tracking-tight'>Data Rumah</h2>
            <p className='text-muted-foreground'>Kelola data rumah di sini.</p>
          </div>
          <HousesPrimaryButtons />
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <HousesTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
          />
        )}
      </Main>

      <HousesDialogs />
    </>
  )
}

export function HousesPage() {
  return (
    <HousesProvider>
      <HousesPageInner />
    </HousesProvider>
  )
}
