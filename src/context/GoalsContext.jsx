import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const GoalsContext = createContext(null)

// Applies `amount` to a goal, respecting its cap; any excess cascades to its
// overflow_goal_id (if set). Re-reads each goal fresh from Supabase at every step so a
// multi-hop chain can't act on stale data. Returns any amount that couldn't be allocated.
async function applyContribution(goalId, amount, depth = 0) {
  if (depth > 10 || amount <= 0) return Math.max(amount, 0)

  const { data: goal } = await supabase.from('goals').select('*').eq('id', goalId).single()
  if (!goal) return amount

  let current = Number(goal.current_amount)
  let accountClass = null
  if (goal.linked_account_id) {
    const { data: account } = await supabase.from('accounts')
      .select('current_balance, account_class').eq('id', goal.linked_account_id).single()
    current = Number(account?.current_balance ?? 0)
    accountClass = account?.account_class ?? null
  }

  const cap = goal.cap_amount != null ? Number(goal.cap_amount) : null
  const room = cap != null ? Math.max(cap - current, 0) : amount
  const applied = Math.min(amount, room)
  const overflow = amount - applied

  if (applied > 0) {
    if (goal.linked_account_id && accountClass === 'cash') {
      await supabase.from('transactions').insert({
        user_id: goal.user_id,
        type: 'income',
        amount: applied,
        account_id: goal.linked_account_id,
        date: new Date().toISOString().split('T')[0],
        note: `Goal contribution: ${goal.name}`,
      })
    } else if (goal.linked_account_id && accountClass === 'investment') {
      await supabase.from('accounts').update({ current_balance: current + applied }).eq('id', goal.linked_account_id)
    } else {
      await supabase.from('goals').update({ current_amount: current + applied }).eq('id', goal.id)
    }
  }

  if (overflow > 0 && goal.overflow_goal_id) {
    return applyContribution(goal.overflow_goal_id, overflow, depth + 1)
  }
  return overflow
}

export function GoalsProvider({ children }) {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [avgMonthlyExpenses, setAvgMonthlyExpenses] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setGoals([]); setAvgMonthlyExpenses(0); setLoading(false); return }
    setLoading(true)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const since = ninetyDaysAgo.toISOString().split('T')[0]

    const [goalsRes, expensesRes] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).eq('is_archived', false).order('priority'),
      supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').gte('date', since),
    ])
    setGoals(goalsRes.data ?? [])
    const totalExpenses = (expensesRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)
    setAvgMonthlyExpenses(totalExpenses / 3)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function addFunds(goalId, amount) {
    const leftover = await applyContribution(goalId, amount)
    await load()
    return leftover
  }

  return (
    <GoalsContext.Provider value={{ goals, avgMonthlyExpenses, loading, reload: load, addFunds }}>
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoals() {
  return useContext(GoalsContext)
}
