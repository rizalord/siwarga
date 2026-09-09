import { useState } from 'react'
import { useCreateTicket } from '@/hooks/use-tickets'
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
import { Textarea } from '@/components/ui/textarea'

type ReportTicketDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportTicketDialog({
  open,
  onOpenChange,
}: ReportTicketDialogProps) {
  const createTicket = useCreateTicket()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !createTicket.isPending

  const reset = () => {
    setTitle('')
    setCategory('')
    setDescription('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createTicket.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        ...(category.trim() ? { category: category.trim() } : {}),
      },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Lapor Masalah</DialogTitle>
          <DialogDescription>
            Sampaikan keluhan atau masalah di lingkungan RT.
          </DialogDescription>
        </DialogHeader>
        <form
          id='report-ticket-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='ticket-title'>Judul *</Label>
            <Input
              id='ticket-title'
              placeholder='Judul laporan'
              autoComplete='off'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='ticket-category'>Kategori</Label>
            <Input
              id='ticket-category'
              placeholder='Kategori (mis. kebersihan, keamanan)'
              autoComplete='off'
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='ticket-description'>Deskripsi *</Label>
            <Textarea
              id='ticket-description'
              placeholder='Ceritakan masalahnya'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' form='report-ticket-form' disabled={!canSubmit}>
            {createTicket.isPending ? 'Mengirim...' : 'Kirim Laporan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
