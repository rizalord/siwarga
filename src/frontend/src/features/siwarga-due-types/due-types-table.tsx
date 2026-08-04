import { useEffect, useState } from 'react'
import {
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { DueType, TrashedFilterValue } from '@/types/api'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  useBulkDeleteDueTypes,
  useBulkForceDeleteDueTypes,
  useBulkRestoreDueTypes,
} from '@/hooks/use-due-types'
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
  handleTrashedFilterChange,
  TrashedFilter,
} from '@/components/data-table'
import { MultiDeleteDialog } from '@/components/multi-delete-dialog'
import { dueTypesColumns as columns } from './due-types-columns'

const EMPTY_PERMISSIONS: string[] = []

type DataTableProps = {
  data: DueType[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown> & { trashed?: TrashedFilterValue }
  navigate: NavigateFn
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  setCurrentRow: (row: DueType | null) => void
}

export function DueTypesTable({
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

  const bulkDeleteDueTypes = useBulkDeleteDueTypes()
  const bulkRestoreDueTypes = useBulkRestoreDueTypes()
  const bulkForceDeleteDueTypes = useBulkForceDeleteDueTypes()
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
  )
  const canManageTrash = permissions.includes('due-types.trash')
  const canManage = permissions.includes('due-types.manage')
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
    handleTrashedFilterChange({
      value,
      clearRowSelection: () => setRowSelection({}),
      navigate,
    })
  }

  const resetSelectionAfterSuccess = (onClose: () => void) => {
    onClose()
    table.resetRowSelection()
  }

  const shouldShowBulkActions = isOnlyTrashed ? canManageTrash : canManage

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex min-h-0 flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar table={table} searchPlaceholder='Cari jenis iuran...'>
        <TrashedFilter value={trashedFilter} onChange={handleTrashedChange} />
      </DataTableToolbar>
      <div className='min-h-0 flex-1 overflow-auto'>
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
        <DataTableBulkActions table={table} entityName='jenis iuran'>
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
        entityLabel='jenis iuran'
        deletionType='soft'
        isLoading={bulkDeleteDueTypes.isPending}
        onConfirm={() => {
          bulkDeleteDueTypes.mutate(selectedIds, {
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
          bulkRestoreDueTypes.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkRestoreOpen(false))
            },
          })
        }}
        disabled={bulkRestoreDueTypes.isPending}
        isLoading={bulkRestoreDueTypes.isPending}
        title='Pulihkan Jenis Iuran'
        desc={
          <p>
            Apakah Anda yakin ingin memulihkan {selectedIds.length} jenis iuran
            terpilih?
          </p>
        }
        confirmText='Pulihkan'
      />
      <MultiDeleteDialog
        open={bulkForceDeleteOpen}
        onOpenChange={setBulkForceDeleteOpen}
        selectedCount={selectedIds.length}
        entityLabel='jenis iuran'
        isLoading={bulkForceDeleteDueTypes.isPending}
        onConfirm={() => {
          bulkForceDeleteDueTypes.mutate(selectedIds, {
            onSuccess: () => {
              resetSelectionAfterSuccess(() => setBulkForceDeleteOpen(false))
            },
          })
        }}
      />
    </div>
  )
}
