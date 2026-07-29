import { useEffect, useState } from 'react'
import {
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Expense, TrashedFilterValue } from '@/types/api'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useExpenseCategories } from '@/hooks/use-expense-categories'
import {
  useBulkDeleteExpenses,
  useBulkForceDeleteExpenses,
  useBulkRestoreExpenses,
} from '@/hooks/use-expenses'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableBulkActions,
  DataTablePagination,
  DataTableToolbar,
  handleTrashedFilterChange,
  TrashedFilter,
} from '@/components/data-table'
import { MultiDeleteDialog } from '@/components/multi-delete-dialog'
import { expensesColumns as columns } from './expenses-columns'

const EMPTY_PERMISSIONS: string[] = []

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(0, i).toLocaleDateString('id-ID', { month: 'long' }),
  value: i + 1,
}))

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

type DataTableProps = {
  data: Expense[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown> & { trashed?: TrashedFilterValue }
  navigate: NavigateFn
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  setCurrentRow: (row: Expense | null) => void
}

export function ExpensesTable({
  data,
  pageCount,
  isFetching,
  search,
  navigate,
  setOpen,
  setCurrentRow,
}: DataTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [multiDeleteOpen, setMultiDeleteOpen] = useState(false)
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false)
  const [bulkForceDeleteOpen, setBulkForceDeleteOpen] = useState(false)

  const bulkDeleteExpenses = useBulkDeleteExpenses()
  const bulkRestoreExpenses = useBulkRestoreExpenses()
  const bulkForceDeleteExpenses = useBulkForceDeleteExpenses()
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
  )
  const canManageTrash = permissions.includes('expenses.trash')
  const trashedFilter = search.trashed
  const isOnlyTrashed = trashedFilter === 'only'

  const month = search.month as number | undefined
  const year = search.year as number | undefined
  const categoryId = search.category_id as number | undefined

  const { data: categoriesData } = useExpenseCategories({ per_page: 100 })
  const categories = categoriesData?.data ?? []

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: true, key: 'search' },
    sorting: {},
  })

  const handleMonthChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        month: value && value !== 'all' ? Number(value) : undefined,
        page: undefined,
      }),
    })
  }

  const handleYearChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        year: value && value !== 'all' ? Number(value) : undefined,
        page: undefined,
      }),
    })
  }

  const handleCategoryChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        category_id: value && value !== 'all' ? Number(value) : undefined,
        page: undefined,
      }),
    })
  }

  const handleTrashedChange = (value: TrashedFilterValue | undefined) => {
    handleTrashedFilterChange({
      value,
      clearRowSelection: () => setRowSelection({}),
      navigate,
    })
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: columns({ setOpen, setCurrentRow }),
    state: {
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination,
      sorting,
    },
    pageCount,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    onSortingChange,
  })

  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  const selectedIds = Object.keys(rowSelection)
    .filter((id) => rowSelection[id])
    .map(Number)

  const resetSelectionAfterSuccess = (onClose: () => void) => {
    onClose()
    table.resetRowSelection()
  }

  const shouldShowBulkActions = !isOnlyTrashed || canManageTrash

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4 overflow-hidden'
      )}
    >
      <DataTableToolbar table={table} searchPlaceholder='Cari pengeluaran...'>
        <Select
          value={categoryId ? String(categoryId) : 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className='h-8 w-37.5'>
            <SelectValue placeholder='Semua Kategori' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={month ? String(month) : 'all'}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className='h-8 w-37.5'>
            <SelectValue placeholder='Semua Bulan' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Semua Bulan</SelectItem>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={year ? String(year) : 'all'}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className='h-8 w-30'>
            <SelectValue placeholder='Semua Tahun' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Semua Tahun</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TrashedFilter value={trashedFilter} onChange={handleTrashedChange} />
      </DataTableToolbar>
      <div className='flex-1 overflow-auto'>
        <div
          className={cn(
            'rounded-md border transition-opacity',
            isFetching && 'opacity-60'
          )}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='group/row'>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          header.column.columnDef.meta?.className,
                          header.column.columnDef.meta?.thClassName
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='group/row'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          cell.column.columnDef.meta?.className,
                          cell.column.columnDef.meta?.tdClassName
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns({ setOpen, setCurrentRow }).length}
                    className='h-24 text-center'
                  >
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
      {shouldShowBulkActions && (
        <DataTableBulkActions table={table} entityName='pengeluaran'>
          {isOnlyTrashed ? (
            <>
              <Button
                size='sm'
                className='h-7'
                onClick={() => setBulkRestoreOpen(true)}
              >
                <RotateCcw />
                Pulihkan
              </Button>
              <Button
                variant='destructive'
                size='sm'
                className='h-7'
                onClick={() => setBulkForceDeleteOpen(true)}
              >
                <Trash2 />
                Hapus Permanen
              </Button>
            </>
          ) : (
            <Button
              variant='destructive'
              size='sm'
              className='h-7'
              onClick={() => setMultiDeleteOpen(true)}
            >
              <Trash2 />
              Hapus
            </Button>
          )}
        </DataTableBulkActions>
      )}
      <MultiDeleteDialog
        open={multiDeleteOpen}
        onOpenChange={setMultiDeleteOpen}
        selectedCount={selectedIds.length}
        entityLabel='pengeluaran'
        deletionType='soft'
        isLoading={bulkDeleteExpenses.isPending}
        onConfirm={() => {
          bulkDeleteExpenses.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setMultiDeleteOpen(false))
            },
          })
        }}
      />
      <ConfirmDialog
        open={bulkRestoreOpen}
        onOpenChange={setBulkRestoreOpen}
        handleConfirm={() => {
          bulkRestoreExpenses.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkRestoreOpen(false))
            },
          })
        }}
        disabled={bulkRestoreExpenses.isPending}
        isLoading={bulkRestoreExpenses.isPending}
        title='Pulihkan Pengeluaran'
        desc={
          <p>
            Apakah Anda yakin ingin memulihkan {selectedIds.length} pengeluaran
            terpilih?
          </p>
        }
        confirmText='Pulihkan'
      />
      <MultiDeleteDialog
        open={bulkForceDeleteOpen}
        onOpenChange={setBulkForceDeleteOpen}
        selectedCount={selectedIds.length}
        entityLabel='pengeluaran'
        isLoading={bulkForceDeleteExpenses.isPending}
        onConfirm={() => {
          bulkForceDeleteExpenses.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkForceDeleteOpen(false))
            },
          })
        }}
      />
    </div>
  )
}
