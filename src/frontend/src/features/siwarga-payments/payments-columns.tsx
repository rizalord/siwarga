import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Payment } from '@/types/api'
import { usePaymentsContext } from './payments-provider'

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

function DataTableRowActions({ row }: { row: Row<Payment> }) {
  const { setOpen, setCurrentRow } = usePaymentsContext()
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

export function paymentsColumns(): ColumnDef<Payment>[] {
  return [
    {
      id: 'bill',
      header: 'Tagihan',
      cell: ({ row }) => {
        const bill = row.original.bill
        if (!bill) {
          return (
            <span className='text-muted-foreground'>
              ID Tagihan: {row.original.bill_id}
            </span>
          )
        }
        return (
          <div className='flex flex-col'>
            <span className='font-medium'>
              {bill.house.house_number} — {bill.resident.full_name}
            </span>
            <span className='text-xs text-muted-foreground'>
              {bill.due_type.name} — {formatDate(bill.period_start)} s.d.{' '}
              {formatDate(bill.period_end)}
            </span>
          </div>
        )
      },
    },
    {
      id: 'amount_paid',
      header: 'Jumlah Dibayar',
      accessorKey: 'amount_paid',
      cell: ({ row }) => <span>{formatRupiah(row.original.amount_paid)}</span>,
    },
    {
      id: 'payment_date',
      header: 'Tanggal Bayar',
      accessorKey: 'payment_date',
      cell: ({ row }) => <span>{formatDate(row.original.payment_date)}</span>,
    },
    {
      id: 'notes',
      header: 'Catatan',
      accessorKey: 'notes',
      cell: ({ row }) => (
        <span className='max-w-48 truncate'>
          {row.original.notes || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
    },
  ]
}
