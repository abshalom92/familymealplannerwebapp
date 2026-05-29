import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify({ username: data.username, isGuest: data.is_guest }))
    setUser({ username: data.username, isGuest: data.is_guest })
  }

  const register = async (username, email, password, inviteCode) => {
    const { data } = await api.post('/auth/register', { username, email, password, invite_code: inviteCode })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify({ username: data.username, isGuest: data.is_guest }))
    setUser({ username: data.username, isGuest: data.is_guest })
  }

  const guestLogin = async () => {
    const { data } = await api.post('/auth/guest')
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify({ username: data.username, isGuest: true }))
    localStorage.setItem('guestLoginTime', String(Date.now()))
    setUser({ username: data.username, isGuest: true })
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('guestLoginTime')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
