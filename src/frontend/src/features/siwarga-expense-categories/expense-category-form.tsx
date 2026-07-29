import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ExpenseCategory } from '@/types/api'
import {
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
} from '@/hooks/use-expense-categories'
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

type ExpenseCategoryFormDialogProps = {
  currentRow?: ExpenseCategory
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi.'),
})

type ExpenseCategoryForm = z.infer<typeof formSchema>

export function ExpenseCategoryFormDialog({
  currentRow,
  open,
  onOpenChange,
}: ExpenseCategoryFormDialogProps) {
  const isUpdate = !!currentRow
  const createExpenseCategory = useCreateExpenseCategory()
  const updateExpenseCategory = useUpdateExpenseCategory(currentRow?.id ?? 0)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ? { name: currentRow.name } : { name: '' },
  })

  const onSubmit = (data: ExpenseCategoryForm) => {
    if (isUpdate && currentRow) {
      updateExpenseCategory.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createExpenseCategory.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createExpenseCategory.isPending || updateExpenseCategory.isPending

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
            {isUpdate ? 'Ubah Kategori Pengeluaran' : 'Tambah Kategori Pengeluaran'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data kategori pengeluaran di sini. Klik simpan setelah selesai.'
              : 'Tambahkan kategori pengeluaran baru ke dalam sistem. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='expense-category-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Nama Kategori
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama kategori'
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
          <Button type='submit' form='expense-category-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
