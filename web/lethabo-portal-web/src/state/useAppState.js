import { createContext, useContext } from 'react'

export const AppStateContext = createContext(null)

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState must be used within AppStateProvider')
  return context
}
