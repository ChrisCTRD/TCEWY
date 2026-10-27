import { NavLink } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Home</NavLink>
      <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>About</NavLink>
      <NavLink to="/tos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>TOS</NavLink>
      <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Login</NavLink>
    </nav>
  )
}