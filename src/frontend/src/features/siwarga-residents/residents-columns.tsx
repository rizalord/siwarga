import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Trash2, UserPen } from 'lucide-react'
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
import type { Resident } from '@/types/api'
import { useResidentsContext } from './residents-provider'

function DataTableRowActions({ row }: { row: Row<Resident> }) {
  const { setOpen, setCurrentRow } = useResidentsContext()
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

export function residentsColumns(): ColumnDef<Resident>[] {
  return [
    selectColumn<Resident>(),
    {
      id: 'full_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Lengkap' />
      ),
      accessorKey: 'full_name',
      meta: { label: 'Nama Lengkap' },
    },
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'tetap' ? 'default' : 'secondary'}
        >
          {row.original.status}
        </Badge>
      ),
      meta: { label: 'Status' },
    },
    {
      id: 'phone_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='No. Telepon' />
      ),
      accessorKey: 'phone_number',
      meta: { label: 'No. Telepon' },
    },
    {
      id: 'marital_status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status Nikah' />
      ),
      accessorKey: 'marital_status',
      meta: { label: 'Status Nikah' },
      cell: ({ row }) => (
        <span>
          {row.original.marital_status === 'menikah' ? 'Menikah' : 'Belum Menikah'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
