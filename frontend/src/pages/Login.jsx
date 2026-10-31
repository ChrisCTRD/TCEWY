import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useChatStore } from './chat/chatStore'
import './Auth.css'
import { BASE } from './chat/api'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // um único campo: se tem "@" é email, senão é PlayerID (ambos sempre em minúsculo)
      const value = identifier.trim().toLowerCase()
      const body = value.includes('@')
        ? { email: value, password }
        : { playerId: value, password }

      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Login failed.')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      useChatStore.getState().reset() // limpa estado/socket de uma conta anterior
      navigate('/chat')
    } catch (err) {
      setError('Could not connect to the server.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Left: Form */}
        <div className="auth-form-side">
          <Link to="/">
          <img
            src="/tcewylogo3.png"
            alt="The Chat Ends With You"
            className="auth-logo"
          />
          </Link>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="identifier">Email or Player ID:</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError('') }}
                className="auth-input"
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password:</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-input"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <p className="auth-switch">
              New here?{' '}
              <Link to="/register" className="auth-link">
                Create Your Account
              </Link>
            </p>
          </form>
          <footer className="footer-left">
            <p>© SQUARE ENIX CO., LTD. All Rights Reserved.</p>
            <p>The Chat Ends With You is an unofficial fan project, not affiliated with or endorsed by Square Enix.</p>
          </footer>
        </div>

        {/* Right: Cover image */}
        <div
          className="auth-image-side"
          style={{ backgroundImage: 'url(/neotwewycover.webp)' }}
        />
      </div>
    </div>
  )
}
