import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteHouse } from '@/hooks/use-houses'
import type { House } from '@/types/api'

type HouseDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: House
}

export function HouseDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: HouseDeleteDialogProps) {
  const [value, setValue] = useState('')
  const deleteHouse = useDeleteHouse()

  const handleDelete = () => {
    if (value.trim() !== currentRow.house_number) return

    deleteHouse.mutate(currentRow.id, {
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
      form='house-delete-form'
      disabled={value.trim() !== currentRow.house_number}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Hapus Rumah
        </span>
      }
      desc={
        <form
          id='house-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Apakah Anda yakin ingin menghapus{' '}
            <span className='font-bold'>{currentRow.house_number}</span>?
            <br />
            Tindakan ini akan menghapus data rumah secara permanen dan
            tidak dapat dibatalkan.
          </p>

          <Label className='my-2'>
            Nomor Rumah:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Ketik nomor rumah untuk konfirmasi.'
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
