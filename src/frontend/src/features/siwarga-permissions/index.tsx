import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Permission } from '@/types/api'
import { AlertTriangle, Plus } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { useDeletePermission, usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useHasPermission } from '@/hooks/use-permission'
import { PermissionFormDialog } from './permission-form'
import { PermissionsTable } from './permissions-table'

const route = getRouteApi('/_authenticated/permissions/')

function PermissionsDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: Permission | null
  setCurrentRow: (row: Permission | null) => void
}) {
  const deletePermission = useDeletePermission()

  const handleDelete = () => {
    if (!currentRow) return
    deletePermission.mutate(currentRow.id, {
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
      <PermissionFormDialog
        key='permission-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <PermissionFormDialog
            key={`permission-update-${currentRow.id}`}
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
            key={`permission-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleDelete}
            disabled={deletePermission.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Permission
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.name}</span>?
                <br />
                Permission ini akan otomatis lepas dari semua role yang
                memilikinya.
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

function PermissionsPageInner() {
  const canManage = useHasPermission('users.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = usePermissions({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<'create' | 'update' | 'delete'>(null)
  const [currentRow, setCurrentRow] = useState<Permission | null>(null)

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
            <h2 className='text-2xl font-bold tracking-tight'>Permission</h2>
            <p className='text-muted-foreground'>
              Kelola daftar permission yang bisa ditugaskan ke role.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setOpen('create')}>
              <span>Tambah Permission</span> <Plus size={18} />
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <PermissionsTable
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

      <PermissionsDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function PermissionsPage() {
  return <PermissionsPageInner />
}
