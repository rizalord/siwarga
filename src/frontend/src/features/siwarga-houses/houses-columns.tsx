import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Trash2, UserPen, UserPlus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
import type { House } from '@/types/api'
import { useHousesContext } from './houses-provider'

function DataTableRowActions({ row }: { row: Row<House> }) {
  const { setOpen, setCurrentRow } = useHousesContext()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('update')
          }}
        >
          Edit
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
          Assign
          <DropdownMenuShortcut>
            <UserPlus size={16} />
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
          Delete
          <DropdownMenuShortcut>
            <Trash2 size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function housesColumns(): ColumnDef<House>[] {
  return [
    {
      id: 'house_number',
      header: 'Nomor Rumah',
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
    },
    {
      id: 'address',
      header: 'Alamat',
      accessorKey: 'address',
      cell: ({ row }) => (
        <span className='text-muted-foreground'>
          {row.original.address || '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'dihuni' ? 'default' : 'secondary'}
        >
          {row.original.status === 'dihuni' ? 'Dihuni' : 'Kosong'}
        </Badge>
      ),
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
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
    },
  ]
}
