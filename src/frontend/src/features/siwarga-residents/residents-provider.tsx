import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { Resident } from '@/types/api'

type ResidentsDialogType = 'create' | 'update' | 'delete'

type ResidentsContextType = {
  open: ResidentsDialogType | null
  setOpen: (str: ResidentsDialogType | null) => void
  currentRow: Resident | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Resident | null>>
}

const ResidentsContext = React.createContext<ResidentsContextType | null>(null)

export function ResidentsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<ResidentsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Resident | null>(null)

  return (
    <ResidentsContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </ResidentsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useResidentsContext = () => {
  const residentsContext = React.useContext(ResidentsContext)

  if (!residentsContext) {
    throw new Error(
      'useResidentsContext has to be used within <ResidentsProvider>'
    )
  }

  return residentsContext
}
