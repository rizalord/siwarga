import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Main } from '@/components/layout/main'
import { ConfirmDialog } from '@/components/confirm-dialog'
import useDialogState from '@/hooks/use-dialog-state'
import { useUsers, useDeleteUser } from '@/hooks/use-users'
import type { User } from '@/types/api'
import { UserFormDialog } from './components/user-form'
import { UsersTable } from './components/users-table'

const route = getRouteApi('/_authenticated/users/')

function UsersDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: User | null
  setCurrentRow: (row: User | null) => void
}) {
  const deleteUser = useDeleteUser()

  const handleDelete = () => {
    if (!currentRow) return
    deleteUser.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => {
          setCurrentRow(null)
        }, 500)
      },
    })
  }

  return (
    <>
      <UserFormDialog
        key='user-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <UserFormDialog
            key={`user-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key={`user-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteUser.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Pengguna
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.name}</span>?
                <br />
                Tindakan ini akan menghapus pengguna secara permanen dan
                tidak dapat dibatalkan.
              </p>
            }
            confirmText='Hapus'
            destructive
          />
        </>
      )}
    </>
  )
}

function UsersPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useUsers({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<'create' | 'update' | 'delete'>(null)
  const [currentRow, setCurrentRow] = useState<User | null>(null)

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
              Pengguna
            </h2>
            <p className='text-muted-foreground'>
              Kelola pengguna sistem di sini.
            </p>
          </div>
          <Button className='space-x-1' onClick={() => setOpen('create')}>
            <span>Tambah Pengguna</span> <Plus size={18} />
          </Button>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <UsersTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
            setOpen={setOpen}
            setCurrentRow={setCurrentRow}
          />
        )}
      </Main>

      <UsersDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function Users() {
  return <UsersPageInner />
}
