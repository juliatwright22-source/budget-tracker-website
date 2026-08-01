import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useBudget } from '../../context/BudgetContext'
import { useAccounts } from '../../context/AccountsContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'annually', label: 'Annually' },
]

export default function RecurringRuleForm({ onSuccess, defaultValues = {} }) {
  const { user } = useAuth()
  const { categories, reload } = useBudget()
  const { cashAccounts } = useAccounts() ?? { cashAccounts: [] }
  const [type, setType] = useState(defaultValues.type ?? 'expense')
  const [name, setName] = useState(defaultValues.name ?? '')
  const [amount, setAmount] = useState(defaultValues.amount != null ? String(defaultValues.amount) : '')
  const [categoryId, setCategoryId] = useState(defaultValues.category_id ?? '')
  const [accountId, setAccountId] = useState(defaultValues.account_id ?? '')
  const [frequency, setFrequency] = useState(defaultValues.frequency ?? 'monthly')
  const [startDate, setStartDate] = useState(defaultValues.start_date ?? new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(defaultValues.end_date ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Please name this recurring item.'); return }
    if (!amount || isNaN(Number(amount))) { setError('Please enter a valid amount.'); return }
    setSaving(true); setError('')

    const payload = {
      type,
      name: name.trim(),
      amount: Number(amount),
      category_id: type === 'expense' && categoryId ? categoryId : null,
      account_id: accountId || null,
      frequency,
      start_date: startDate,
      end_date: endDate || null,
    }

    const { error: dbErr } = defaultValues.id
      ? await supabase.from('recurring_rules').update(payload).eq('id', defaultValues.id)
      : await supabase.from('recurring_rules').insert({ ...payload, user_id: user.id, next_occurrence: startDate })

    setSaving(false)
    if (dbErr) { setError('Something went wrong. Try again.'); return }
    await reload()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex rounded-lg overflow-hidden border border-navy/20">
        {['expense', 'income'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2.5 text-sm font-medium font-sans capitalize transition-colors
              ${type === t
                ? t === 'expense' ? 'bg-orange text-white' : 'bg-blue text-white'
                : 'bg-white text-navy/50 hover:bg-navy/5'}`}
          >
            {t === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder={type === 'expense' ? 'e.g. Rent' : 'e.g. Paycheck'} />
      <Input label="Amount (USD)" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />

      {type === 'expense' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy">Category</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
              focus:outline-none focus:ring-2 focus:ring-blue/40"
          >
            <option value="">No category</option>
            {categories.filter(c => !c.is_hidden).map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
      )}

      {cashAccounts.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy">Account (optional)</label>
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
              focus:outline-none focus:ring-2 focus:ring-blue/40"
          >
            <option value="">No account</option>
            {cashAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-navy">Repeats</label>
        <select
          value={frequency}
          onChange={e => setFrequency(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
            focus:outline-none focus:ring-2 focus:ring-blue/40"
        >
          {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <Input label="Starts on" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      <Input label="Ends on (optional)" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" variant="cta" disabled={saving} className="w-full mt-1">
        {saving ? 'Saving…' : defaultValues.id ? 'Save changes' : 'Add recurring item'}
      </Button>
    </form>
  )
}
