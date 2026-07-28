import type { ColumnDef } from '@tanstack/react-table'
import type { ActivityLog } from '@/types/api'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'

const actionLabels: Record<string, string> = {
  created: 'Tambah',
  updated: 'Ubah',
  deleted: 'Hapus',
  login: 'Login',
  logout: 'Logout',
  navigate: 'Buka Halaman',
  assigned: 'Assign Penghuni',
  vacated: 'Kosongkan Rumah',
}

const actionVariants: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  created: 'default',
  updated: 'secondary',
  deleted: 'destructive',
  login: 'outline',
  logout: 'outline',
  navigate: 'outline',
  assigned: 'secondary',
  vacated: 'secondary',
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type ActivityLogsColumnsProps = {
  onViewDetail: (row: ActivityLog) => void
}

export function activityLogsColumns({
  onViewDetail,
}: ActivityLogsColumnsProps): ColumnDef<ActivityLog>[] {
  return [
    {
      id: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Waktu' />
      ),
      accessorKey: 'created_at',
      cell: ({ row }) => (
        <span className='whitespace-nowrap'>
          {formatDateTime(row.original.created_at)}
        </span>
      ),
      meta: { label: 'Waktu' },
    },
    {
      id: 'user',
      header: 'Pengguna',
      accessorKey: 'user.name',
      cell: ({ row }) => <span>{row.original.user?.name ?? 'Sistem'}</span>,
      enableSorting: false,
    },
    {
      id: 'action',
      header: 'Aksi',
      accessorKey: 'action',
      cell: ({ row }) => (
        <Badge variant={actionVariants[row.original.action] ?? 'outline'}>
          {actionLabels[row.original.action] ?? row.original.action}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: 'subject_type',
      header: 'Modul',
      accessorKey: 'subject_type',
      cell: ({ row }) => (
        <span className='text-muted-foreground'>
          {row.original.subject_type ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessorKey: 'description',
      enableSorting: false,
    },
    {
      id: 'ip_address',
      header: 'IP Address',
      accessorKey: 'ip_address',
      cell: ({ row }) => (
        <span className='text-muted-foreground'>
          {row.original.ip_address ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Detail',
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='icon'
          className='size-8'
          onClick={() => onViewDetail(row.original)}
        >
          <Eye className='size-4' />
          <span className='sr-only'>Lihat detail</span>
        </Button>
      ),
      enableSorting: false,
    },
  ]
}
