import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useCreatePayment } from '@/hooks/use-payments'
import { useBills } from '@/hooks/use-bills'
import type { Bill } from '@/types/api'

type PaymentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  bill_id: z.number({ required_error: 'Tagihan wajib dipilih.' }),
  amount_paid: z.coerce
    .number({ invalid_type_error: 'Jumlah dibayar wajib diisi.' })
    .positive('Jumlah harus lebih dari 0.'),
  payment_date: z.string().min(1, 'Tanggal bayar wajib diisi.'),
  notes: z.string().optional(),
})

type PaymentForm = z.infer<typeof formSchema>

function formatBillLabel(bill: Bill) {
  const date = new Date(bill.period_start)
  const monthName = date.toLocaleDateString('id-ID', { month: 'long' })
  return `${bill.house.house_number} - ${bill.resident.full_name} - ${bill.due_type.name} - ${monthName} ${date.getFullYear()}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PaymentFormDialog({
  open,
  onOpenChange,
}: PaymentFormDialogProps) {
  const createPayment = useCreatePayment()
  const { data: billsData } = useBills({ status: 'belum_lunas' })
  const bills = billsData?.data ?? []
  const [billSearchOpen, setBillSearchOpen] = useState(false)

  const form = useForm<PaymentForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bill_id: undefined as unknown as number,
      amount_paid: undefined as unknown as number,
      payment_date: '',
      notes: '',
    },
  })

  const selectedBill = bills.find((b) => b.id === form.watch('bill_id'))

  const handleBillSelect = (bill: Bill) => {
    form.setValue('bill_id', bill.id)
    form.setValue('amount_paid', bill.amount_due)
    setBillSearchOpen(false)
  }

  const onSubmit = (data: PaymentForm) => {
    createPayment.mutate(data, {
      onSuccess: () => {
        onOpenChange(false)
        form.reset()
      },
    })
  }

  const isPending = createPayment.isPending

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
          <DialogTitle>Catat Pembayaran</DialogTitle>
          <DialogDescription>
            Catat pembayaran iuran warga di sini. Klik simpan setelah selesai.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='payment-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='bill_id'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    Tagihan
                  </FormLabel>
                  <FormControl>
                    <div className='col-span-4'>
                      <Popover
                        open={billSearchOpen}
                        onOpenChange={setBillSearchOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            role='combobox'
                            aria-expanded={billSearchOpen}
                            className='w-full justify-between font-normal'
                          >
                            {selectedBill
                              ? formatBillLabel(selectedBill)
                              : 'Pilih tagihan...'}
                            <ChevronsUpDownIcon className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
                          <Command>
                            <CommandInput placeholder='Cari tagihan...' />
                            <CommandList>
                              <CommandEmpty>
                                Tagihan tidak ditemukan.
                              </CommandEmpty>
                              <CommandGroup>
                                {bills.map((bill) => (
                                  <CommandItem
                                    key={bill.id}
                                    value={formatBillLabel(bill)}
                                    onSelect={() => handleBillSelect(bill)}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value === bill.id
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    {formatBillLabel(bill)}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='amount_paid'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Jumlah Dibayar
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Masukkan jumlah dibayar'
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
              name='payment_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    Tanggal Bayar
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
                                field.onChange(
                                  date.toISOString().split('T')[0]
                                )
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
            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    Catatan
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Catatan (opsional)'
                      className='col-span-4 min-h-20'
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
          <Button type='submit' form='payment-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
