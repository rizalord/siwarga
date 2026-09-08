import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Announcement } from '@/types/api'
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
} from '@/hooks/use-announcements'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/rich-text-editor'
import { HouseTargetPicker } from './house-target-picker'

type AnnouncementFormDialogProps = {
  currentRow?: Announcement
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi.'),
  content: z.string().min(1, 'Konten wajib diisi.'),
  category: z.enum(['darurat', 'umum', 'kegiatan', 'keuangan'], {
    error: 'Kategori wajib dipilih.',
  }),
  is_public: z.boolean(),
  target_house_ids: z.array(z.number()),
})

type AnnouncementFormValues = z.infer<typeof formSchema>

const CATEGORY_OPTIONS = [
  { value: 'darurat', label: 'Darurat' },
  { value: 'umum', label: 'Umum' },
  { value: 'kegiatan', label: 'Kegiatan' },
  { value: 'keuangan', label: 'Keuangan' },
] as const

export function AnnouncementFormDialog({
  currentRow,
  open,
  onOpenChange,
}: AnnouncementFormDialogProps) {
  const isUpdate = !!currentRow
  const createAnnouncement = useCreateAnnouncement()
  const updateAnnouncement = useUpdateAnnouncement(currentRow?.id ?? 0)

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow
      ? {
          title: currentRow.title,
          content: currentRow.content,
          category: currentRow.category,
          is_public: currentRow.is_public,
          target_house_ids: currentRow.target_house_ids,
        }
      : {
          title: '',
          content: '',
          category: 'umum',
          is_public: false,
          target_house_ids: [],
        },
  })

  const onSubmit = (data: AnnouncementFormValues) => {
    if (isUpdate && currentRow) {
      updateAnnouncement.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createAnnouncement.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createAnnouncement.isPending || updateAnnouncement.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isUpdate ? 'Ubah Pengumuman' : 'Tambah Pengumuman'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui pengumuman di sini. Klik simpan setelah selesai.'
              : 'Tambahkan pengumuman baru. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='announcement-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Judul pengumuman'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Pilih kategori' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='content'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konten *</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='Tulis isi pengumuman...'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='is_public'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center gap-2 space-y-0'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className='font-normal'>
                    Tampilkan di blog landing page
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='target_house_ids'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Rumah</FormLabel>
                  <FormControl>
                    <HouseTargetPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='announcement-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
