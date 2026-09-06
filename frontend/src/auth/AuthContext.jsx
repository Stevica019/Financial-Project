import { useEffect, useState } from 'react'
import { api, authenticate, requireUser } from '../api'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'checking', user: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const interceptor = api.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401 && !controller.signal.aborted) {
          setSession({ status: 'guest', user: null })
        }
        return Promise.reject(error)
      },
    )
    api.get('/user', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setSession({ status: 'authenticated', user: requireUser(data) })
    }).catch(error => {
      if (!controller.signal.aborted) {
        setSession({ status: error.response?.status === 401 ? 'guest' : 'error', user: null })
      }
    })
    return () => {
      controller.abort()
      api.interceptors.response.eject(interceptor)
    }
  }, [attempt])

  async function submit(action, values) {
    const user = await authenticate(action, values)
    setSession({ status: 'authenticated', user })
  }

  async function logout() {
    try {
      await api.get('/sanctum/csrf-cookie', { baseURL: '/' })
      await api.post('/logout')
    } catch (error) {
      if (error.response?.status !== 401) throw error
    }
    setSession({ status: 'guest', user: null })
  }

  function retry() {
    setSession({ status: 'checking', user: null })
    setAttempt(value => value + 1)
  }

  function updateUser(changes) {
    setSession(current => current.status === 'authenticated' ? { ...current, user: { ...current.user, ...changes } } : current)
  }

  return <AuthContext.Provider value={{ ...session, submit, logout, retry, updateUser }}>{children}</AuthContext.Provider>
}
