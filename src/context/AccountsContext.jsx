import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const AccountsContext = createContext(null)

export function AccountsProvider({ children }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setAccounts([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order')
      .order('created_at')
    setAccounts(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const activeAccounts = accounts.filter(a => a.is_active)
  const cashAccounts = activeAccounts.filter(a => a.account_class === 'cash')
  const investmentAccounts = activeAccounts.filter(a => a.account_class === 'investment')
  const debtAccounts = activeAccounts.filter(a => a.account_class === 'debt')

  const sum = (list) => list.reduce((s, a) => s + Number(a.current_balance), 0)
  const totalsByClass = {
    cash: sum(cashAccounts),
    investment: sum(investmentAccounts),
    debt: sum(debtAccounts),
  }
  const netWorth = totalsByClass.cash + totalsByClass.investment - totalsByClass.debt

  const totalsByInstitution = {}
  activeAccounts.forEach(a => {
    const key = a.institution_name?.trim() || 'Other'
    totalsByInstitution[key] = (totalsByInstitution[key] ?? 0) + Number(a.current_balance) * (a.account_class === 'debt' ? -1 : 1)
  })

  const floorWarnings = cashAccounts.filter(a => a.min_balance_floor != null && Number(a.current_balance) < Number(a.min_balance_floor))

  const institutionOptions = [...new Set(accounts.map(a => a.institution_name?.trim()).filter(Boolean))]

  return (
    <AccountsContext.Provider value={{
      accounts, activeAccounts, cashAccounts, investmentAccounts, debtAccounts,
      totalsByClass, netWorth, totalsByInstitution, floorWarnings, institutionOptions,
      loading, reload: load,
    }}>
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts() {
  return useContext(AccountsContext)
}
