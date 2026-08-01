import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import ProgressBar from '../components/ui/ProgressBar'
import { currentMonthRange, currentMonthKey } from '../lib/utils'
import { useFormat } from '../context/PreferencesContext'
import { alertTier } from '../lib/alerts'

export default function Budget() {
  const { user } = useAuth()
  const { categories, budgetGoals, transactions, currentCashFlowIntent, saveCashFlowIntent, reload } = useBudget()
  const { formatCurrency } = useFormat()
  const [view, setView] = useState('budget')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [catId, setCatId] = useState('')
  const [limit, setLimit] = useState('')
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [thresholdWarning, setThresholdWarning] = useState('80')
  const [thresholdExceeded, setThresholdExceeded] = useState('100')
  const [thresholdCritical, setThresholdCritical] = useState('110')
  const [saving, setSaving] = useState(false)

  const [intentDescription, setIntentDescription] = useState(currentCashFlowIntent?.intent_description ?? '')
  const [plannedAmount, setPlannedAmount] = useState(currentCashFlowIntent?.planned_amount != null ? String(currentCashFlowIntent.planned_amount) : '')
  const [allIntents, setAllIntents] = useState([])

  useEffect(() => {
    setIntentDescription(currentCashFlowIntent?.intent_description ?? '')
    setPlannedAmount(currentCashFlowIntent?.planned_amount != null ? String(currentCashFlowIntent.planned_amount) : '')
  }, [currentCashFlowIntent])

  useEffect(() => {
    if (!user || view !== 'cashflow') return
    supabase.from('cash_flow_intents').select('*').eq('user_id', user.id)
      .order('month_key', { ascending: false })
      .then(({ data }) => setAllIntents(data ?? []))
  }, [user, view, currentCashFlowIntent])

  const { start, end } = currentMonthRange()
  const monthlyExpenses = transactions.filter(t => t.type === 'expense' && t.date >= start && t.date <= end)

  const spendByCat = {}
  monthlyExpenses.forEach(t => {
    if (t.category_id) spendByCat[t.category_id] = (spendByCat[t.category_id] ?? 0) + Number(t.amount)
  })

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const budgetMap = Object.fromEntries(budgetGoals.map(g => [g.category_id, g]))

  const budgetedCats = budgetGoals.map(g => ({
    ...g,
    cat: catMap[g.category_id],
    spent: spendByCat[g.category_id] ?? 0,
  }))

  const unbgCats = categories.filter(c => !budgetMap[c.id])

  function openNew() {
    setEditing(null); setCatId(unbgCats[0]?.id ?? ''); setLimit('')
    setAlertEnabled(false); setThresholdWarning('80'); setThresholdExceeded('100'); setThresholdCritical('110')
    setOpen(true)
  }
  function openEdit(g) {
    setEditing(g); setCatId(g.category_id); setLimit(String(g.monthly_limit))
    setAlertEnabled(g.alert_enabled ?? false)
    setThresholdWarning(String(g.threshold_warning ?? 80))
    setThresholdExceeded(String(g.threshold_exceeded ?? 100))
    setThresholdCritical(String(g.threshold_critical ?? 110))
    setOpen(true)
  }

  async function save() {
    if (!catId || !limit) return
    setSaving(true)
    const payload = {
      category_id: catId,
      monthly_limit: Number(limit),
      user_id: user.id,
      alert_enabled: alertEnabled,
      threshold_warning: Number(thresholdWarning) || 80,
      threshold_exceeded: Number(thresholdExceeded) || 100,
      threshold_critical: Number(thresholdCritical) || 110,
    }
    if (editing) {
      await supabase.from('budget_goals').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('budget_goals').insert(payload)
    }
    setSaving(false)
    setOpen(false)
    reload()
  }

  async function deleteGoal(id) {
    await supabase.from('budget_goals').delete().eq('id', id)
    reload()
  }

  function statusMessage(b) {
    if (!b.cat) return null
    const tier = alertTier(b.spent, Number(b.monthly_limit), b)
    if (tier === 'critical' || tier === 'exceeded') return { text: `You've gone over your ${b.cat.name} budget — that's okay, adjust anytime.`, warn: true }
    if (tier === 'warning') return { text: `You're getting close on ${b.cat.name} this month.`, warn: false }
    return null
  }

  async function saveIntent() {
    await saveCashFlowIntent(currentMonthKey(), {
      intent_description: intentDescription || null,
      planned_amount: plannedAmount !== '' ? Number(plannedAmount) : null,
      status: 'declared',
    })
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Budget</h1>
        {view === 'budget' && unbgCats.length > 0 && <Button variant="cta" size="sm" onClick={openNew}>+ Set a limit</Button>}
      </div>

      <div className="flex rounded-lg overflow-hidden border border-navy/20 mb-6 max-w-xs">
        {['budget', 'cashflow'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-sm font-medium font-sans transition-colors
              ${view === v ? 'bg-blue text-white' : 'bg-white text-navy/50 hover:bg-navy/5'}`}
          >
            {v === 'budget' ? 'Budget Goals' : 'Cash Flow'}
          </button>
        ))}
      </div>

      {view === 'cashflow' ? (
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="font-serif text-lg text-navy mb-1">This month's plan</h2>
            <p className="text-xs text-navy/40 font-sans mb-4">
              What should happen to any extra money this month? (e.g. "goes to Roth IRA," "vacation fund")
            </p>
            <div className="flex flex-col gap-3">
              <Input label="Intent" type="text" value={intentDescription} onChange={e => setIntentDescription(e.target.value)} placeholder="e.g. Extra goes to Roth" />
              <Input label="Planned amount (optional)" type="number" step="0.01" value={plannedAmount} onChange={e => setPlannedAmount(e.target.value)} placeholder="0.00" />
              <Button variant="cta" onClick={saveIntent} className="w-full">
                {currentCashFlowIntent?.status === 'declared' || currentCashFlowIntent?.status === 'resolved' ? 'Update plan' : 'Declare plan'}
              </Button>
            </div>
          </Card>

          <div>
            <h2 className="font-serif text-lg text-navy mb-3">History</h2>
            {allIntents.length === 0 ? (
              <p className="text-navy/40 font-sans text-sm">No history yet — declare a plan above to start tracking follow-through.</p>
            ) : (
              <Card>
                <ul className="flex flex-col divide-y divide-navy/8">
                  {allIntents.map(intent => (
                    <li key={intent.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-xs font-sans text-navy/40 mb-1">{intent.month_key}</p>
                      <p className="text-sm font-sans text-navy">
                        <span className="text-navy/50">Planned:</span> {intent.intent_description || '—'}
                        {intent.planned_amount != null && ` (${formatCurrency(intent.planned_amount)})`}
                      </p>
                      <p className="text-sm font-sans text-navy mt-0.5">
                        <span className="text-navy/50">Actual:</span>{' '}
                        {intent.status === 'resolved'
                          ? `${intent.actual_description || '—'}${intent.actual_amount != null ? ` (${formatCurrency(intent.actual_amount)})` : ''}`
                          : 'Not yet logged'}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      ) : budgetedCats.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-navy/50 font-sans mb-4">No budget set — add a limit to start tracking.</p>
          <Button variant="primary" onClick={openNew} disabled={categories.length === 0}>
            {categories.length === 0 ? 'Add a category first' : 'Set your first budget'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {budgetedCats.map(b => {
            const pct = b.monthly_limit > 0 ? Math.min((b.spent / b.monthly_limit) * 100, 100) : 0
            const msg = statusMessage(b)
            return (
              <Card key={b.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{b.cat?.emoji ?? '📦'}</span>
                    <div>
                      <p className="font-sans font-medium text-navy text-sm">{b.cat?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-navy/40 font-sans mt-0.5">
                        {formatCurrency(b.spent)} of {formatCurrency(b.monthly_limit)}
                        {b.alert_enabled && ' · Alerts on'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-sans text-sm font-semibold ${pct >= 100 ? 'text-orange' : 'text-navy'}`}>
                      {Math.round(pct)}%
                    </span>
                    <button onClick={() => openEdit(b)} className="text-navy/30 hover:text-blue text-sm transition-colors">✏</button>
                    <button onClick={() => deleteGoal(b.id)} className="text-navy/30 hover:text-orange text-sm transition-colors">✕</button>
                  </div>
                </div>
                <ProgressBar value={b.spent} max={b.monthly_limit} />
                {msg && (
                  <p className={`text-xs font-sans mt-2 ${msg.warn ? 'text-orange' : 'text-navy/60'}`}>
                    {msg.text}
                  </p>
                )}
              </Card>
            )
          })}

          {unbgCats.length > 0 && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-navy/20
                text-navy/40 hover:border-blue/50 hover:text-blue font-sans text-sm transition-colors"
            >
              + Add a budget for another category
            </button>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit budget limit' : 'Set a budget limit'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-navy block mb-2">Category</label>
            <select
              value={catId}
              onChange={e => setCatId(e.target.value)}
              disabled={!!editing}
              className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                focus:outline-none focus:ring-2 focus:ring-blue/40"
            >
              {editing
                ? <option value={catId}>{catMap[catId]?.emoji} {catMap[catId]?.name}</option>
                : unbgCats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)
              }
            </select>
          </div>
          <Input
            label="Monthly limit (USD)"
            type="number"
            min="1"
            step="0.01"
            placeholder="e.g. 300"
            value={limit}
            onChange={e => setLimit(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input type="checkbox" checked={alertEnabled} onChange={e => setAlertEnabled(e.target.checked)} className="rounded border-navy/20" />
            Alert me when I'm approaching this limit
          </label>

          {alertEnabled && (
            <div className="grid grid-cols-3 gap-2">
              <Input label="Warning %" type="number" min="1" value={thresholdWarning} onChange={e => setThresholdWarning(e.target.value)} />
              <Input label="Exceeded %" type="number" min="1" value={thresholdExceeded} onChange={e => setThresholdExceeded(e.target.value)} />
              <Input label="Critical %" type="number" min="1" value={thresholdCritical} onChange={e => setThresholdCritical(e.target.value)} />
            </div>
          )}

          <Button variant="primary" onClick={save} disabled={saving} className="w-full">
            {saving ? 'Saving…' : editing ? 'Update limit' : 'Set limit'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
