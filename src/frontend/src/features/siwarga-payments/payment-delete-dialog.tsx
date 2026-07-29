import { AlertTriangle } from 'lucide-react'
import {
  useDeletePayment,
  useForceDeletePayment,
  useRestorePayment,
} from '@/hooks/use-payments'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { usePaymentsContext } from './payments-provider'

export function PaymentDeleteDialog() {
  const { open, setOpen, currentRow, setCurrentRow } = usePaymentsContext()
  const deletePayment = useDeletePayment()
  const restorePayment = useRestorePayment()
  const forceDeletePayment = useForceDeletePayment()

  return (
    <>
      {currentRow && (
        <>
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
                Tindakan ini akan memindahkan pembayaran ke data terhapus.
              </p>
            }
            confirmText='Hapus'
            destructive
          />

          <ConfirmDialog
            key={`payment-restore-${currentRow.id}`}
            open={open === 'restore'}
            onOpenChange={() => {
              setOpen('restore')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              restorePayment.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={restorePayment.isPending}
            isLoading={restorePayment.isPending}
            title='Pulihkan Pembayaran'
            desc={<p>Apakah Anda yakin ingin memulihkan pembayaran ini?</p>}
            confirmText='Pulihkan'
          />

          <ConfirmDialog
            key={`payment-force-delete-${currentRow.id}`}
            open={open === 'force-delete'}
            onOpenChange={() => {
              setOpen('force-delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={() => {
              forceDeletePayment.mutate(currentRow.id, {
                onSuccess: () => {
                  setOpen(null)
                  setTimeout(() => {
                    setCurrentRow(null)
                  }, 500)
                },
              })
            }}
            disabled={forceDeletePayment.isPending}
            isLoading={forceDeletePayment.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Permanen Pembayaran
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus permanen pembayaran ini?
                <br />
                Tindakan ini tidak dapat dibatalkan.
              </p>
            }
            confirmText='Hapus Permanen'
            destructive
          />
        </>
      )}
    </>
  )
}
