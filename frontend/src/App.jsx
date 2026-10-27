import { Routes, Route } from 'react-router-dom'
import NotFound from './pages/NotFound'
import InfoPage from './pages/InfoPage'
import Login from './pages/Login'
import Register from './pages/Register'
import AppShell from "./pages/chat/AppShell";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InfoPage />} />
      <Route path="/about" element={<InfoPage />} />
      <Route path="/tos" element={<InfoPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/chat" element={<AppShell />} />
      <Route path="/chat/:id" element={<AppShell />} />
    </Routes>
  )
}