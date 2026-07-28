import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { Role } from '@/types/api'
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

type RolesColumnsProps = {
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  setCurrentRow: (row: Role | null) => void
}

export function rolesColumns({
  setOpen,
  setCurrentRow,
}: RolesColumnsProps): ColumnDef<Role>[] {
  function DataTableRowActions({ row }: { row: Row<Role> }) {
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
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return [
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Role' />
      ),
      accessorKey: 'name',
      meta: { label: 'Nama Role' },
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
      id: 'permissions',
      header: 'Jumlah Permission',
      accessorKey: 'permissions',
      cell: ({ row }) => (
        <Badge variant='secondary'>
          {row.original.permissions?.length ?? 0} permission
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: 'users_count',
      header: 'Pengguna',
      accessorKey: 'users_count',
      cell: ({ row }) => <span>{row.original.users_count ?? 0}</span>,
      enableSorting: false,
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
