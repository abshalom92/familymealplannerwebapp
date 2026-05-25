import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const FIFTEEN_MINUTES = 15 * 60 * 1000

export default function GuestPromptModal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user?.isGuest) {
      setShow(false)
      return
    }

    const check = () => {
      const loginTime = parseInt(localStorage.getItem('guestLoginTime') || '0', 10)
      if (loginTime && Date.now() - loginTime >= FIFTEEN_MINUTES) {
        setShow(true)
      }
    }

    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [user])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <p className="text-3xl text-center mb-2">👋</p>
        <h2 className="text-lg font-bold text-gray-800 text-center mb-2">Enjoying the app?</h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          You've been exploring for 15 minutes. Create a free account to save your meal plans, grocery lists, and more.
        </p>
        <button
          onClick={() => { setShow(false); navigate('/') }}
          className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors mb-2"
        >
          Create an Account
        </button>
        <button
          onClick={() => setShow(false)}
          className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  )
}
