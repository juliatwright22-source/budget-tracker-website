import { supabase } from './supabase'

// Batches every ticker into one Edge Function call. Never touches a Finnhub key —
// that lives only as a secret on the market-prices Edge Function.
export async function getPrices(tickers) {
  const unique = [...new Set(tickers.map(t => String(t).toUpperCase()))]
  if (unique.length === 0) return {}
  const { data, error } = await supabase.functions.invoke('market-prices', { body: { tickers: unique } })
  if (error) throw error
  return data
}
