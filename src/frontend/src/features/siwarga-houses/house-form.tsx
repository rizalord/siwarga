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
import { Textarea } from '@/components/ui/textarea'
import { useCreateHouse, useUpdateHouse } from '@/hooks/use-houses'
import type { House } from '@/types/api'

type HouseFormDialogProps = {
  currentRow?: House
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  house_number: z.string().min(1, 'Nomor rumah wajib diisi.'),
  address: z.string().optional(),
})

type HouseForm = z.infer<typeof formSchema>

export function HouseFormDialog({
  currentRow,
  open,
  onOpenChange,
}: HouseFormDialogProps) {
  const isUpdate = !!currentRow
  const createHouse = useCreateHouse()
  const updateHouse = useUpdateHouse(currentRow?.id ?? 0)

  const form = useForm<HouseForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      house_number: '',
      address: '',
    },
  })

  const onSubmit = (data: HouseForm) => {
    if (isUpdate && currentRow) {
      updateHouse.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createHouse.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createHouse.isPending || updateHouse.isPending

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
            {isUpdate ? 'Edit Rumah' : 'Tambah Rumah'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data rumah di sini. Klik simpan setelah selesai.'
              : 'Tambahkan rumah baru ke dalam sistem. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='house-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='house_number'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Nomor Rumah
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nomor rumah'
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
              name='address'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Alamat
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Masukkan alamat (opsional)'
                      className='col-span-4'
                      autoComplete='off'
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
          <Button type='submit' form='house-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
