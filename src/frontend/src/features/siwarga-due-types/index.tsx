import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { DueType } from '@/types/api'
import { AlertTriangle, Plus } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import {
  useDeleteDueType,
  useDueTypes,
  useForceDeleteDueType,
  useRestoreDueType,
} from '@/hooks/use-due-types'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useHasPermission } from '@/hooks/use-permission'
import { DueTypeFormDialog } from './due-type-form'
import { DueTypesTable } from './due-types-table'

const route = getRouteApi('/_authenticated/due-types/')

function DueTypesDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  currentRow: DueType | null
  setCurrentRow: (row: DueType | null) => void
}) {
  const deleteDueType = useDeleteDueType()
  const restoreDueType = useRestoreDueType()
  const forceDeleteDueType = useForceDeleteDueType()

  const handleDelete = () => {
    if (!currentRow) return
    deleteDueType.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => {
          setCurrentRow(null)
        }, 500)
      },
    })
  }

  const handleRestore = () => {
    if (!currentRow) return
    restoreDueType.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => {
          setCurrentRow(null)
        }, 500)
      },
    })
  }

  const handleForceDelete = () => {
    if (!currentRow) return
    forceDeleteDueType.mutate(currentRow.id, {
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
      <DueTypeFormDialog
        key='due-type-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <DueTypeFormDialog
            key={`due-type-update-${currentRow.id}`}
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
            key={`due-type-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteDueType.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Jenis Iuran
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.name}</span>?
                <br />
                Tindakan ini akan memindahkan jenis iuran ke data terhapus.
              </p>
            }
            confirmText='Hapus'
            destructive
          />

          <ConfirmDialog
            key={`due-type-restore-${currentRow.id}`}
            open={open === 'restore'}
            onOpenChange={() => {
              setOpen('restore')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleRestore}
            disabled={restoreDueType.isPending}
            isLoading={restoreDueType.isPending}
            title='Pulihkan Jenis Iuran'
            desc={
              <p>
                Apakah Anda yakin ingin memulihkan{' '}
                <span className='font-bold'>{currentRow.name}</span>?
              </p>
            }
            confirmText='Pulihkan'
          />

          <ConfirmDialog
            key={`due-type-force-delete-${currentRow.id}`}
            open={open === 'force-delete'}
            onOpenChange={() => {
              setOpen('force-delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleForceDelete}
            disabled={forceDeleteDueType.isPending}
            isLoading={forceDeleteDueType.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Permanen Jenis Iuran
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus permanen{' '}
                <span className='font-bold'>{currentRow.name}</span>?
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

function DueTypesPageInner() {
  const canManage = useHasPermission('due-types.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useDueTypes({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    trashed: search.trashed,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<
    'create' | 'update' | 'delete' | 'restore' | 'force-delete'
  >(null)
  const [currentRow, setCurrentRow] = useState<DueType | null>(null)

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
            <h2 className='text-2xl font-bold tracking-tight'>Jenis Iuran</h2>
            <p className='text-muted-foreground'>Kelola jenis iuran di sini.</p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setOpen('create')}>
              <span>Tambah Jenis Iuran</span> <Plus size={18} />
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <DueTypesTable
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

      <DueTypesDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function DueTypesPage() {
  return <DueTypesPageInner />
}
