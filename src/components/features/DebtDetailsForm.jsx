import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function DebtDetailsForm({ account, onSuccess }) {
  const { user } = useAuth()
  const [loaded, setLoaded] = useState(false)
  const [interestRate, setInterestRate] = useState('0')
  const [minimumPayment, setMinimumPayment] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.from('debt_details').select('*').eq('account_id', account.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setInterestRate(String(data?.interest_rate ?? 0))
        setMinimumPayment(String(data?.minimum_payment ?? 0))
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [account.id])

  async function save() {
    setSaving(true)
    await supabase.from('debt_details').upsert({
      account_id: account.id,
      user_id: user.id,
      interest_rate: Number(interestRate) || 0,
      minimum_payment: Number(minimumPayment) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' })
    setSaving(false)
    onSuccess?.()
  }

  if (!loaded) return <p className="text-navy/40 font-sans text-sm text-center py-8">Loading…</p>

  return (
    <div className="flex flex-col gap-4">
      <Input label="Interest rate (APR %)" type="number" min="0" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="e.g. 19.99" />
      <Input label="Minimum payment (USD/month)" type="number" min="0" step="0.01" value={minimumPayment} onChange={e => setMinimumPayment(e.target.value)} placeholder="e.g. 50" />
      <Button variant="cta" onClick={save} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}
