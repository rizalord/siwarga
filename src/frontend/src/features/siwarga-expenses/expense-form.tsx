import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Expense } from '@/types/api'
import { cn } from '@/lib/utils'
import { useExpenseCategories } from '@/hooks/use-expense-categories'
import { useCreateExpense, useUpdateExpense } from '@/hooks/use-expenses'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type ExpenseFormDialogProps = {
  currentRow?: Expense
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  category_id: z.coerce
    .number({ error: 'Kategori wajib diisi.' })
    .positive('Kategori wajib diisi.'),
  description: z.string().optional(),
  amount: z.coerce
    .number({ error: 'Jumlah wajib diisi.' })
    .positive('Jumlah harus lebih dari 0.'),
  expense_date: z.string().min(1, 'Tanggal pengeluaran wajib diisi.'),
})

type ExpenseForm = z.infer<typeof formSchema>

function formatDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ExpenseFormDialog({
  currentRow,
  open,
  onOpenChange,
}: ExpenseFormDialogProps) {
  const isUpdate = !!currentRow
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense(currentRow?.id ?? 0)
  const { data: categoriesData } = useExpenseCategories({ per_page: 100 })
  const categories = categoriesData?.data ?? []

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow
      ? {
          category_id: currentRow.category.id,
          description: currentRow.description ?? '',
          amount: currentRow.amount,
          expense_date: currentRow.expense_date,
        }
      : {
          category_id: undefined as unknown as number,
          description: '',
          amount: undefined as unknown as number,
          expense_date: '',
        },
  })

  const onSubmit = (data: ExpenseForm) => {
    if (isUpdate && currentRow) {
      updateExpense.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createExpense.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createExpense.isPending || updateExpense.isPending

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
            {isUpdate ? 'Ubah Pengeluaran' : 'Catat Pengeluaran'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data pengeluaran di sini. Klik simpan setelah selesai.'
              : 'Catat pengeluaran baru ke dalam sistem. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='expense-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='category_id'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Kategori
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger className='col-span-4'>
                        <SelectValue placeholder='Pilih kategori...' />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={String(category.id)}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    Deskripsi
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Deskripsi (opsional)'
                      className='col-span-4 min-h-20'
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
                  <FormLabel className='col-span-2 text-end'>Jumlah</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Masukkan jumlah'
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
              name='expense_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    Tanggal
                  </FormLabel>
                  <FormControl>
                    <div className='col-span-4'>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            className={cn(
                              'w-full justify-start font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? formatDate(new Date(field.value))
                              : 'Pilih tanggal...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0' align='start'>
                          <Calendar
                            mode='single'
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date.toISOString().split('T')[0])
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='expense-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
