import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
  withCredentials: true,
  withXSRFToken: true,
  timeout: 15000,
})

export async function authenticate(action, values) {
  await api.get('/sanctum/csrf-cookie', { baseURL: '/' })
  const { data } = await api.post(`/${action}`, values)
  return requireUser(data)
}

export function requireUser(data) {
  if (!data || !Number.isInteger(data.id) || typeof data.name !== 'string' || typeof data.email !== 'string') {
    throw new Error('Unexpected session response')
  }
  return data
}

export function requestError(error) {
  switch (error.response?.status) {
    case 419: return 'Your session expired. Please try again.'
    case 429: return 'Too many attempts. Please wait a minute and try again.'
    case 409: return 'You are already signed in. Reload the page to continue.'
    case 422: return 'Please check the highlighted fields.'
    default: return 'Unable to connect right now. Please try again.'
  }
}
