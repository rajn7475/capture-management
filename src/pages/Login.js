import React, { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      if (!fullName.trim()) { setError('Full name is required'); setLoading(false); return }
      const { error } = await signUp(email, password, fullName)
      if (error) setError(error.message)
      else setMessage('Account created! Check your email to confirm, then sign in.')
    }
    setLoading(false)
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-diamond">◆</span>
          <span className="login-name">Capture</span>
        </div>
        <p className="login-tagline">Federal BD Pipeline</p>

        <div className="login-toggle">
          <button className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Sign In</button>
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Create Account</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <div className="fgroup">
              <label>Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required />
            </div>
          )}
          <div className="fgroup">
            <label>Work Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="fgroup">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'} required minLength={8} />
          </div>
          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-success">{message}</div>}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>
      </div>
    </div>
  )
}
