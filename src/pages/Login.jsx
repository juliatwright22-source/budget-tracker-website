import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError('Couldn\'t sign you in — double-check your email and password.'); return }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-navy">Yachty</h1>
          <p className="text-navy/50 font-sans text-sm mt-2">Set sail on your finances.</p>
        </div>

        <div className="bg-white rounded-2xl border border-navy/15 p-8 shadow-sm">
          <h2 className="font-serif text-2xl text-navy mb-6">Welcome back</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-orange">{error}</p>}
            <Button type="submit" variant="primary" disabled={loading} className="w-full mt-1">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm font-sans text-navy/50 mt-6">
          New to Yachty?{' '}
          <Link to="/register" className="text-blue hover:underline font-medium">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
