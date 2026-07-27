import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteResident } from '@/hooks/use-residents'
import type { Resident } from '@/types/api'

type ResidentDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Resident
}

export function ResidentDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: ResidentDeleteDialogProps) {
  const [value, setValue] = useState('')
  const deleteResident = useDeleteResident()

  const handleDelete = () => {
    if (value.trim() !== currentRow.full_name) return

    deleteResident.mutate(currentRow.id, {
      onSuccess: () => {
        onOpenChange(false)
        setValue('')
      },
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='resident-delete-form'
      disabled={value.trim() !== currentRow.full_name}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Hapus Penghuni
        </span>
      }
      desc={
        <form
          id='resident-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Apakah Anda yakin ingin menghapus{' '}
            <span className='font-bold'>{currentRow.full_name}</span>?
            <br />
            Tindakan ini akan menghapus data penghuni secara permanen dan
            tidak dapat dibatalkan.
          </p>

          <Label className='my-2'>
            Nama Lengkap:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Ketik nama lengkap untuk konfirmasi.'
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Peringatan!</AlertTitle>
            <AlertDescription>
              Harap berhati-hati, operasi ini tidak dapat dibatalkan.
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText='Hapus'
      destructive
    />
  )
}
