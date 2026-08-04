import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import {
  useGenerateBills,
  useGenerateFlexibleBills,
} from '@/hooks/use-bills'
import { useDueTypes } from '@/hooks/use-due-types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function BillsGenerateButton() {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [mode, setMode] = useState<'bulanan' | 'fleksibel'>('bulanan')
  const [dueTypeId, setDueTypeId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [amount, setAmount] = useState('')
  const generateBills = useGenerateBills()
  const generateFlexibleBills = useGenerateFlexibleBills()
  const { data: dueTypesData } = useDueTypes({ per_page: 100 })
  const flexibleDueTypes = (dueTypesData?.data ?? []).filter(
    (dueType) => dueType.billing_cycle === 'fleksibel'
  )

  const selectedDueType = flexibleDueTypes.find(
    (dueType) => String(dueType.id) === dueTypeId
  )

  const handleGenerate = () => {
    if (mode === 'bulanan') {
      generateBills.mutate({ month, year }, { onSuccess: () => setOpen(false) })
      return
    }

    generateFlexibleBills.mutate(
      {
        due_type_id: Number(dueTypeId),
        period_start: periodStart,
        period_end: periodEnd,
        amount_due: Number(amount),
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  return (
    <>
      <Button className='space-x-1' onClick={() => setOpen(true)}>
        <span>Buat Tagihan</span> <CalendarPlus size={18} />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(state) => {
          if (!state) setOpen(false)
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader className='text-start'>
            <DialogTitle>Buat Tagihan</DialogTitle>
            <DialogDescription>
              Buat tagihan bulanan atau fleksibel untuk penghuni aktif.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Jenis periode *</Label>
              <Select
                value={mode}
                onValueChange={(value: 'bulanan' | 'fleksibel') =>
                  setMode(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='bulanan'>Bulanan</SelectItem>
                  <SelectItem value='fleksibel'>Fleksibel (manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'bulanan' ? (
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='month'>Bulan *</Label>
                  <Input
                    id='month'
                    type='number'
                    min={1}
                    max={12}
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='year'>Tahun *</Label>
                  <Input
                    id='year'
                    type='number'
                    min={2020}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Jenis iuran fleksibel *</Label>
                  <Select
                    value={dueTypeId}
                    onValueChange={(value) => {
                      setDueTypeId(value)
                      const dueType = flexibleDueTypes.find(
                        (item) => String(item.id) === value
                      )
                      if (dueType) setAmount(String(dueType.amount))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Pilih jenis iuran' />
                    </SelectTrigger>
                    <SelectContent>
                      {flexibleDueTypes.map((dueType) => (
                        <SelectItem key={dueType.id} value={String(dueType.id)}>
                          {dueType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='period-start'>Tanggal mulai *</Label>
                    <Input
                      id='period-start'
                      type='date'
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='period-end'>Tanggal selesai *</Label>
                    <Input
                      id='period-end'
                      type='date'
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='amount'>Nominal tagihan *</Label>
                  <Input
                    id='amount'
                    type='number'
                    min={0.01}
                    value={amount}
                    placeholder={selectedDueType ? String(selectedDueType.amount) : ''}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type='button'
              onClick={handleGenerate}
              disabled={
                generateBills.isPending ||
                generateFlexibleBills.isPending ||
                (mode === 'fleksibel' &&
                  (!dueTypeId || !periodStart || !periodEnd || !amount))
              }
            >
              {generateBills.isPending || generateFlexibleBills.isPending
                ? 'Membuat...'
                : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
