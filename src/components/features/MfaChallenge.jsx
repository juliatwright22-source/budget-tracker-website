import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function MfaChallenge() {
  const { signOut, refreshMfaStatus } = useAuth()
  const [factorId, setFactorId] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totpFactor = data?.totp?.[0]
      setFactorId(totpFactor?.id ?? null)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!factorId || code.length !== 6) return
    setVerifying(true); setError('')
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    setVerifying(false)
    if (err) { setError("That code didn't work — check your app and try again."); return }
    await refreshMfaStatus()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-navy">Yachty</h1>
          <p className="text-navy/50 font-sans text-sm mt-2">Set sail on your finances.</p>
        </div>

        <div className="bg-white rounded-2xl border border-navy/15 p-8 shadow-sm">
          <h2 className="font-serif text-2xl text-navy mb-2">Two-factor verification</h2>
          <p className="text-sm font-sans text-navy/60 mb-6">
            Enter the 6-digit code from your authenticator app.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />
            {error && <p className="text-sm text-orange">{error}</p>}
            <Button type="submit" variant="primary" disabled={verifying || code.length !== 6} className="w-full mt-1">
              {verifying ? 'Verifying…' : 'Verify'}
            </Button>
          </form>
        </div>

        <button
          onClick={signOut}
          className="w-full mt-6 text-center text-sm font-sans text-navy/50 hover:text-navy/70 transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}
