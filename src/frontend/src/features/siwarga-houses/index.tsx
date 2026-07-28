import { getRouteApi } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Main } from '@/components/layout/main'
import { useHouses } from '@/hooks/use-houses'
import { HouseAssignDialog } from './house-assign-dialog'
import { HouseDeleteDialog } from './house-delete-dialog'
import { HouseFormDialog } from './house-form'
import { HousesProvider, useHousesContext } from './houses-provider'
import { HousesTable } from './houses-table'

const route = getRouteApi('/_authenticated/houses/')

function HousesPrimaryButtons() {
  const { setOpen } = useHousesContext()
  return (
    <Button className='space-x-1' onClick={() => setOpen('create')}>
      <span>Tambah Rumah</span> <Plus size={18} />
    </Button>
  )
}

function HousesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useHousesContext()
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
  })

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Data Rumah
            </h2>
            <p className='text-muted-foreground'>
              Kelola data rumah di sini.
            </p>
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
