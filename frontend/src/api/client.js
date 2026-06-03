import axios from 'axios'
import { offlineDB } from '../lib/offlineDB'

const api = axios.create({ baseURL: '/api', withCredentials: true })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let _refreshing = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      // Deduplicate concurrent refresh calls
      if (!_refreshing) {
        _refreshing = axios
          .post('/api/auth/refresh', {}, { withCredentials: true })
          .then(({ data }) => {
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify({ username: data.username, isGuest: data.is_guest }))
            offlineDB.saveToken(data.access_token)
            return data.access_token
          })
          .catch(() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/'
            return Promise.reject(new Error('Session expired'))
          })
          .finally(() => { _refreshing = null })
      }

      try {
        const newToken = await _refreshing
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
