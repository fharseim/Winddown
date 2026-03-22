import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import RechnerPage from './RechnerPage.jsx'
import ImpressumPage from './ImpressumPage.jsx'
import DatenschutzPage from './DatenschutzPage.jsx'
import IntakePage from './IntakePage.jsx'
import AdminLogin from './AdminLogin.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import AdminCaseDetail from './AdminCaseDetail.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/rechner" element={<RechnerPage />} />
        <Route path="/intake" element={<IntakePage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/case/:id" element={<AdminCaseDetail />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
