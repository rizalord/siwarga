import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePage, useUpdatePage } from '@/hooks/use-pages'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi.'),
  content: z.string().optional(),
  hero_image: z.instanceof(File).optional(),
})

type PageFormValues = z.infer<typeof formSchema>

export function PageForm({ slug }: { slug: string }) {
  const { data: page, isLoading } = usePage(slug)
  const updatePage = useUpdatePage(slug)

  const form = useForm<PageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', content: '', hero_image: undefined },
  })

  useEffect(() => {
    if (page) {
      form.reset({ title: page.title, content: page.content ?? '', hero_image: undefined })
    }
  }, [page, form])

  const onSubmit = (data: PageFormValues) => {
    updatePage.mutate(data)
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='max-w-2xl space-y-4'>
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judul *</FormLabel>
              <FormControl>
                <Input placeholder='Judul halaman' autoComplete='off' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='content'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konten (HTML)</FormLabel>
              <FormControl>
                <Textarea rows={10} placeholder='<p>Isi halaman...</p>' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='hero_image'
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Gambar Hero</FormLabel>
              <FormControl>
                <Input
                  type='file'
                  accept='image/*'
                  onChange={(e) => onChange(e.target.files?.[0] ?? undefined)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              {page?.hero_image_url && (
                <img
                  src={page.hero_image_url}
                  alt='Gambar hero saat ini'
                  className='h-32 w-auto rounded-md border object-contain'
                />
              )}
            </FormItem>
          )}
        />
        <Button type='submit' disabled={updatePage.isPending}>
          {updatePage.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Form>
  )
}
