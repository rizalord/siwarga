import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { ExpenseCategory } from '@/types/api'
import { RotateCcw, Trash2, UserPen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader, selectColumn } from '@/components/data-table'

const EMPTY_PERMISSIONS: string[] = []

type ExpenseCategoriesColumnsProps = {
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  setCurrentRow: (row: ExpenseCategory | null) => void
}

export function expenseCategoriesColumns({
  setOpen,
  setCurrentRow,
}: ExpenseCategoriesColumnsProps): ColumnDef<ExpenseCategory>[] {
  function DataTableRowActions({ row }: { row: Row<ExpenseCategory> }) {
    const permissions = useAuthStore(
      (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
    )
    const canManageTrash = permissions.includes('expense-categories.trash')
    const canManage = permissions.includes('expense-categories.manage')
    const isTrashed = row.original.deleted_at !== null

    if (isTrashed && !canManageTrash) {
      return null
    }

    if (!isTrashed && !canManage) {
      return null
    }

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          >
            <DotsHorizontalIcon className='h-4 w-4' />
            <span className='sr-only'>Buka menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-40'>
          {isTrashed ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setCurrentRow(row.original)
                  setOpen('restore')
                }}
              >
                Pulihkan
                <DropdownMenuShortcut>
                  <RotateCcw size={16} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => {
                  setCurrentRow(row.original)
                  setOpen('force-delete')
                }}
              >
                Hapus Permanen
                <DropdownMenuShortcut>
                  <Trash2 size={16} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {canManage && (
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentRow(row.original)
                    setOpen('update')
                  }}
                >
                  Ubah
                  <DropdownMenuShortcut>
                    <UserPen size={16} />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              )}
              {canManage && <DropdownMenuSeparator />}
              {canManage && (
                <DropdownMenuItem
                  variant='destructive'
                  onClick={() => {
                    setCurrentRow(row.original)
                    setOpen('delete')
                  }}
                >
                  Hapus
                  <DropdownMenuShortcut>
                    <Trash2 size={16} />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return [
    selectColumn<ExpenseCategory>(),
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Kategori' />
      ),
      accessorKey: 'name',
      meta: { label: 'Nama Kategori' },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
