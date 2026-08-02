import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useGoals } from '../../context/GoalsContext'
import { useAccounts } from '../../context/AccountsContext'
import { GOAL_TEMPLATES } from '../../lib/constants'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function GoalForm({ onSuccess, defaultValues = {} }) {
  const { user } = useAuth()
  const { goals, reload } = useGoals()
  const { activeAccounts } = useAccounts()
  const linkableAccounts = activeAccounts

  const [template, setTemplate] = useState(defaultValues.template ?? 'custom')
  const [name, setName] = useState(defaultValues.name ?? '')
  const [emoji, setEmoji] = useState(defaultValues.emoji ?? '🎯')
  const [targetBasis, setTargetBasis] = useState(defaultValues.target_basis ?? 'fixed_amount')
  const [targetAmount, setTargetAmount] = useState(defaultValues.target_amount != null ? String(defaultValues.target_amount) : '')
  const [targetMonthsExpenses, setTargetMonthsExpenses] = useState(defaultValues.target_months_expenses != null ? String(defaultValues.target_months_expenses) : '3')
  const [targetDate, setTargetDate] = useState(defaultValues.target_date ?? '')
  const [linkedAccountId, setLinkedAccountId] = useState(defaultValues.linked_account_id ?? '')
  const [capAmount, setCapAmount] = useState(defaultValues.cap_amount != null ? String(defaultValues.cap_amount) : '')
  const [overflowGoalId, setOverflowGoalId] = useState(
    defaultValues.overflow_goal_id ?? (goals.find(g => g.id !== defaultValues.id)?.id ?? '')
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const otherGoals = goals.filter(g => g.id !== defaultValues.id)
  const selectedAccount = activeAccounts.find(a => a.id === linkedAccountId)
  const isDebtLinked = selectedAccount?.account_class === 'debt'

  function handleLinkAccount(accountId) {
    setLinkedAccountId(accountId)
    const account = activeAccounts.find(a => a.id === accountId)
    if (account?.account_class === 'debt' && targetBasis === 'fixed_amount' && !targetAmount) {
      setTargetAmount(String(account.current_balance))
    }
  }

  function applyTemplate(key) {
    setTemplate(key)
    const t = GOAL_TEMPLATES.find(g => g.key === key)
    if (!t) return
    setName(t.label)
    setEmoji(t.emoji)
    setTargetBasis(t.target_basis)
    if (t.target_months_expenses) setTargetMonthsExpenses(String(t.target_months_expenses))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Please name this goal.'); return }
    if (targetBasis === 'fixed_amount' && !targetAmount) { setError('Please enter a target amount.'); return }
    setSaving(true); setError('')

    const payload = {
      name: name.trim(),
      emoji,
      template,
      target_basis: targetBasis,
      target_amount: targetBasis === 'fixed_amount' ? Number(targetAmount) : null,
      target_months_expenses: targetBasis === 'n_months_expenses' ? Number(targetMonthsExpenses) || null : null,
      target_date: targetDate || null,
      linked_account_id: linkedAccountId || null,
      cap_amount: !isDebtLinked && capAmount !== '' ? Number(capAmount) : null,
      overflow_goal_id: !isDebtLinked && capAmount !== '' && overflowGoalId ? overflowGoalId : null,
    }

    const { error: dbErr } = defaultValues.id
      ? await supabase.from('goals').update(payload).eq('id', defaultValues.id)
      : await supabase.from('goals').insert({
          ...payload, user_id: user.id,
          priority: goals.length ? Math.max(...goals.map(g => g.priority ?? 0)) + 1 : 0,
        })

    setSaving(false)
    if (dbErr) { setError('Something went wrong. Try again.'); return }
    await reload()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!defaultValues.id && (
        <div>
          <label className="text-sm font-medium text-navy block mb-2">Template</label>
          <select
            value={template}
            onChange={e => applyTemplate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
              focus:outline-none focus:ring-2 focus:ring-blue/40"
          >
            {GOAL_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-3">
        <div className="w-16">
          <label className="text-sm font-medium text-navy block mb-1">Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            maxLength={2}
            className="w-full text-2xl text-center px-2 py-2 rounded-lg border border-navy/20 focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
        <div className="flex-1">
          <Input label="Goal name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer trip" />
        </div>
      </div>

      <div className="flex rounded-lg overflow-hidden border border-navy/20">
        {[
          { value: 'fixed_amount', label: 'Fixed amount' },
          { value: 'n_months_expenses', label: 'Months of expenses' },
        ].map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setTargetBasis(o.value)}
            className={`flex-1 py-2.5 text-sm font-medium font-sans transition-colors
              ${targetBasis === o.value ? 'bg-blue text-white' : 'bg-white text-navy/50 hover:bg-navy/5'}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {targetBasis === 'fixed_amount' ? (
        <Input label="Target amount (USD)" type="number" min="1" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0.00" />
      ) : (
        <Input label="Months of expenses" type="number" min="0.5" step="0.5" value={targetMonthsExpenses} onChange={e => setTargetMonthsExpenses(e.target.value)} placeholder="3" />
      )}

      <Input label="Target date (optional)" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-navy">Linked account (optional)</label>
        <select
          value={linkedAccountId}
          onChange={e => handleLinkAccount(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
            focus:outline-none focus:ring-2 focus:ring-blue/40"
        >
          <option value="">Not linked — track manually</option>
          {linkableAccounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.account_class === 'debt' ? ' (debt)' : ''}</option>)}
        </select>
        {linkedAccountId && (
          <p className="text-xs text-navy/40 font-sans mt-1">
            {isDebtLinked
              ? "Progress will track how much you've paid off, and logging a payment here reduces the balance."
              : "Progress will follow this account's balance, and adding funds here deposits into it."}
          </p>
        )}
      </div>

      {!isDebtLinked && (
        <>
          <Input label="Cap amount (optional)" type="number" min="0" step="0.01" value={capAmount} onChange={e => setCapAmount(e.target.value)} placeholder="e.g. 10000" />

          {capAmount !== '' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy">Once capped, overflow goes to</label>
              <select
                value={overflowGoalId}
                onChange={e => setOverflowGoalId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue/40"
              >
                <option value="">No overflow target</option>
                {otherGoals.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
              </select>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" variant="cta" disabled={saving} className="w-full mt-1">
        {saving ? 'Saving…' : defaultValues.id ? 'Save changes' : 'Create goal'}
      </Button>
    </form>
  )
}
