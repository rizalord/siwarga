import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
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
import type { Bill } from '@/types/api'
import { useBillsContext } from './bills-provider'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function DataTableRowActions({ row }: { row: Row<Bill> }) {
  const { setOpen, setCurrentRow } = useBillsContext()
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

export function billsColumns(): ColumnDef<Bill>[] {
  return [
    {
      id: 'period',
      header: 'Periode',
      accessorKey: 'period_start',
      cell: ({ row }) => (
        <span>
          {formatDate(row.original.period_start)} — {formatDate(row.original.period_end)}
        </span>
      ),
    },
    {
      id: 'house',
      header: 'Rumah',
      accessorKey: 'house.house_number',
      cell: ({ row }) => <span>{row.original.house.house_number}</span>,
    },
    {
      id: 'resident',
      header: 'Penghuni',
      accessorKey: 'resident.full_name',
      cell: ({ row }) => <span>{row.original.resident.full_name}</span>,
    },
    {
      id: 'due_type',
      header: 'Jenis Iuran',
      accessorKey: 'due_type.name',
      cell: ({ row }) => <span>{row.original.due_type.name}</span>,
    },
    {
      id: 'amount_due',
      header: 'Jumlah',
      accessorKey: 'amount_due',
      cell: ({ row }) => <span>{formatRupiah(row.original.amount_due)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'lunas' ? 'default' : 'secondary'}
        >
          {row.original.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
    },
  ]
}
