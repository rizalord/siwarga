import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DueType } from '@/types/api'
import { useCreateDueType, useUpdateDueType } from '@/hooks/use-due-types'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type DueTypeFormDialogProps = {
  currentRow?: DueType
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  name: z.string().min(1, 'Nama jenis iuran wajib diisi.'),
  amount: z.coerce
    .number({ error: 'Nominal wajib diisi.' })
    .positive('Nominal harus lebih dari 0.'),
  billing_cycle: z.enum(['bulanan', 'fleksibel'], {
    error: 'Siklus billing wajib dipilih.',
  }),
})

type DueTypeForm = z.infer<typeof formSchema>

export function DueTypeFormDialog({
  currentRow,
  open,
  onOpenChange,
}: DueTypeFormDialogProps) {
  const isUpdate = !!currentRow
  const createDueType = useCreateDueType()
  const updateDueType = useUpdateDueType(currentRow?.id ?? 0)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      name: '',
      amount: undefined as unknown as number,
      billing_cycle: 'bulanan',
    },
  })

  const onSubmit = (data: DueTypeForm) => {
    if (isUpdate && currentRow) {
      updateDueType.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createDueType.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createDueType.isPending || updateDueType.isPending

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
            {isUpdate ? 'Ubah Jenis Iuran' : 'Tambah Jenis Iuran'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data jenis iuran di sini. Klik simpan setelah selesai.'
              : 'Tambahkan jenis iuran baru ke dalam sistem. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='due-type-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Nama Jenis Iuran
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama jenis iuran'
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
              name='amount'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>Nominal</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Masukkan nominal'
                      className='col-span-4'
                      autoComplete='off'
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='billing_cycle'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>Siklus</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='col-span-4 flex flex-row gap-4'
                    >
                      <FormItem className='flex items-center space-y-0 space-x-2'>
                        <FormControl>
                          <RadioGroupItem value='bulanan' />
                        </FormControl>
                        <FormLabel className='font-normal'>Bulanan</FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center space-y-0 space-x-2'>
                        <FormControl>
                          <RadioGroupItem value='fleksibel' />
                        </FormControl>
                        <FormLabel className='font-normal'>Fleksibel (manual)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='due-type-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
