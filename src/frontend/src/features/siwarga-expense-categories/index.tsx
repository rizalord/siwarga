import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { ExpenseCategory } from '@/types/api'
import { AlertTriangle, Plus } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import {
  useExpenseCategories,
  useDeleteExpenseCategory,
} from '@/hooks/use-expense-categories'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ExpenseCategoryFormDialog } from './expense-category-form'
import { ExpenseCategoriesTable } from './expense-categories-table'

const route = getRouteApi('/_authenticated/expense-categories/')

function ExpenseCategoriesDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: ExpenseCategory | null
  setCurrentRow: (row: ExpenseCategory | null) => void
}) {
  const deleteExpenseCategory = useDeleteExpenseCategory()

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
                Tindakan ini akan menghapus kategori pengeluaran secara permanen
                dan tidak dapat dibatalkan.
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

function ExpenseCategoriesPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useExpenseCategories({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<'create' | 'update' | 'delete'>(null)
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
          <Button className='space-x-1' onClick={() => setOpen('create')}>
            <span>Tambah Kategori</span> <Plus size={18} />
          </Button>
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
