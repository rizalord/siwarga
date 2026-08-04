import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Permission } from '@/types/api'
import { useCreatePermission, useUpdatePermission } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'

type PermissionFormDialogProps = {
  currentRow?: Permission
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama permission wajib diisi.')
    .regex(
      /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/,
      'Format harus "resource.aksi", huruf kecil (contoh: announcements.manage).'
    ),
  description: z.string().optional(),
})

type PermissionForm = z.infer<typeof formSchema>

export function PermissionFormDialog({
  currentRow,
  open,
  onOpenChange,
}: PermissionFormDialogProps) {
  const isUpdate = !!currentRow
  const isSystem = !!currentRow?.is_system
  const createPermission = useCreatePermission()
  const updatePermission = useUpdatePermission(currentRow?.id ?? 0)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow
      ? { name: currentRow.name, description: currentRow.description ?? '' }
      : { name: '', description: '' },
  })

  const onSubmit = (data: PermissionForm) => {
    if (isUpdate && currentRow) {
      updatePermission.mutate(
        isSystem ? { description: data.description } : data,
        {
          onSuccess: () => {
            onOpenChange(false)
            form.reset()
          },
        }
      )
    } else {
      createPermission.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createPermission.isPending || updatePermission.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isUpdate ? 'Ubah Permission' : 'Tambah Permission'}
          </DialogTitle>
          <DialogDescription>
            {isSystem
              ? 'Permission inti sistem hanya bisa diubah deskripsinya.'
              : isUpdate
                ? 'Perbarui data permission di sini. Klik simpan setelah selesai.'
                : 'Tambahkan permission kustom baru. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='permission-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>Nama *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='contoh: announcements.manage'
                      className='col-span-4'
                      autoComplete='off'
                      disabled={isSystem}
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
                      placeholder='Deskripsi permission'
                      className='col-span-4'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='permission-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
