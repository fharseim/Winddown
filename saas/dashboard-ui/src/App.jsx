import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import ApiKeysPage from './pages/ApiKeysPage.jsx'
import BillingPage from './pages/BillingPage.jsx'
import DocsPage from './pages/DocsPage.jsx'
import DownloadPage from './pages/DownloadPage.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const loading = session === undefined

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/login" element={!loading && session ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/dashboard" element={loading ? null : session ? <DashboardLayout /> : <Navigate to="/login" />}>
        <Route index element={<DashboardHome />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="keys" element={<ApiKeysPage />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>
    </Routes>
  )
}
