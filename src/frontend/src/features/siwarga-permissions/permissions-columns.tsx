import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { Permission } from '@/types/api'
import { Pencil, Trash2 } from 'lucide-react'
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
import { DataTableColumnHeader } from '@/components/data-table'
import { useAuthStore } from '@/stores/auth-store'

const EMPTY_PERMISSIONS: string[] = []

type PermissionsColumnsProps = {
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  setCurrentRow: (row: Permission | null) => void
}

export function permissionsColumns({
  setOpen,
  setCurrentRow,
}: PermissionsColumnsProps): ColumnDef<Permission>[] {
  function DataTableRowActions({ row }: { row: Row<Permission> }) {
    const permissions = useAuthStore(
      (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
    )

    if (!permissions.includes('users.manage')) return null

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
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('update')
            }}
          >
            Ubah
            <DropdownMenuShortcut>
              <Pencil size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          {!row.original.is_system && (
            <>
              <DropdownMenuSeparator />
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return [
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Permission' />
      ),
      accessorKey: 'name',
      cell: ({ row }) => (
        <code className='text-sm'>{row.original.name}</code>
      ),
      meta: { label: 'Nama Permission' },
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessorKey: 'description',
      cell: ({ row }) => (
        <span className='text-muted-foreground'>
          {row.original.description || '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'is_system',
      header: 'Tipe',
      accessorKey: 'is_system',
      cell: ({ row }) => (
        <Badge variant={row.original.is_system ? 'secondary' : 'default'}>
          {row.original.is_system ? 'Sistem' : 'Kustom'}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
