import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'

const CONFIRM_WORD = 'HAPUS'

type MultiDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  entityLabel: string
  entityLabelPlural?: string
  isLoading?: boolean
  onConfirm: () => void
}

export function MultiDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  entityLabel,
  entityLabelPlural,
  isLoading,
  onConfirm,
}: MultiDeleteDialogProps) {
  const [value, setValue] = useState('')
  const label = selectedCount > 1 ? (entityLabelPlural ?? entityLabel) : entityLabel

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setValue('')
    onOpenChange(nextOpen)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      form='multi-delete-form'
      disabled={value.trim() !== CONFIRM_WORD}
      isLoading={isLoading}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Hapus {selectedCount} {label}
        </span>
      }
      desc={
        <form
          id='multi-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            if (value.trim() !== CONFIRM_WORD) return
            onConfirm()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Apakah Anda yakin ingin menghapus {selectedCount} {label} yang
            dipilih?
            <br />
            Tindakan ini akan menghapus data secara permanen dan tidak dapat
            dibatalkan.
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span>Konfirmasi dengan mengetik &quot;{CONFIRM_WORD}&quot;:</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Ketik "${CONFIRM_WORD}" untuk konfirmasi.`}
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
