import { useEffect, useState } from 'react'
import { api, requestError } from './api'

export function useRemote(path) {
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
  }, [path, attempt])

  function reload() {
    setState({ loading: true, data: null, error: '' })
    setAttempt(value => value + 1)
  }
  function refresh() { setAttempt(value => value + 1) }
  return { ...(state.path === path ? state : { loading: true, data: null, error: '' }), reload, refresh }
}
