import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { PasswordInput } from '@/components/password-input'
import { SelectDropdown } from '@/components/select-dropdown'
import { useCreateUser, useUpdateUser } from '@/hooks/use-users'
import { useRoles } from '@/hooks/use-roles'
import type { User } from '@/types/api'

type UserFormDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  name: z.string().min(1, 'Nama pengguna wajib diisi.'),
  email: z
    .string()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),
  password: z.string().optional(),
  role_id: z.coerce
    .number({ error: 'Role wajib dipilih.' })
    .min(1, 'Role wajib dipilih.'),
})

type UserForm = z.infer<typeof formSchema>

export function UserFormDialog({
  currentRow,
  open,
  onOpenChange,
}: UserFormDialogProps) {
  const isUpdate = !!currentRow
  const createUser = useCreateUser()
  const updateUser = useUpdateUser(currentRow?.id ?? 0)
  const { data: roles } = useRoles()
  const roleOptions = (roles ?? []).map((role) => ({
    label: role.description || role.name,
    value: String(role.id),
  }))

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow
      ? {
          name: currentRow.name,
          email: currentRow.email,
          password: '',
          role_id: currentRow.roles[0]?.id ?? 0,
        }
      : {
          name: '',
          email: '',
          password: '',
          role_id: undefined as unknown as number,
        },
  })

  const onSubmit = (data: UserForm) => {
    if (isUpdate && currentRow) {
      updateUser.mutate(
        {
          name: data.name,
          email: data.email,
          role_ids: [data.role_id],
        },
        {
          onSuccess: () => {
            onOpenChange(false)
            form.reset()
          },
        }
      )
    } else {
      if (!data.password) {
        form.setError('password', { message: 'Password wajib diisi.' })
        return
      }
      createUser.mutate(
        {
          name: data.name,
          email: data.email,
          password: data.password,
          role_ids: [data.role_id],
        },
        {
          onSuccess: () => {
            onOpenChange(false)
            form.reset()
          },
        }
      )
    }
  }

  const isPending = createUser.isPending || updateUser.isPending

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
            {isUpdate ? 'Edit Pengguna' : 'Tambah Pengguna'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data pengguna di sini.'
              : 'Tambahkan pengguna baru ke dalam sistem.'}
            Klik simpan setelah selesai.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='user-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Nama
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama pengguna'
                      className='col-span-4'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='Masukkan email'
                      className='col-span-4'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            {!isUpdate && (
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder='Masukkan password'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='role_id'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Role
                  </FormLabel>
                  <FormControl>
                    <SelectDropdown
                      defaultValue={
                        field.value ? String(field.value) : 'placeholder'
                      }
                      onValueChange={(value) => field.onChange(Number(value))}
                      placeholder='Pilih role'
                      className='col-span-4'
                      items={roleOptions}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='user-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
