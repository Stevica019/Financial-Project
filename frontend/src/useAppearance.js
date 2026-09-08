import { createContext, useContext } from 'react'

export const AppearanceContext = createContext(null)

export function useAppearance() {
  return useContext(AppearanceContext)
}
