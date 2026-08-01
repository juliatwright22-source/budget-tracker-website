import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { currentMonthRange, currentMonthKey, lastMonthKey } from '../lib/utils'
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
  const [recurringRules, setRecurringRules] = useState([])
  const [dismissedAlerts, setDismissedAlerts] = useState([])
  const [cashFlowIntents, setCashFlowIntents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    await generateDueRecurringTransactions(user.id)
    const [tx, cats, budgets, recurring, dismissed, cashFlow] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).order('display_order').order('created_at'),
      supabase.from('budget_goals').select('*').eq('user_id', user.id),
      supabase.from('recurring_rules').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('dismissed_alerts').select('*').eq('user_id', user.id),
      supabase.from('cash_flow_intents').select('*').eq('user_id', user.id)
        .in('month_key', [currentMonthKey(), lastMonthKey()]),
    ])
    setTransactions(tx.data ?? [])
    setCategories(cats.data ?? [])
    setBudgetGoals(budgets.data ?? [])
    setRecurringRules(recurring.data ?? [])
    setDismissedAlerts(dismissed.data ?? [])
    setCashFlowIntents(cashFlow.data ?? [])
    setLoading(false)
  }, [user])

  async function dismissAlert(alertKeyValue) {
    if (!user) return
    await supabase.from('dismissed_alerts').upsert(
      { user_id: user.id, alert_key: alertKeyValue },
      { onConflict: 'user_id,alert_key' }
    )
    await load()
  }

  async function saveCashFlowIntent(monthKey, fields) {
    if (!user) return
    await supabase.from('cash_flow_intents').upsert(
      { user_id: user.id, month_key: monthKey, ...fields },
      { onConflict: 'user_id,month_key' }
    )
    await load()
  }

  useEffect(() => { load() }, [load])

  // Current month totals
  const { start, end } = currentMonthRange()
  const monthlyTx = transactions.filter(t => t.date >= start && t.date <= end)
  const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpenses

  const currentCashFlowIntent = cashFlowIntents.find(c => c.month_key === currentMonthKey()) ?? null
  const lastMonthCashFlowIntent = cashFlowIntents.find(c => c.month_key === lastMonthKey()) ?? null

  return (
    <BudgetContext.Provider value={{
      transactions, categories, budgetGoals, recurringRules,
      dismissedAlerts, cashFlowIntents, currentCashFlowIntent, lastMonthCashFlowIntent,
      totalIncome, totalExpenses, balance,
      monthlyTx, loading, reload: load, dismissAlert, saveCashFlowIntent,
    }}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  return useContext(BudgetContext)
}
