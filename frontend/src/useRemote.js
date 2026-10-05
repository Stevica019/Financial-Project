import { useCallback, useEffect, useState } from 'react'
import { api, requestError } from './api'
import { useWorkspace } from './workspace'

// keepPrevious: while a new path loads, keep returning the previous data with `updating: true`,
// so filtered lists don't flash a spinner on every change.
export function useRemote(path, { keepPrevious = false } = {}) {
  // A workspace revision change (for example after a quick add) refetches without hiding current data.
  const { revision } = useWorkspace()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    api.get(path, { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setState({ path, loading: false, data, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) {
        const messages = error.response?.status === 422 ? Object.values(error.response.data.errors ?? {}).flat().join(' ') : ''
        setState({ path, loading: false, data: null, error: messages || requestError(error) })
      }
    })
    return () => controller.abort()
  }, [path, attempt, revision])

  const reload = useCallback(() => {
    setState({ loading: true, data: null, error: '' })
    setAttempt(value => value + 1)
  }, [])
  const refresh = useCallback(() => setAttempt(value => value + 1), [])
  if (state.path === path) return { ...state, updating: false, reload, refresh }
  if (keepPrevious && state.data) return { ...state, updating: true, reload, refresh }
  return { loading: true, data: null, error: '', updating: false, reload, refresh }
}
