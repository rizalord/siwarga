import React, { useState } from 'react'
import type { Payment } from '@/types/api'
import useDialogState from '@/hooks/use-dialog-state'

type PaymentsDialogType = 'create' | 'delete' | 'restore' | 'force-delete'

type PaymentsContextType = {
  open: PaymentsDialogType | null
  setOpen: (str: PaymentsDialogType | null) => void
  currentRow: Payment | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Payment | null>>
}

const PaymentsContext = React.createContext<PaymentsContextType | null>(null)

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<PaymentsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Payment | null>(null)

  return (
    <PaymentsContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </PaymentsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePaymentsContext = () => {
  const paymentsContext = React.useContext(PaymentsContext)

  if (!paymentsContext) {
    throw new Error(
      'usePaymentsContext has to be used within <PaymentsProvider>'
    )
  }

  return paymentsContext
}
