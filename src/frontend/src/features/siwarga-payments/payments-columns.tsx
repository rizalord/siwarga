import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { Payment } from '@/types/api'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader, selectColumn } from '@/components/data-table'
import { usePaymentsContext } from './payments-provider'

const EMPTY_PERMISSIONS: string[] = []

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
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
  )
  const canManageTrash = permissions.includes('payments.trash')
  const canDelete = permissions.includes('payments.create')
  const isTrashed = row.original.deleted_at !== null

  if (isTrashed && !canManageTrash) {
    return null
  }

  if (!isTrashed && !canDelete) {
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function paymentsColumns(): ColumnDef<Payment>[] {
  return [
    selectColumn<Payment>(),
    {
      id: 'bill',
      header: 'Tagihan',
      enableSorting: false,
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Jumlah Dibayar' />
      ),
      accessorKey: 'amount_paid',
      cell: ({ row }) => <span>{formatRupiah(row.original.amount_paid)}</span>,
      meta: { label: 'Jumlah Dibayar' },
    },
    {
      id: 'payment_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tanggal Bayar' />
      ),
      accessorKey: 'payment_date',
      cell: ({ row }) => <span>{formatDate(row.original.payment_date)}</span>,
      meta: { label: 'Tanggal Bayar' },
    },
    {
      id: 'notes',
      header: 'Catatan',
      accessorKey: 'notes',
      cell: ({ row }) => (
        <span className='max-w-48 truncate'>{row.original.notes || '-'}</span>
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
