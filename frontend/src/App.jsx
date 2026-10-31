import { Routes, Route } from 'react-router-dom'
import NotFound from './pages/NotFound'
import InfoPage from './pages/InfoPage'
import Login from './pages/Login'
import Register from './pages/Register'
import AppShell from "./pages/chat/AppShell";
import DesktopOnly from './pages/DesktopOnly'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InfoPage />} />
      <Route path="/about" element={<InfoPage />} />
      <Route path="/tos" element={<InfoPage />} />
      <Route path="/login" element={<DesktopOnly><Login /></DesktopOnly>} />
      <Route path="/register" element={<DesktopOnly><Register /></DesktopOnly>} />
      <Route path="/chat" element={<DesktopOnly><AppShell /></DesktopOnly>} />
      <Route path="/chat/:id" element={<DesktopOnly><AppShell /></DesktopOnly>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
