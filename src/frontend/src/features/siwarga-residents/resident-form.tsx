import { useEffect, useState } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCreateResident, useUpdateResident } from '@/hooks/use-residents'
import type { Resident } from '@/types/api'

type ResidentFormDialogProps = {
  currentRow?: Resident
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi.'),
  status: z.enum(['kontrak', 'tetap'], {
    error: 'Status wajib dipilih.',
  }),
  phone_number: z.string().min(1, 'Nomor telepon wajib diisi.'),
  marital_status: z.enum(['menikah', 'belum_menikah'], {
    error: 'Status nikah wajib dipilih.',
  }),
  ktp_photo: z.instanceof(File).optional(),
})

type ResidentForm = z.infer<typeof formSchema>

export function ResidentFormDialog({
  currentRow,
  open,
  onOpenChange,
}: ResidentFormDialogProps) {
  const isUpdate = !!currentRow
  const createResident = useCreateResident()
  const updateResident = useUpdateResident(currentRow?.id ?? 0)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    currentRow?.ktp_photo_url ?? null
  )

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  const form = useForm<ResidentForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      full_name: '',
      status: 'tetap',
      phone_number: '',
      marital_status: 'belum_menikah',
      ktp_photo: undefined,
    },
  })

  const onSubmit = (data: ResidentForm) => {
    if (isUpdate && currentRow) {
      updateResident.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createResident.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createResident.isPending || updateResident.isPending

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
            {isUpdate ? 'Edit Penghuni' : 'Tambah Penghuni'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data penghuni di sini.'
              : 'Tambahkan penghuni baru ke dalam sistem.'}
            Klik simpan setelah selesai.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='resident-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='full_name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Nama Lengkap
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama lengkap'
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
              name='status'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='col-span-4 flex flex-row gap-4'
                    >
                      <FormItem className='flex items-center space-x-2 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='tetap' />
                        </FormControl>
                        <FormLabel className='font-normal'>Tetap</FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center space-x-2 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='kontrak' />
                        </FormControl>
                        <FormLabel className='font-normal'>Kontrak</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phone_number'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    No. Telepon
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nomor telepon'
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
              name='marital_status'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Status Nikah
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='col-span-4 flex flex-row gap-4'
                    >
                      <FormItem className='flex items-center space-x-2 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='menikah' />
                        </FormControl>
                        <FormLabel className='font-normal'>Menikah</FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center space-x-2 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='belum_menikah' />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          Belum Menikah
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='ktp_photo'
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Foto KTP
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='file'
                      accept='image/*'
                      className='col-span-4'
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        onChange(file ?? undefined)
                        setPhotoPreview((prev) => {
                          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
                          return file ? URL.createObjectURL(file) : null
                        })
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt='Preview foto KTP'
                      className='col-span-4 col-start-3 h-32 w-auto rounded-md border object-contain'
                    />
                  )}
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='resident-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
