import { useEffect, useState } from 'react'
import {
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Bill } from '@/types/api'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBulkDeleteBills } from '@/hooks/use-bills'
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
} from '@/components/data-table'
import { MultiDeleteDialog } from '@/components/multi-delete-dialog'
import { billsColumns as columns } from './bills-columns'

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
  search: Record<string, unknown>
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

  const bulkDeleteBills = useBulkDeleteBills()

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
        ]}
      />
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
      <DataTableBulkActions table={table} entityName='tagihan'>
        <Button
          variant='destructive'
          size='sm'
          className='h-7'
          onClick={() => setMultiDeleteOpen(true)}
        >
          <Trash2 />
          Hapus
        </Button>
      </DataTableBulkActions>
      <MultiDeleteDialog
        open={multiDeleteOpen}
        onOpenChange={setMultiDeleteOpen}
        selectedCount={selectedIds.length}
        entityLabel='tagihan'
        isLoading={bulkDeleteBills.isPending}
        onConfirm={() => {
          bulkDeleteBills.mutate(selectedIds, {
            onSuccess: () => {
              setMultiDeleteOpen(false)
              table.resetRowSelection()
            },
          })
        }}
      />
    </div>
  )
}
