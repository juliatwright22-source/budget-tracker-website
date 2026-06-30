import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Settings() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', profile.id)
    await refreshProfile()
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
              <p className="text-sm font-sans text-navy/60 px-4 py-2.5 rounded-lg bg-navy/5">USD — United States Dollar</p>
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
