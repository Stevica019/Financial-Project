import { createContext, useContext } from 'react'

// Shared by the header, pages and the quick-add dialog. Defaults keep components usable without a provider in tests.
export const WorkspaceContext = createContext({ revision: 0, request: null, openActivity: () => {}, closeActivity: () => {}, notifyChange: () => {} })

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
