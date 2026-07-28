import { useEffect, useState } from 'react'
import {
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { useBulkDeletePayments } from '@/hooks/use-payments'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  DataTableBulkActions,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { MultiDeleteDialog } from '@/components/multi-delete-dialog'
import type { Payment } from '@/types/api'
import { paymentsColumns as columns } from './payments-columns'

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(0, i).toLocaleDateString('id-ID', { month: 'long' }),
  value: i + 1,
}))

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

type DataTableProps = {
  data: Payment[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function PaymentsTable({
  data,
  pageCount,
  isFetching,
  search,
  navigate,
}: DataTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [multiDeleteOpen, setMultiDeleteOpen] = useState(false)

  const bulkDeletePayments = useBulkDeletePayments()

  const month = search.month as number | undefined
  const year = search.year as number | undefined

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
        month: value ? Number(value) : undefined,
        page: undefined,
      }),
    })
  }

  const handleYearChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        year: value ? Number(value) : undefined,
        page: undefined,
      }),
    })
  }

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
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari penghuni atau rumah...'
      >
        <Select
          value={month ? String(month) : ''}
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
          value={year ? String(year) : ''}
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
      </DataTableToolbar>
      <div
        className={cn(
          'overflow-hidden rounded-md border transition-opacity',
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
      <DataTablePagination table={table} className='mt-auto' />
      <DataTableBulkActions table={table} entityName='pembayaran'>
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
        entityLabel='pembayaran'
        isLoading={bulkDeletePayments.isPending}
        onConfirm={() => {
          bulkDeletePayments.mutate(selectedIds, {
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
