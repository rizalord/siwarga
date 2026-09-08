import { useState } from 'react'
import { useCreatePoll } from '@/hooks/use-polls'
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

type PollFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PollFormDialog({ open, onOpenChange }: PollFormDialogProps) {
  const createPoll = useCreatePoll()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])

  const trimmedOptions = options.map((o) => o.trim()).filter(Boolean)
  const canSubmit =
    title.trim().length > 0 &&
    startsAt.length > 0 &&
    endsAt.length > 0 &&
    trimmedOptions.length >= 2 &&
    !createPoll.isPending

  const reset = () => {
    setTitle('')
    setDescription('')
    setStartsAt('')
    setEndsAt('')
    setOptions(['', ''])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createPoll.mutate(
      {
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        options: trimmedOptions,
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
          <DialogTitle>Buat Polling</DialogTitle>
          <DialogDescription>
            Tambahkan polling baru. Minimal 2 opsi jawaban.
          </DialogDescription>
        </DialogHeader>
        <form
          id='poll-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='poll-title'>Judul *</Label>
            <Input
              id='poll-title'
              placeholder='Judul polling'
              autoComplete='off'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='poll-description'>Deskripsi</Label>
            <Textarea
              id='poll-description'
              placeholder='Deskripsi polling (opsional)'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='poll-starts-at'>Mulai *</Label>
              <Input
                id='poll-starts-at'
                type='datetime-local'
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='poll-ends-at'>Selesai *</Label>
              <Input
                id='poll-ends-at'
                type='datetime-local'
                value={endsAt}
                min={startsAt || undefined}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>Opsi jawaban * (min. 2)</Label>
            {options.map((option, index) => (
              <div key={index} className='flex items-center gap-2'>
                <Input
                  placeholder={`Opsi ${index + 1}`}
                  aria-label={`Opsi ${index + 1}`}
                  autoComplete='off'
                  value={option}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((o, i) => (i === index ? e.target.value : o))
                    )
                  }
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  aria-label={`Hapus opsi ${index + 1}`}
                  disabled={options.length <= 2}
                  onClick={() =>
                    setOptions((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Hapus
                </Button>
              </div>
            ))}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setOptions((prev) => [...prev, ''])}
            >
              Tambah opsi
            </Button>
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' form='poll-form' disabled={!canSubmit}>
            {createPoll.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
