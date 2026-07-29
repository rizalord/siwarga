import { useEffect, useState } from 'react'
import {
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ExpenseCategory, TrashedFilterValue } from '@/types/api'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  useBulkDeleteExpenseCategories,
  useBulkForceDeleteExpenseCategories,
  useBulkRestoreExpenseCategories,
} from '@/hooks/use-expense-categories'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTableBulkActions,
  DataTablePagination,
  DataTableToolbar,
  TrashedFilter,
} from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { MultiDeleteDialog } from '@/components/multi-delete-dialog'
import { expenseCategoriesColumns as columns } from './expense-categories-columns'

const EMPTY_PERMISSIONS: string[] = []

type DataTableProps = {
  data: ExpenseCategory[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown> & { trashed?: TrashedFilterValue }
  navigate: NavigateFn
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  setCurrentRow: (row: ExpenseCategory | null) => void
}

export function ExpenseCategoriesTable({
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

  const bulkDeleteExpenseCategories = useBulkDeleteExpenseCategories()
  const bulkRestoreExpenseCategories = useBulkRestoreExpenseCategories()
  const bulkForceDeleteExpenseCategories =
    useBulkForceDeleteExpenseCategories()
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
  )
  const canManageTrash = permissions.includes('expense-categories.trash')
  const trashedFilter = search.trashed
  const isOnlyTrashed = trashedFilter === 'only'

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

  const handleTrashedChange = (value: TrashedFilterValue | undefined) => {
    navigate({
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        page: 1,
        trashed: value,
      }),
    })
  }

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
      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari kategori pengeluaran...'
      >
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
        <DataTableBulkActions table={table} entityName='kategori pengeluaran'>
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
        entityLabel='kategori pengeluaran'
        deletionType='soft'
        isLoading={bulkDeleteExpenseCategories.isPending}
        onConfirm={() => {
          bulkDeleteExpenseCategories.mutate(selectedIds, {
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
          bulkRestoreExpenseCategories.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkRestoreOpen(false))
            },
          })
        }}
        disabled={bulkRestoreExpenseCategories.isPending}
        isLoading={bulkRestoreExpenseCategories.isPending}
        title='Pulihkan Kategori Pengeluaran'
        desc={
          <p>
            Apakah Anda yakin ingin memulihkan {selectedIds.length} kategori
            pengeluaran yang dipilih?
          </p>
        }
        confirmText='Pulihkan'
      />
      <MultiDeleteDialog
        open={bulkForceDeleteOpen}
        onOpenChange={setBulkForceDeleteOpen}
        selectedCount={selectedIds.length}
        entityLabel='kategori pengeluaran'
        deletionType='permanent'
        isLoading={bulkForceDeleteExpenseCategories.isPending}
        onConfirm={() => {
          bulkForceDeleteExpenseCategories.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkForceDeleteOpen(false))
            },
          })
        }}
      />
    </div>
  )
}
