import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Permission, Role } from '@/types/api'
import { usePermissions } from '@/hooks/use-permissions'
import { useCreateRole, useUpdateRole } from '@/hooks/use-roles'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

type RoleFormDialogProps = {
  currentRow?: Role
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  name: z.string().min(1, 'Nama role wajib diisi.'),
  description: z.string().optional(),
  permission_ids: z.array(z.number()),
})

type RoleForm = z.infer<typeof formSchema>

function groupLabel(prefix: string): string {
  return prefix
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function groupPermissions(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const prefix = permission.name.split('.')[0]
    if (!groups.has(prefix)) groups.set(prefix, [])
    groups.get(prefix)!.push(permission)
  }
  return Array.from(groups.entries())
}

export function RoleFormDialog({
  currentRow,
  open,
  onOpenChange,
}: RoleFormDialogProps) {
  const isUpdate = !!currentRow
  const isAdminRole = !!currentRow?.is_admin
  const createRole = useCreateRole()
  const updateRole = useUpdateRole(currentRow?.id ?? 0)
  const { data: permissionsData } = usePermissions({ per_page: 100 })
  const permissions = permissionsData?.data ?? []
  const permissionGroups = groupPermissions(permissions)

  const [permissionIds, setPermissionIds] = useState<number[]>(
    currentRow?.permissions?.map((p) => p.id) ?? []
  )

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentRow?.name ?? '',
      description: currentRow?.description ?? '',
      permission_ids: currentRow?.permissions?.map((p) => p.id) ?? [],
    },
  })

  const togglePermission = (id: number, checked: boolean) => {
    const next = checked
      ? [...permissionIds, id]
      : permissionIds.filter((p) => p !== id)
    setPermissionIds(next)
    form.setValue('permission_ids', next)
  }

  const onSubmit = (data: RoleForm) => {
    if (isUpdate && currentRow) {
      updateRole.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createRole.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createRole.isPending || updateRole.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isUpdate ? 'Ubah Role' : 'Tambah Role'}</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data role dan hak aksesnya di sini. Klik simpan setelah selesai.'
              : 'Tambahkan role baru beserta hak aksesnya. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='role-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Nama Role
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='contoh: petugas-keamanan'
                      className='col-span-4'
                      autoComplete='off'
                      disabled={isAdminRole}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Deskripsi
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Deskripsi role'
                      className='col-span-4'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
              <FormLabel className='col-span-2 pt-2 text-end'>
                Hak Akses
              </FormLabel>
              <div className='col-span-4'>
                <ScrollArea className='h-64 rounded-md border p-3'>
                  <div className='space-y-4'>
                    {permissionGroups.map(([prefix, groupPermissions]) => (
                      <div key={prefix} className='space-y-2'>
                        <p className='text-sm font-medium'>
                          {groupLabel(prefix)}
                        </p>
                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                          {groupPermissions.map((permission) => (
                            <label
                              key={permission.id}
                              className='flex items-center gap-2 text-sm font-normal'
                            >
                              <Checkbox
                                checked={permissionIds.includes(permission.id)}
                                onCheckedChange={(checked) =>
                                  togglePermission(
                                    permission.id,
                                    checked === true
                                  )
                                }
                              />
                              {permission.description || permission.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </FormItem>
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='role-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
