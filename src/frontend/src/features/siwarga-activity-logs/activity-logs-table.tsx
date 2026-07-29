import { useEffect, useState } from 'react'
import {
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ActivityLog } from '@/types/api'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { activityLogsColumns as columns } from './activity-logs-columns'

const actionOptions = [
  { label: 'Tambah', value: 'created' },
  { label: 'Ubah', value: 'updated' },
  { label: 'Hapus', value: 'deleted' },
  { label: 'Login', value: 'login' },
  { label: 'Logout', value: 'logout' },
  { label: 'Buka Halaman', value: 'navigate' },
  { label: 'Assign Penghuni', value: 'assigned' },
  { label: 'Kosongkan Rumah', value: 'vacated' },
]

const subjectTypeOptions = [
  { label: 'Penghuni', value: 'Resident' },
  { label: 'Rumah', value: 'House' },
  { label: 'Jenis Iuran', value: 'DueType' },
  { label: 'Tagihan', value: 'Bill' },
  { label: 'Pembayaran', value: 'Payment' },
  { label: 'Pengeluaran', value: 'Expense' },
  { label: 'Kategori Pengeluaran', value: 'ExpenseCategory' },
  { label: 'User', value: 'User' },
  { label: 'Role', value: 'Role' },
  { label: 'Permission', value: 'Permission' },
]

type DataTableProps = {
  data: ActivityLog[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown>
  navigate: NavigateFn
  onViewDetail: (row: ActivityLog) => void
}

export function ActivityLogsTable({
  data,
  pageCount,
  isFetching,
  search,
  navigate,
  onViewDetail,
}: DataTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

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
      { columnId: 'action', searchKey: 'action', type: 'array' },
      { columnId: 'subject_type', searchKey: 'subject_type', type: 'array' },
    ],
    sorting: {},
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: columns({ onViewDetail }),
    state: {
      columnVisibility,
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

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4 overflow-hidden'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari deskripsi...'
        filters={[
          { columnId: 'action', title: 'Aksi', options: actionOptions },
          {
            columnId: 'subject_type',
            title: 'Modul',
            options: subjectTypeOptions,
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
                    colSpan={columns({ onViewDetail }).length}
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
    </div>
  )
}
