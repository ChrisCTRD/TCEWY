import { Link } from 'react-router-dom'
import useIsMobile from './useIsMobile'
import './DesktopOnly.css'

// Envolve rotas que ainda não têm layout mobile (login, register, chat).
export default function DesktopOnly({ children }) {
  const isMobile = useIsMobile()

  if (!isMobile) return children

  return (
    <div className="desktop-only">
      <img src="/tcewylogo3.png" alt="The Chat Ends With You" className="desktop-only-logo" />
      <h1 className="desktop-only-title">Screen too small</h1>
      <p className="desktop-only-text">
        Login and chat need a bigger screen for now. Open TCEWY on a computer to join the conversation.
      </p>
      <Link to="/" className="desktop-only-btn">Back to Home</Link>
    </div>
  )
}
