import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import CalendarPage from './pages/CalendarPage'
import GroceryPage from './pages/GroceryPage'
import RecipePage from './pages/RecipePage'
import FamilyPage from './pages/FamilyPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import InboxPage from './pages/InboxPage'
import VaultPage from './pages/VaultPage'
import LegalPage from './pages/LegalPage'
import FeedbackPage from './pages/FeedbackPage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import GuestPromptModal from './components/GuestPromptModal'
import InstallPromptBanner from './components/InstallPromptBanner'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return (
    <>
      <Navbar />
      <main className="pb-9">{children}</main>
    </>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/legal"     element={<LegalPage />} />
      <Route path="/feedback"  element={<FeedbackPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/calendar"  element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/grocery"   element={<ProtectedRoute><GroceryPage /></ProtectedRoute>} />
      <Route path="/recipe/:id" element={<ProtectedRoute><RecipePage /></ProtectedRoute>} />
      <Route path="/family"    element={<ProtectedRoute><FamilyPage /></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/inbox"     element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
      <Route path="/vault"     element={<ProtectedRoute><VaultPage /></ProtectedRoute>} />
    </Routes>
    <Footer />
    <GuestPromptModal />
    <InstallPromptBanner />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
