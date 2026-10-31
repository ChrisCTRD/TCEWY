import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Auth.css'
import { BASE } from './chat/api'

export default function Register() {
  const [form, setForm] = useState({
    playerId: '',
    displayName: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Registration failed.')
        setLoading(false)
        return
      }

      navigate('/login')
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
              <label htmlFor="playerId">Player ID:</label>
              <input
                id="playerId"
                name="playerId"
                type="text"
                value={form.playerId}
                onChange={handleChange}
                className="auth-input"
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="displayName">Display Name:</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={form.displayName}
                onChange={handleChange}
                className="auth-input"
                autoComplete="nickname"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email">Email:</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="auth-input"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password:</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>

            <p className="auth-switch">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Log In
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
          style={{ backgroundImage: 'url(/twewycover.webp)' }}
        />
      </div>
    </div>
  )
}
