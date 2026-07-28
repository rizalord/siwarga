import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { House } from '@/types/api'

type HousesDialogType = 'create' | 'update' | 'delete' | 'assign' | 'vacate'

type HousesContextType = {
  open: HousesDialogType | null
  setOpen: (str: HousesDialogType | null) => void
  currentRow: House | null
  setCurrentRow: React.Dispatch<React.SetStateAction<House | null>>
}

const HousesContext = React.createContext<HousesContextType | null>(null)

export function HousesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<HousesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<House | null>(null)

  return (
    <HousesContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </HousesContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useHousesContext = () => {
  const housesContext = React.useContext(HousesContext)

  if (!housesContext) {
    throw new Error(
      'useHousesContext has to be used within <HousesProvider>'
    )
  }

  return housesContext
}
