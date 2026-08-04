import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Role } from '@/types/api'
import { AlertTriangle, Plus } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { useDeleteRole, useRoles } from '@/hooks/use-roles'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useHasPermission } from '@/hooks/use-permission'
import { RoleFormDialog } from './role-form'
import { RolesTable } from './roles-table'

const route = getRouteApi('/_authenticated/roles/')

function RolesDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: Role | null
  setCurrentRow: (row: Role | null) => void
}) {
  const deleteRole = useDeleteRole()

  const handleDelete = () => {
    if (!currentRow) return
    deleteRole.mutate(currentRow.id, {
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
      <RoleFormDialog
        key='role-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <RoleFormDialog
            key={`role-update-${currentRow.id}`}
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
            key={`role-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteRole.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Role
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.name}</span>?
                <br />
                Tindakan ini akan menghapus role secara permanen dan tidak
                dapat dibatalkan.
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

function RolesPageInner() {
  const canManage = useHasPermission('users.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useRoles({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<'create' | 'update' | 'delete'>(null)
  const [currentRow, setCurrentRow] = useState<Role | null>(null)

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
            <h2 className='text-2xl font-bold tracking-tight'>Role</h2>
            <p className='text-muted-foreground'>
              Kelola role dan hak akses pengguna di sini.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setOpen('create')}>
              <span>Tambah Role</span> <Plus size={18} />
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <RolesTable
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

      <RolesDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function RolesPage() {
  return <RolesPageInner />
}
