import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGoals } from '../context/GoalsContext'
import { useAccounts } from '../context/AccountsContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import ProgressBar from '../components/ui/ProgressBar'
import GoalForm from '../components/features/GoalForm'
import { effectiveTarget, goalProgress } from '../lib/goals'
import { useFormat } from '../context/PreferencesContext'

export default function Goals() {
  const { goals, avgMonthlyExpenses, addFunds, reload } = useGoals()
  const { accounts } = useAccounts()
  const { formatCurrency } = useFormat()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [fundsGoal, setFundsGoal] = useState(null)
  const [fundsAmount, setFundsAmount] = useState('')
  const [fundsMessage, setFundsMessage] = useState('')

  const accountsById = Object.fromEntries(accounts.map(a => [a.id, a]))
  const goalsById = Object.fromEntries(goals.map(g => [g.id, g]))
  const sortedGoals = [...goals].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

  function openNew() { setEditing(null); setOpen(true) }
  function openEdit(g) { setEditing(g); setOpen(true) }

  async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    reload()
  }

  async function move(goal, direction) {
    const index = sortedGoals.findIndex(g => g.id === goal.id)
    const swapWith = sortedGoals[index + direction]
    if (!swapWith) return
    await Promise.all([
      supabase.from('goals').update({ priority: swapWith.priority ?? 0 }).eq('id', goal.id),
      supabase.from('goals').update({ priority: goal.priority ?? 0 }).eq('id', swapWith.id),
    ])
    reload()
  }

  async function submitFunds() {
    if (!fundsAmount || isNaN(Number(fundsAmount))) return
    const leftover = await addFunds(fundsGoal.id, Number(fundsAmount))
    if (leftover > 0) {
      setFundsMessage(`${formatCurrency(leftover)} couldn't be allocated — this goal (and its overflow chain) is at capacity.`)
    } else {
      setFundsGoal(null); setFundsAmount(''); setFundsMessage('')
    }
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Goals</h1>
        <Button variant="cta" size="sm" onClick={openNew}>+ New goal</Button>
      </div>

      {sortedGoals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">✨</p>
          <p className="text-navy/60 font-sans mb-2">What are you working toward?</p>
          <p className="text-navy/40 font-sans text-sm mb-6">An emergency fund, a trip, a car, your first apartment?</p>
          <Button variant="cta" onClick={openNew}>Create your first goal</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {sortedGoals.map((g, i) => {
            const current = goalProgress(g, accountsById)
            const target = effectiveTarget(g, avgMonthlyExpenses)
            const remaining = target - current
            const overflowGoal = g.overflow_goal_id ? goalsById[g.overflow_goal_id] : null
            const linkedAccount = g.linked_account_id ? accountsById[g.linked_account_id] : null

            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{g.emoji}</span>
                      <h3 className="font-serif text-lg text-navy">{g.name}</h3>
                    </div>
                    {linkedAccount && <p className="text-xs text-navy/40 font-sans">Linked to {linkedAccount.name}</p>}
                    {g.target_date && <p className="text-xs text-navy/40 font-sans">Target: {g.target_date}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => move(g, -1)} disabled={i === 0} className="text-navy/30 hover:text-blue text-sm disabled:opacity-20">▲</button>
                    <button onClick={() => move(g, 1)} disabled={i === sortedGoals.length - 1} className="text-navy/30 hover:text-blue text-sm disabled:opacity-20">▼</button>
                    <button onClick={() => openEdit(g)} className="text-navy/30 hover:text-blue text-sm">✏</button>
                    <button onClick={() => deleteGoal(g.id)} className="text-navy/30 hover:text-orange text-sm">✕</button>
                  </div>
                </div>

                <ProgressBar value={current} max={target || 1} className="mb-3" />

                <div className="flex justify-between text-sm font-sans mb-3">
                  <div>
                    <p className="text-navy/40 text-xs">Saved</p>
                    <p className="font-semibold text-blue">{formatCurrency(current)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-navy/40 text-xs">Remaining</p>
                    <p className="font-semibold text-orange">{formatCurrency(Math.max(remaining, 0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-navy/40 text-xs">Goal</p>
                    <p className="font-semibold text-navy">{formatCurrency(target)}</p>
                  </div>
                </div>

                {g.cap_amount != null && (
                  <p className="text-xs text-navy/40 font-sans mb-3">
                    Capped at {formatCurrency(g.cap_amount)}{overflowGoal ? ` — then overflows to ${overflowGoal.emoji} ${overflowGoal.name}` : ''}
                  </p>
                )}

                <Button variant="primary" size="sm" onClick={() => { setFundsGoal(g); setFundsAmount(''); setFundsMessage('') }} className="w-full">
                  Add funds
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit goal' : 'New goal'}>
        <GoalForm defaultValues={editing ?? {}} onSuccess={() => setOpen(false)} />
      </Modal>

      <Modal open={!!fundsGoal} onClose={() => setFundsGoal(null)} title={`Add funds — ${fundsGoal?.name}`}>
        <div className="flex flex-col gap-4">
          <Input label="Amount to add (USD)" type="number" min="0.01" step="0.01" value={fundsAmount} onChange={e => setFundsAmount(e.target.value)} placeholder="0.00" />
          {fundsMessage && <p className="text-sm text-orange">{fundsMessage}</p>}
          <Button variant="primary" onClick={submitFunds} className="w-full">Add funds</Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
