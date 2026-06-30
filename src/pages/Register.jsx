import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Register() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords don\'t match — try again.'); return }
    if (password.length < 6) { setError('Password needs to be at least 6 characters.'); return }
    setLoading(true)

    const { data, error: signupErr } = await supabase.auth.signUp({ email, password })
    if (signupErr) { setError('Couldn\'t create your account. Try a different email.'); setLoading(false); return }

    // Create profile
    await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: displayName,
    })

    setLoading(false)
    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-navy">Yachty</h1>
          <p className="text-navy/50 font-sans text-sm mt-2">Set sail on your finances.</p>
        </div>

        <div className="bg-white rounded-2xl border border-navy/15 p-8 shadow-sm">
          <h2 className="font-serif text-2xl text-navy mb-6">Create your account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Your name"
              type="text"
              placeholder="e.g. Alex"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
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
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-orange">{error}</p>}
            <Button type="submit" variant="cta" disabled={loading} className="w-full mt-1">
              {loading ? 'Creating account…' : 'Get started'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm font-sans text-navy/50 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
