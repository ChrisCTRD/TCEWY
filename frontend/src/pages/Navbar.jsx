import { NavLink } from 'react-router-dom'

// Estilos da navbar ficam em InfoPage.css (só é usada nas páginas Home/About/TOS).
const linkClass = (extra = '') => ({ isActive }) =>
  ['info-nav-item', isActive && 'active', extra].filter(Boolean).join(' ')

export default function Navbar() {
  return (
    <nav className="info-navbar">
      <NavLink to="/" className={linkClass()}>Home</NavLink>
      <NavLink to="/about" className={linkClass()}>About</NavLink>
      <NavLink to="/tos" className={linkClass()}>TOS</NavLink>
      <NavLink to="/login" className={linkClass('info-nav-item--login')}>Login</NavLink>
    </nav>
  )
}
