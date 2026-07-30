import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { formatCurrency as formatCurrencyRaw, formatDate as formatDateRaw } from '../lib/utils'

const PreferencesContext = createContext(null)

const DEFAULTS = { currency: 'USD', locale: 'en-US', date_format: 'MM/DD/YYYY' }

export function PreferencesProvider({ children }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setPrefs(DEFAULTS); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('currency, locale, date_format')
      .eq('id', user.id)
      .single()
    setPrefs({
      currency: data?.currency ?? DEFAULTS.currency,
      locale: data?.locale ?? DEFAULTS.locale,
      date_format: data?.date_format ?? DEFAULTS.date_format,
    })
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  return (
    <PreferencesContext.Provider value={{ ...prefs, loading, reload: load }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PreferencesContext)
}

export function useFormat() {
  const { currency, locale, date_format } = usePreferences()
  return {
    formatCurrency: (amount) => formatCurrencyRaw(amount, { currency, locale }),
    formatDate: (dateStr) => formatDateRaw(dateStr, { locale, dateFormat: date_format }),
  }
}
