import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { User } from '@/types/api'
import { RotateCcw, Trash2, UserPen } from 'lucide-react'
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
import { DataTableColumnHeader, selectColumn } from '@/components/data-table'

const EMPTY_PERMISSIONS: string[] = []

type UsersColumnsProps = {
  setOpen: (
    open: 'create' | 'update' | 'delete' | 'restore' | 'force-delete' | null
  ) => void
  setCurrentRow: (row: User | null) => void
}

export function usersColumns({
  setOpen,
  setCurrentRow,
}: UsersColumnsProps): ColumnDef<User>[] {
  function DataTableRowActions({ row }: { row: Row<User> }) {
    const permissions = useAuthStore(
      (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
    )
    const canManageTrash = permissions.includes('users.trash')
    const isTrashed = row.original.deleted_at !== null
    const isAdmin = row.original.roles.some((r) => r.is_admin)

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
              <DropdownMenuSeparator />
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
            <>
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
              {!isAdmin && (
                <>
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
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return [
    selectColumn<User>(),
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama' />
      ),
      accessorKey: 'name',
      meta: { label: 'Nama' },
    },
    {
      id: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Email' />
      ),
      accessorKey: 'email',
      meta: { label: 'Email' },
    },
    {
      id: 'roles',
      header: 'Peran',
      accessorKey: 'roles',
      enableSorting: false,
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {row.original.roles.length > 0 ? (
            row.original.roles.map((role) => (
              <Badge key={role.id} variant='secondary'>
                {role.name}
              </Badge>
            ))
          ) : (
            <span className='text-sm text-muted-foreground'>-</span>
          )}
        </div>
      ),
    },
    {
      id: 'resident',
      header: 'Penghuni',
      accessorKey: 'resident.full_name',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.resident ? (
          <span className='text-sm'>{row.original.resident.full_name}</span>
        ) : (
          <span className='text-sm text-muted-foreground'>-</span>
        ),
    },
    {
      id: 'is_active',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      accessorKey: 'is_active',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Aktif' : 'Tidak Aktif'}
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
