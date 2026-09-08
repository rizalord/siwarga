import type { ColumnDef } from '@tanstack/react-table'
import type { ContactMessage } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'

type ContactMessagesColumnsProps = {
  onSelect: (row: ContactMessage) => void
}

export function contactMessagesColumns({
  onSelect,
}: ContactMessagesColumnsProps): ColumnDef<ContactMessage>[] {
  return [
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'new' ? 'default' : 'outline'}>
          {row.original.status === 'new' ? 'Baru' : 'Dibaca'}
        </Badge>
      ),
      meta: { label: 'Status' },
    },
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama' />
      ),
      accessorKey: 'name',
      cell: ({ row }) => (
        <button
          type='button'
          className='text-start hover:underline'
          onClick={() => onSelect(row.original)}
        >
          {row.original.name}
        </button>
      ),
      meta: { label: 'Nama' },
    },
    {
      id: 'message',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Pesan' />
      ),
      accessorKey: 'message',
      cell: ({ row }) => (
        <span className='block max-w-md truncate'>{row.original.message}</span>
      ),
      meta: { label: 'Pesan' },
    },
    {
      id: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Waktu' />
      ),
      accessorKey: 'created_at',
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleString('id-ID'),
      meta: { label: 'Waktu' },
    },
  ]
}
