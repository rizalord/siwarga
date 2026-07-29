import { useEffect, useState } from 'react'
import {
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Bill, TrashedFilterValue } from '@/types/api'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  useBulkDeleteBills,
  useBulkForceDeleteBills,
  useBulkRestoreBills,
} from '@/hooks/use-bills'
import { useDueTypes } from '@/hooks/use-due-types'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableBulkActions,
  DataTablePagination,
  DataTableToolbar,
  TrashedFilter,
} from '@/components/data-table'
import { MultiDeleteDialog } from '@/components/multi-delete-dialog'
import { billsColumns as columns } from './bills-columns'

const EMPTY_PERMISSIONS: string[] = []

const statusOptions = [
  { label: 'Lunas', value: 'lunas' },
  { label: 'Belum Lunas', value: 'belum_lunas' },
]

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(0, i).toLocaleDateString('id-ID', { month: 'long' }),
  value: String(i + 1),
}))

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const year = currentYear - 2 + i
  return { label: String(year), value: String(year) }
})

type DataTableProps = {
  data: Bill[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown> & { trashed?: TrashedFilterValue }
  navigate: NavigateFn
}

export function BillsTable({
  data,
  pageCount,
  isFetching,
  search,
  navigate,
}: DataTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [multiDeleteOpen, setMultiDeleteOpen] = useState(false)
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false)
  const [bulkForceDeleteOpen, setBulkForceDeleteOpen] = useState(false)

  const bulkDeleteBills = useBulkDeleteBills()
  const bulkRestoreBills = useBulkRestoreBills()
  const bulkForceDeleteBills = useBulkForceDeleteBills()
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
  )
  const canManageTrash = permissions.includes('bills.trash')
  const trashedFilter = search.trashed
  const isOnlyTrashed = trashedFilter === 'only'

  const { data: dueTypesData } = useDueTypes({ per_page: 100 })
  const dueTypeOptions = (dueTypesData?.data ?? []).map((dueType) => ({
    label: dueType.name,
    value: String(dueType.id),
  }))

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
    columnFilters: [
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: 'month', searchKey: 'month', type: 'string' },
      { columnId: 'year', searchKey: 'year', type: 'string' },
      { columnId: 'due_type', searchKey: 'due_type_id', type: 'array' },
    ],
    sorting: {},
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: columns(),
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
        searchPlaceholder='Cari penghuni atau rumah...'
        filters={[
          {
            columnId: 'month',
            title: 'Bulan',
            options: monthOptions,
          },
          {
            columnId: 'year',
            title: 'Tahun',
            options: yearOptions,
          },
          {
            columnId: 'status',
            title: 'Status',
            options: statusOptions,
          },
          {
            columnId: 'due_type',
            title: 'Jenis Iuran',
            options: dueTypeOptions,
          },
        ]}
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
                    colSpan={columns().length}
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
        <DataTableBulkActions table={table} entityName='tagihan'>
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
        entityLabel='tagihan'
        deletionType='soft'
        isLoading={bulkDeleteBills.isPending}
        onConfirm={() => {
          bulkDeleteBills.mutate(selectedIds, {
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
          bulkRestoreBills.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkRestoreOpen(false))
            },
          })
        }}
        disabled={bulkRestoreBills.isPending}
        isLoading={bulkRestoreBills.isPending}
        title='Pulihkan Tagihan'
        desc={
          <p>
            Apakah Anda yakin ingin memulihkan {selectedIds.length} tagihan
            terpilih?
          </p>
        }
        confirmText='Pulihkan'
      />
      <MultiDeleteDialog
        open={bulkForceDeleteOpen}
        onOpenChange={setBulkForceDeleteOpen}
        selectedCount={selectedIds.length}
        entityLabel='tagihan'
        isLoading={bulkForceDeleteBills.isPending}
        onConfirm={() => {
          bulkForceDeleteBills.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkForceDeleteOpen(false))
            },
          })
        }}
      />
    </div>
  )
}
