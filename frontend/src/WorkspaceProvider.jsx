import { useCallback, useMemo, useState } from 'react'
import { WorkspaceContext } from './workspace'

export default function WorkspaceProvider({ children }) {
  const [request, setRequest] = useState(null)
  const [revision, setRevision] = useState(0)
  const openActivity = useCallback((options = {}) => setRequest(options), [])
  const closeActivity = useCallback(() => setRequest(null), [])
  const notifyChange = useCallback(() => setRevision(value => value + 1), [])
  const value = useMemo(() => ({ revision, request, openActivity, closeActivity, notifyChange }), [revision, request, openActivity, closeActivity, notifyChange])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
