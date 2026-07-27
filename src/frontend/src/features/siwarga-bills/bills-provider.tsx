import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { Bill } from '@/types/api'

type BillsDialogType = 'generate' | 'delete'

type BillsContextType = {
  open: BillsDialogType | null
  setOpen: (str: BillsDialogType | null) => void
  currentRow: Bill | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Bill | null>>
}

const BillsContext = React.createContext<BillsContextType | null>(null)

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<BillsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Bill | null>(null)

  return (
    <BillsContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </BillsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBillsContext = () => {
  const billsContext = React.useContext(BillsContext)

  if (!billsContext) {
    throw new Error(
      'useBillsContext has to be used within <BillsProvider>'
    )
  }

  return billsContext
}
