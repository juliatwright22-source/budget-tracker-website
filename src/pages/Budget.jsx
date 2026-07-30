import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import ProgressBar from '../components/ui/ProgressBar'
import { currentMonthRange } from '../lib/utils'
import { useFormat } from '../context/PreferencesContext'

export default function Budget() {
  const { user } = useAuth()
  const { categories, budgetGoals, transactions, reload } = useBudget()
  const { formatCurrency } = useFormat()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [catId, setCatId] = useState('')
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)

  const { start, end } = currentMonthRange()
  const monthlyExpenses = transactions.filter(t => t.type === 'expense' && t.date >= start && t.date <= end)

  const spendByCat = {}
  monthlyExpenses.forEach(t => {
    if (t.category_id) spendByCat[t.category_id] = (spendByCat[t.category_id] ?? 0) + Number(t.amount)
  })

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const budgetMap = Object.fromEntries(budgetGoals.map(g => [g.category_id, g]))

  // Categories that have a budget goal
  const budgetedCats = budgetGoals.map(g => ({
    ...g,
    cat: catMap[g.category_id],
    spent: spendByCat[g.category_id] ?? 0,
  }))

  // Categories without a goal yet
  const unbgCats = categories.filter(c => !budgetMap[c.id])

  function openNew() { setEditing(null); setCatId(unbgCats[0]?.id ?? ''); setLimit(''); setOpen(true) }
  function openEdit(g) { setEditing(g); setCatId(g.category_id); setLimit(String(g.monthly_limit)); setOpen(true) }

  async function save() {
    if (!catId || !limit) return
    setSaving(true)
    const payload = { category_id: catId, monthly_limit: Number(limit), user_id: user.id }
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

  function statusMessage(cat) {
    if (!cat.cat) return null
    const pct = cat.monthly_limit > 0 ? (cat.spent / cat.monthly_limit) * 100 : 0
    if (pct >= 100) return { text: `You've gone over your ${cat.cat.name} budget — that's okay, adjust anytime.`, warn: true }
    if (pct >= 80) return { text: `You're getting close on ${cat.cat.name} this month.`, warn: false }
    return null
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Budget Goals</h1>
        {unbgCats.length > 0 && <Button variant="cta" size="sm" onClick={openNew}>+ Set a limit</Button>}
      </div>

      {budgetedCats.length === 0 ? (
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
          <Button variant="primary" onClick={save} disabled={saving} className="w-full">
            {saving ? 'Saving…' : editing ? 'Update limit' : 'Set limit'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
