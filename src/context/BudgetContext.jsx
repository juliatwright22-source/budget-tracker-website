import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { currentMonthRange } from '../lib/utils'
import { occurrencesDue } from '../lib/recurring'

const BudgetContext = createContext(null)

async function generateDueRecurringTransactions(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: rules } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .lte('next_occurrence', today)
  if (!rules || rules.length === 0) return

  const ruleIds = rules.map(r => r.id)
  const { data: exceptions } = await supabase
    .from('recurring_rule_exceptions')
    .select('*')
    .in('recurring_rule_id', ruleIds)
  const exceptionMap = new Map((exceptions ?? []).map(e => [`${e.recurring_rule_id}:${e.occurrence_date}`, e]))

  const toInsert = []
  const ruleUpdates = []

  for (const rule of rules) {
    const { dates, nextOccurrence } = occurrencesDue(rule, today)
    for (const date of dates) {
      const exception = exceptionMap.get(`${rule.id}:${date}`)
      if (exception?.action === 'skip') continue
      toInsert.push({
        user_id: userId,
        type: rule.type,
        amount: exception?.override_amount ?? rule.amount,
        category_id: rule.type === 'expense' ? rule.category_id : null,
        account_id: rule.account_id,
        date: exception?.override_date ?? date,
        note: exception?.override_note ?? rule.name,
        recurring_rule_id: rule.id,
        is_recurring_generated: true,
      })
    }
    if (nextOccurrence !== rule.next_occurrence) {
      ruleUpdates.push({ id: rule.id, next_occurrence: nextOccurrence })
    }
  }

  if (toInsert.length > 0) await supabase.from('transactions').insert(toInsert)
  await Promise.all(ruleUpdates.map(u =>
    supabase.from('recurring_rules').update({ next_occurrence: u.next_occurrence }).eq('id', u.id)
  ))
}

export function BudgetProvider({ children }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [budgetGoals, setBudgetGoals] = useState([])
  const [savingsGoals, setSavingsGoals] = useState([])
  const [recurringRules, setRecurringRules] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    await generateDueRecurringTransactions(user.id)
    const [tx, cats, budgets, savings, recurring] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).order('display_order').order('created_at'),
      supabase.from('budget_goals').select('*').eq('user_id', user.id),
      supabase.from('savings_goals').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('recurring_rules').select('*').eq('user_id', user.id).order('created_at'),
    ])
    setTransactions(tx.data ?? [])
    setCategories(cats.data ?? [])
    setBudgetGoals(budgets.data ?? [])
    setSavingsGoals(savings.data ?? [])
    setRecurringRules(recurring.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Current month totals
  const { start, end } = currentMonthRange()
  const monthlyTx = transactions.filter(t => t.date >= start && t.date <= end)
  const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpenses
  const totalSaved = savingsGoals.reduce((s, g) => s + Number(g.current_amount), 0)

  return (
    <BudgetContext.Provider value={{
      transactions, categories, budgetGoals, savingsGoals, recurringRules,
      totalIncome, totalExpenses, balance, totalSaved,
      monthlyTx, loading, reload: load,
    }}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  return useContext(BudgetContext)
}
