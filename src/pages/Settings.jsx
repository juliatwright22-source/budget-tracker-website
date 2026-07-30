import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePreferences } from '../context/PreferencesContext'
import { CURRENCIES, LOCALES } from '../lib/constants'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Settings() {
  const { profile, signOut, refreshProfile } = useAuth()
  const { currency, locale, date_format, reload: reloadPreferences } = usePreferences()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [currencyChoice, setCurrencyChoice] = useState(currency)
  const [localeChoice, setLocaleChoice] = useState(locale)
  const [dateFormatChoice, setDateFormatChoice] = useState(date_format)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
          <h2 className="font-serif text-xl text-navy mb-1">Account</h2>
          <p className="text-sm font-sans text-navy/50 mb-4">
            Signing out will take you back to the login page.
          </p>
          <Button variant="ghost" onClick={signOut} className="w-full">Sign out</Button>
        </Card>
      </div>
    </PageWrapper>
  )
}
