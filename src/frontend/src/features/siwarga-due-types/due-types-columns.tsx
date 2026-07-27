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
import type { DueType } from '@/types/api'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

type DueTypesColumnsProps = {
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  setCurrentRow: (row: DueType | null) => void
}

export function dueTypesColumns({
  setOpen,
  setCurrentRow,
}: DueTypesColumnsProps): ColumnDef<DueType>[] {
  function DataTableRowActions({ row }: { row: Row<DueType> }) {
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

  return [
    {
      id: 'name',
      header: 'Nama Jenis Iuran',
      accessorKey: 'name',
    },
    {
      id: 'amount',
      header: 'Nominal',
      accessorKey: 'amount',
      cell: ({ row }) => <span>{formatRupiah(row.original.amount)}</span>,
    },
    {
      id: 'billing_cycle',
      header: 'Siklus',
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
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
    },
  ]
}
