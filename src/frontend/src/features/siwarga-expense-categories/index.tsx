import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { ExpenseCategory } from '@/types/api'
import { AlertTriangle, Plus } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import {
  useExpenseCategories,
  useDeleteExpenseCategory,
  useForceDeleteExpenseCategory,
  useRestoreExpenseCategory,
} from '@/hooks/use-expense-categories'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useHasPermission } from '@/hooks/use-permission'
import { ExpenseCategoriesTable } from './expense-categories-table'
import { ExpenseCategoryFormDialog } from './expense-category-form'

const route = getRouteApi('/_authenticated/expense-categories/')

function ExpenseCategoriesDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  currentRow: ExpenseCategory | null
  setCurrentRow: (row: ExpenseCategory | null) => void
}) {
  const deleteExpenseCategory = useDeleteExpenseCategory()
  const restoreExpenseCategory = useRestoreExpenseCategory()
  const forceDeleteExpenseCategory = useForceDeleteExpenseCategory()

  const handleDelete = () => {
    if (!currentRow) return
    deleteExpenseCategory.mutate(currentRow.id, {
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
    restoreExpenseCategory.mutate(currentRow.id, {
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
    forceDeleteExpenseCategory.mutate(currentRow.id, {
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
      <ExpenseCategoryFormDialog
        key='expense-category-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <ExpenseCategoryFormDialog
            key={`expense-category-update-${currentRow.id}`}
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
            key={`expense-category-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteExpenseCategory.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Kategori Pengeluaran
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.name}</span>?
                <br />
                Tindakan ini akan memindahkan kategori pengeluaran ke data
                terhapus.
              </p>
            }
            confirmText='Hapus'
            destructive
          />

          <ConfirmDialog
            key={`expense-category-restore-${currentRow.id}`}
            open={open === 'restore'}
            onOpenChange={() => {
              setOpen('restore')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleRestore}
            disabled={restoreExpenseCategory.isPending}
            isLoading={restoreExpenseCategory.isPending}
            title='Pulihkan Kategori Pengeluaran'
            desc={
              <p>
                Apakah Anda yakin ingin memulihkan{' '}
                <span className='font-bold'>{currentRow.name}</span>?
              </p>
            }
            confirmText='Pulihkan'
          />

          <ConfirmDialog
            key={`expense-category-force-delete-${currentRow.id}`}
            open={open === 'force-delete'}
            onOpenChange={() => {
              setOpen('force-delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleForceDelete}
            disabled={forceDeleteExpenseCategory.isPending}
            isLoading={forceDeleteExpenseCategory.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Permanen Kategori Pengeluaran
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

function ExpenseCategoriesPageInner() {
  const canManage = useHasPermission('expense-categories.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useExpenseCategories({
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
  const [currentRow, setCurrentRow] = useState<ExpenseCategory | null>(null)

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
              Kategori Pengeluaran
            </h2>
            <p className='text-muted-foreground'>
              Kelola kategori pengeluaran di sini.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setOpen('create')}>
              <span>Tambah Kategori</span> <Plus size={18} />
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <ExpenseCategoriesTable
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

      <ExpenseCategoriesDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function ExpenseCategoriesPage() {
  return <ExpenseCategoriesPageInner />
}
