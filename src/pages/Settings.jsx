import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePreferences } from '../context/PreferencesContext'
import { CURRENCIES, LOCALES } from '../lib/constants'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Settings() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { currency, locale, date_format, reload: reloadPreferences } = usePreferences()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [currencyChoice, setCurrencyChoice] = useState(currency)
  const [localeChoice, setLocaleChoice] = useState(locale)
  const [dateFormatChoice, setDateFormatChoice] = useState(date_format)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [mfaFactor, setMfaFactor] = useState(null)
  const [mfaLoaded, setMfaLoaded] = useState(false)
  const [enrollData, setEnrollData] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)

  useEffect(() => { loadMfaFactor() }, [])

  async function loadMfaFactor() {
    const { data } = await supabase.auth.mfa.listFactors()
    setMfaFactor(data?.totp?.find(f => f.status === 'verified') ?? null)
    setMfaLoaded(true)
  }

  async function startEnroll() {
    setMfaError(''); setMfaBusy(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setMfaBusy(false)
    if (error) { setMfaError('Could not start setup. Try again.'); return }
    setEnrollData(data)
  }

  async function confirmEnroll() {
    if (verifyCode.length !== 6) return
    setMfaError(''); setMfaBusy(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollData.id, code: verifyCode })
    setMfaBusy(false)
    if (error) { setMfaError("That code didn't work — check your app and try again."); return }
    setEnrollData(null); setVerifyCode('')
    await loadMfaFactor()
  }

  async function cancelEnroll() {
    if (enrollData) await supabase.auth.mfa.unenroll({ factorId: enrollData.id })
    setEnrollData(null); setVerifyCode(''); setMfaError('')
  }

  async function turnOffMfa() {
    if (!confirm('Turn off two-factor authentication?')) return
    setMfaBusy(true)
    await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id })
    setMfaBusy(false)
    await loadMfaFactor()
  }

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteAccount() {
    setDeleting(true); setDeleteError('')
    const { data, error } = await supabase.functions.invoke('delete-account')
    setDeleting(false)
    if (error || !data?.success) {
      setDeleteError("Something went wrong — your account wasn't deleted. Try again.")
      return
    }
    await signOut()
    navigate('/login')
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({
      display_name: name.trim(),
      currency: currencyChoice,
      locale: localeChoice,
      date_format: dateFormatChoice,
    }).eq('id', profile.id)
    await Promise.all([refreshProfile(), reloadPreferences()])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <PageWrapper>
      <h1 className="font-serif text-3xl text-navy mb-8">Settings</h1>

      <div className="max-w-md flex flex-col gap-5">
        <Card>
          <h2 className="font-serif text-xl text-navy mb-4">Your profile</h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Display name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
            <div>
              <label className="text-sm font-medium text-navy block mb-1">Currency</label>
              <select
                value={currencyChoice}
                onChange={e => setCurrencyChoice(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue/40"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-navy block mb-1">Language & region</label>
              <select
                value={localeChoice}
                onChange={e => setLocaleChoice(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue/40"
              >
                {LOCALES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-navy block mb-1">Date format</label>
              <select
                value={dateFormatChoice}
                onChange={e => setDateFormatChoice(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue/40"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <Button variant="primary" onClick={save} disabled={saving} className="w-full">
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-serif text-xl text-navy mb-1">Two-factor authentication</h2>
          {!mfaLoaded ? (
            <p className="text-sm font-sans text-navy/40 mt-3">Loading…</p>
          ) : enrollData ? (
            <div className="flex flex-col gap-4 mt-3">
              <p className="text-sm font-sans text-navy/60">
                Scan this with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code it shows.
              </p>
              <img src={enrollData.totp.qr_code} alt="Scan with your authenticator app" className="w-40 h-40 mx-auto" />
              <p className="text-xs font-sans text-navy/40 text-center break-all">
                Can't scan? Enter this code manually: {enrollData.totp.secret}
              </p>
              <Input
                label="6-digit code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
              {mfaError && <p className="text-sm text-orange">{mfaError}</p>}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={cancelEnroll} className="flex-1">Cancel</Button>
                <Button variant="primary" onClick={confirmEnroll} disabled={mfaBusy || verifyCode.length !== 6} className="flex-1">
                  {mfaBusy ? 'Verifying…' : 'Confirm'}
                </Button>
              </div>
            </div>
          ) : mfaFactor ? (
            <div className="mt-3">
              <p className="text-sm font-sans text-blue mb-4">Two-factor authentication is on.</p>
              <Button variant="ghost" onClick={turnOffMfa} disabled={mfaBusy} className="w-full">
                {mfaBusy ? 'Turning off…' : 'Turn off'}
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-sans text-navy/50 mb-4">
                Add an extra layer of security — you'll need a code from an authenticator app to sign in.
              </p>
              {mfaError && <p className="text-sm text-orange mb-3">{mfaError}</p>}
              <Button variant="primary" onClick={startEnroll} disabled={mfaBusy} className="w-full">
                {mfaBusy ? 'Starting…' : 'Enable 2FA'}
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-serif text-xl text-navy mb-1">Account</h2>
          <p className="text-sm font-sans text-navy/50 mb-4">
            Signing out will take you back to the login page.
          </p>
          <Button variant="ghost" onClick={signOut} className="w-full">Sign out</Button>
        </Card>

        <Card className="border-orange/30">
          <h2 className="font-serif text-xl text-orange mb-1">Danger zone</h2>
          <p className="text-sm font-sans text-navy/50 mb-4">
            Permanently delete your account and everything in it — transactions, accounts, goals, all of it.
            This can't be undone.
          </p>
          <Button
            variant="ghost"
            onClick={() => { setDeleteOpen(true); setDeleteConfirmText(''); setDeleteError('') }}
            className="w-full text-orange hover:bg-orange/5"
          >
            Delete my account
          </Button>
        </Card>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-sans text-navy/70">
            This permanently deletes your login and every transaction, account, category, goal, and setting
            attached to it. There's no undo. Type <span className="font-semibold text-navy">DELETE</span> to confirm.
          </p>
          <Input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
          />
          {deleteError && <p className="text-sm text-orange">{deleteError}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
            <Button
              variant="cta"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              className="flex-1"
            >
              {deleting ? 'Deleting…' : 'Delete forever'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
