import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useChatStore } from './chat/chatStore'
import './Login.css'

export default function Login() {
  const [usePlayerId, setUsePlayerId] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleToggle = () => {
    setUsePlayerId(prev => !prev)
    setIdentifier('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const body = usePlayerId
        ? { playerId: identifier, password }
        : { email: identifier, password }

      const res = await fetch('/api/auth/login', {
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
              <div className="auth-field-header">
                <label htmlFor="identifier">
                  {usePlayerId ? 'Player ID:' : 'Email:'}
                </label>
                <button
                  type="button"
                  className="auth-toggle-link"
                  onClick={handleToggle}
                >
                  {usePlayerId ? 'Change to Email' : 'Change to PlayerID'}
                </button>
              </div>
              <input
                id="identifier"
                type={usePlayerId ? 'text' : 'email'}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="auth-input"
                autoComplete={usePlayerId ? 'username' : 'email'}
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
