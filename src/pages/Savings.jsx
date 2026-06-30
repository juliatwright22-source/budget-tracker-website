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
import { formatCurrency, formatDate, daysUntil } from '../lib/utils'

export default function Savings() {
  const { user } = useAuth()
  const { savingsGoals, reload } = useBudget()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [fundsGoal, setFundsGoal] = useState(null)
  const [fundsAmount, setFundsAmount] = useState('')
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '', deadline: '', emoji: '🎯' })
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(null); setForm({ name: '', target_amount: '', current_amount: '', deadline: '', emoji: '🎯' }); setOpen(true) }
  function openEdit(g) {
    setEditing(g)
    setForm({ name: g.name, target_amount: String(g.target_amount), current_amount: String(g.current_amount), deadline: g.deadline ?? '', emoji: g.emoji })
    setOpen(true)
  }

  async function save() {
    if (!form.name || !form.target_amount) return
    setSaving(true)
    const payload = {
      name: form.name,
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount) || 0,
      deadline: form.deadline || null,
      emoji: form.emoji,
      user_id: user.id,
    }
    if (editing) {
      await supabase.from('savings_goals').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('savings_goals').insert(payload)
    }
    setSaving(false); setOpen(false); reload()
  }

  async function addFunds() {
    if (!fundsAmount || isNaN(Number(fundsAmount))) return
    const newAmt = Math.min(Number(fundsGoal.current_amount) + Number(fundsAmount), Number(fundsGoal.target_amount))
    await supabase.from('savings_goals').update({ current_amount: newAmt }).eq('id', fundsGoal.id)
    setFundsGoal(null); setFundsAmount(''); reload()
  }

  async function deleteGoal(id) {
    if (!confirm('Delete this savings goal?')) return
    await supabase.from('savings_goals').delete().eq('id', id)
    reload()
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Savings Goals</h1>
        <Button variant="cta" size="sm" onClick={openNew}>+ New goal</Button>
      </div>

      {savingsGoals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">✨</p>
          <p className="text-navy/60 font-sans mb-2">What are you saving for?</p>
          <p className="text-navy/40 font-sans text-sm mb-6">A trip, a car, your first apartment?</p>
          <Button variant="cta" onClick={openNew}>Create your first goal</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {savingsGoals.map(g => {
            const days = daysUntil(g.deadline)
            const remaining = Number(g.target_amount) - Number(g.current_amount)
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{g.emoji}</span>
                      <h3 className="font-serif text-lg text-navy">{g.name}</h3>
                    </div>
                    {g.deadline && (
                      <p className="text-xs text-navy/40 font-sans">
                        {days !== null && days > 0 ? `${days} days left` : days === 0 ? 'Due today' : 'Past deadline'}
                        {' · '}{formatDate(g.deadline)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(g)} className="text-navy/30 hover:text-blue text-sm">✏</button>
                    <button onClick={() => deleteGoal(g.id)} className="text-navy/30 hover:text-orange text-sm">✕</button>
                  </div>
                </div>

                <ProgressBar value={Number(g.current_amount)} max={Number(g.target_amount)} className="mb-3" />

                <div className="flex justify-between text-sm font-sans mb-4">
                  <div>
                    <p className="text-navy/40 text-xs">Saved</p>
                    <p className="font-semibold text-blue">{formatCurrency(g.current_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-navy/40 text-xs">Remaining</p>
                    <p className="font-semibold text-orange">{formatCurrency(remaining)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-navy/40 text-xs">Goal</p>
                    <p className="font-semibold text-navy">{formatCurrency(g.target_amount)}</p>
                  </div>
                </div>

                <Button variant="primary" size="sm" onClick={() => { setFundsGoal(g); setFundsAmount('') }} className="w-full">
                  Add funds
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      {/* New/edit goal modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit goal' : 'New savings goal'}>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-sm font-medium text-navy block mb-1">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                maxLength={2}
                className="w-full text-2xl text-center px-2 py-2 rounded-lg border border-navy/20 focus:outline-none focus:ring-2 focus:ring-blue/40"
              />
            </div>
            <div className="flex-1">
              <Input label="Goal name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer trip" />
            </div>
          </div>
          <Input label="Target amount (USD)" type="number" min="1" step="0.01" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="0.00" />
          <Input label="Amount already saved (USD)" type="number" min="0" step="0.01" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} placeholder="0.00" />
          <Input label="Deadline (optional)" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          <Button variant="cta" onClick={save} disabled={saving} className="w-full">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}
          </Button>
        </div>
      </Modal>

      {/* Add funds modal */}
      <Modal open={!!fundsGoal} onClose={() => setFundsGoal(null)} title={`Add funds — ${fundsGoal?.name}`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm font-sans text-navy/60">
            Currently at {formatCurrency(fundsGoal?.current_amount)} of {formatCurrency(fundsGoal?.target_amount)}
          </p>
          <Input label="Amount to add (USD)" type="number" min="0.01" step="0.01" value={fundsAmount} onChange={e => setFundsAmount(e.target.value)} placeholder="0.00" />
          <Button variant="primary" onClick={addFunds} className="w-full">Add funds</Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
