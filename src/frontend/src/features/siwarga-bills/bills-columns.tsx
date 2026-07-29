import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { Bill } from '@/types/api'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader, selectColumn } from '@/components/data-table'
import { useBillsContext } from './bills-provider'

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

function DataTableRowActions({ row }: { row: Row<Bill> }) {
  const { setOpen, setCurrentRow } = useBillsContext()
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
  )
  const canManageTrash = permissions.includes('bills.trash')
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

export function billsColumns(): ColumnDef<Bill>[] {
  return [
    selectColumn<Bill>(),
    {
      id: 'period_start',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Periode' />
      ),
      accessorKey: 'period_start',
      cell: ({ row }) => (
        <span>
          {formatDate(row.original.period_start)} —{' '}
          {formatDate(row.original.period_end)}
        </span>
      ),
      meta: { label: 'Periode' },
    },
    {
      id: 'house',
      header: 'Rumah',
      accessorKey: 'house.house_number',
      cell: ({ row }) => <span>{row.original.house.house_number}</span>,
      enableSorting: false,
    },
    {
      id: 'resident',
      header: 'Penghuni',
      accessorKey: 'resident.full_name',
      cell: ({ row }) => <span>{row.original.resident.full_name}</span>,
      enableSorting: false,
    },
    {
      id: 'due_type',
      header: 'Jenis Iuran',
      accessorKey: 'due_type.name',
      cell: ({ row }) => <span>{row.original.due_type.name}</span>,
      enableSorting: false,
    },
    {
      id: 'amount_due',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Jumlah' />
      ),
      accessorKey: 'amount_due',
      cell: ({ row }) => <span>{formatRupiah(row.original.amount_due)}</span>,
      meta: { label: 'Jumlah' },
    },
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'lunas' ? 'default' : 'secondary'}
        >
          {row.original.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
        </Badge>
      ),
      meta: { label: 'Status' },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
