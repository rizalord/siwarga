import { AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeletePayment } from '@/hooks/use-payments'
import { usePaymentsContext } from './payments-provider'

export function PaymentDeleteDialog() {
  const { open, setOpen, currentRow, setCurrentRow } = usePaymentsContext()
  const deletePayment = useDeletePayment()

  return (
    <>
      {currentRow && (
        <ConfirmDialog
          key={`payment-delete-${currentRow.id}`}
          open={open === 'delete'}
          onOpenChange={() => {
            setOpen('delete')
            setTimeout(() => {
              setCurrentRow(null)
            }, 500)
          }}
          handleConfirm={() => {
            if (!currentRow) return
            deletePayment.mutate(currentRow.id, {
              onSuccess: () => {
                setOpen(null)
                setTimeout(() => {
                  setCurrentRow(null)
                }, 500)
              },
            })
          }}
          disabled={deletePayment.isPending}
          title={
            <span className='text-destructive'>
              <AlertTriangle
                className='me-1 inline-block stroke-destructive'
                size={18}
              />{' '}
              Hapus Pembayaran
            </span>
          }
          desc={
            <p>
              Apakah Anda yakin ingin menghapus pembayaran ini?
              <br />
              Tindakan ini akan menghapus pembayaran secara permanen dan
              tidak dapat dibatalkan.
            </p>
          }
          confirmText='Hapus'
          destructive
        />
      )}
    </>
  )
}
