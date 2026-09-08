import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { Announcement } from '@/types/api'
import { Send, Trash2, UserPen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
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
import { DataTableColumnHeader } from '@/components/data-table'

const EMPTY_PERMISSIONS: string[] = []

const CATEGORY_LABELS: Record<Announcement['category'], string> = {
  darurat: 'Darurat',
  umum: 'Umum',
  kegiatan: 'Kegiatan',
  keuangan: 'Keuangan',
}

type AnnouncementsColumnsProps = {
  setOpen: (open: 'create' | 'update' | 'delete' | 'publish' | null) => void
  setCurrentRow: (row: Announcement | null) => void
}

export function announcementsColumns({
  setOpen,
  setCurrentRow,
}: AnnouncementsColumnsProps): ColumnDef<Announcement>[] {
  function DataTableRowActions({ row }: { row: Row<Announcement> }) {
    const permissions = useAuthStore(
      (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
    )
    const canManage = permissions.includes('announcements.manage')

    if (!canManage) return null

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
        <DropdownMenuContent align='end' className='w-44'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('update')
            }}
          >
            Ubah
            <DropdownMenuShortcut>
              <UserPen size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('publish')
            }}
          >
            Kirim ke WhatsApp
            <DropdownMenuShortcut>
              <Send size={16} />
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
            Hapus
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
      id: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Judul' />
      ),
      accessorKey: 'title',
      meta: { label: 'Judul' },
    },
    {
      id: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kategori' />
      ),
      accessorKey: 'category',
      cell: ({ row }) => (
        <Badge variant='secondary'>
          {CATEGORY_LABELS[row.original.category]}
        </Badge>
      ),
      meta: { label: 'Kategori' },
    },
    {
      id: 'is_public',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Publik' />
      ),
      accessorKey: 'is_public',
      cell: ({ row }) => (
        <Badge variant={row.original.is_public ? 'default' : 'outline'}>
          {row.original.is_public ? 'Ya' : 'Tidak'}
        </Badge>
      ),
      meta: { label: 'Publik' },
    },
    {
      id: 'published_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Diterbitkan' />
      ),
      accessorKey: 'published_at',
      cell: ({ row }) =>
        row.original.published_at
          ? new Date(row.original.published_at).toLocaleDateString('id-ID')
          : '-',
      meta: { label: 'Diterbitkan' },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
