import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { DueType } from '@/types/api'
import { RotateCcw, Trash2, UserPen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
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

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

type DueTypesColumnsProps = {
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  setCurrentRow: (row: DueType | null) => void
}

export function dueTypesColumns({
  setOpen,
  setCurrentRow,
}: DueTypesColumnsProps): ColumnDef<DueType>[] {
  function DataTableRowActions({ row }: { row: Row<DueType> }) {
    const permissions = useAuthStore(
      (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
    )
    const canManageTrash = permissions.includes('due-types.trash')
    const canManage = permissions.includes('due-types.manage')
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
                onClick={() => {
                  setCurrentRow(row.original)
                  setOpen('force-delete')
                }}
                className='text-red-500!'
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
                  onClick={() => {
                    setCurrentRow(row.original)
                    setOpen('delete')
                  }}
                  className='text-red-500!'
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
    selectColumn<DueType>(),
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Jenis Iuran' />
      ),
      accessorKey: 'name',
      meta: { label: 'Nama Jenis Iuran' },
    },
    {
      id: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nominal' />
      ),
      accessorKey: 'amount',
      cell: ({ row }) => <span>{formatRupiah(row.original.amount)}</span>,
      meta: { label: 'Nominal' },
    },
    {
      id: 'billing_cycle',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Siklus' />
      ),
      accessorKey: 'billing_cycle',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.billing_cycle === 'bulanan' ? 'default' : 'secondary'
          }
        >
          {row.original.billing_cycle === 'bulanan' ? 'Bulanan' : 'Fleksibel'}
        </Badge>
      ),
      meta: { label: 'Siklus' },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
