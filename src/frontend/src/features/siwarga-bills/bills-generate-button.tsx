import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
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
import { useGenerateBills } from '@/hooks/use-bills'

export function BillsGenerateButton() {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const generateBills = useGenerateBills()

  const handleGenerate = () => {
    generateBills.mutate(
      { month, year },
      {
        onSuccess: () => {
          setOpen(false)
        },
      }
    )
  }

  const monthName = new Date(0, month - 1).toLocaleDateString('id-ID', {
    month: 'long',
  })

  return (
    <>
      <Button className='space-x-1' onClick={() => setOpen(true)}>
        <span>Generate Tagihan</span> <CalendarPlus size={18} />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(state) => {
          if (!state) setOpen(false)
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader className='text-start'>
            <DialogTitle>Generate Tagihan</DialogTitle>
            <DialogDescription>
              Generate tagihan untuk periode{' '}
              <span className='font-medium'>
                {monthName} {year}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-2 gap-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='month'>Bulan</Label>
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
              <Label htmlFor='year'>Tahun</Label>
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
          <DialogFooter>
            <Button
              type='button'
              onClick={handleGenerate}
              disabled={generateBills.isPending}
            >
              {generateBills.isPending ? 'Mengenerate...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
