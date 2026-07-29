import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Link } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { House } from '@/types/api'
import { RotateCcw, Trash2, UserMinus, UserPen, UserPlus } from 'lucide-react'
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
import { useHousesContext } from './houses-provider'

const EMPTY_PERMISSIONS: string[] = []

function DataTableRowActions({ row }: { row: Row<House> }) {
  const { setOpen, setCurrentRow } = useHousesContext()
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
  )
  const canManageTrash = permissions.includes('houses.trash')
  const isTrashed = row.original.deleted_at !== null

  if (isTrashed && !canManageTrash) {
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(row.original)
                setOpen('assign')
              }}
            >
              Tugaskan
              <DropdownMenuShortcut>
                <UserPlus size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            {row.original.current_resident && (
              <DropdownMenuItem
                onClick={() => {
                  setCurrentRow(row.original)
                  setOpen('vacate')
                }}
              >
                Kosongkan
                <DropdownMenuShortcut>
                  <UserMinus size={16} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
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

export function housesColumns(): ColumnDef<House>[] {
  return [
    selectColumn<House>(),
    {
      id: 'house_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nomor Rumah' />
      ),
      accessorKey: 'house_number',
      cell: ({ row }) => (
        <Link
          to='/houses/$id'
          params={{ id: String(row.original.id) }}
          className='font-medium hover:underline'
        >
          {row.original.house_number}
        </Link>
      ),
      meta: { label: 'Nomor Rumah' },
    },
    {
      id: 'address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Alamat' />
      ),
      accessorKey: 'address',
      cell: ({ row }) => (
        <span className='text-muted-foreground'>
          {row.original.address || '-'}
        </span>
      ),
      meta: { label: 'Alamat' },
    },
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'dihuni' ? 'default' : 'secondary'}
        >
          {row.original.status === 'dihuni' ? 'Dihuni' : 'Kosong'}
        </Badge>
      ),
      meta: { label: 'Status' },
    },
    {
      id: 'current_resident',
      header: 'Penghuni Saat Ini',
      accessorKey: 'current_resident',
      cell: ({ row }) => (
        <span>
          {row.original.current_resident
            ? row.original.current_resident.full_name
            : '-'}
        </span>
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
