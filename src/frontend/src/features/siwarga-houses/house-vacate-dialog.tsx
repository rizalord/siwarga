import { AlertTriangle } from 'lucide-react'
import { useVacateResident } from '@/hooks/use-houses'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { House } from '@/types/api'

type HouseVacateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: House
}

export function HouseVacateDialog({
  open,
  onOpenChange,
  currentRow,
}: HouseVacateDialogProps) {
  const vacateResident = useVacateResident()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={() => {
        vacateResident.mutate(currentRow.id, {
          onSuccess: () => onOpenChange(false),
        })
      }}
      isLoading={vacateResident.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Kosongkan Rumah
        </span>
      }
      desc={
        <p>
          Apakah Anda yakin ingin mencopot{' '}
          <span className='font-bold'>
            {currentRow.current_resident?.full_name}
          </span>{' '}
          dari rumah <span className='font-bold'>{currentRow.house_number}</span>?
          <br />
          Riwayat hunian akan tetap tersimpan, namun rumah akan berstatus
          kosong hingga penghuni baru ditugaskan.
        </p>
      }
      confirmText='Kosongkan'
      destructive
    />
  )
}
