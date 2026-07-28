import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Trash2, UserPen } from 'lucide-react'
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
import type { Expense } from '@/types/api'

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
    month: 'long',
    year: 'numeric',
  })
}

type ExpensesColumnsProps = {
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  setCurrentRow: (row: Expense | null) => void
}

export function expensesColumns({
  setOpen,
  setCurrentRow,
}: ExpensesColumnsProps): ColumnDef<Expense>[] {
  function DataTableRowActions({ row }: { row: Row<Expense> }) {
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
    selectColumn<Expense>(),
    {
      id: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kategori' />
      ),
      accessorKey: 'category',
      meta: { label: 'Kategori' },
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessorKey: 'description',
      cell: ({ row }) => (
        <span>{row.original.description ?? '-'}</span>
      ),
      enableSorting: false,
    },
    {
      id: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Jumlah' />
      ),
      accessorKey: 'amount',
      cell: ({ row }) => <span>{formatRupiah(row.original.amount)}</span>,
      meta: { label: 'Jumlah' },
    },
    {
      id: 'expense_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tanggal' />
      ),
      accessorKey: 'expense_date',
      cell: ({ row }) => <span>{formatDate(row.original.expense_date)}</span>,
      meta: { label: 'Tanggal' },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
