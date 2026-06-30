import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { currentMonthRange } from '../lib/utils'

const BudgetContext = createContext(null)

export function BudgetProvider({ children }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [budgetGoals, setBudgetGoals] = useState([])
  const [savingsGoals, setSavingsGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    const [tx, cats, budgets, savings] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('budget_goals').select('*').eq('user_id', user.id),
      supabase.from('savings_goals').select('*').eq('user_id', user.id).order('created_at'),
    ])
    setTransactions(tx.data ?? [])
    setCategories(cats.data ?? [])
    setBudgetGoals(budgets.data ?? [])
    setSavingsGoals(savings.data ?? [])
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
      transactions, categories, budgetGoals, savingsGoals,
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
