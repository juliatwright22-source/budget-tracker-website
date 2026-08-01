import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { applyBuy, applySell } from '../lib/investments'
import { getPrices } from '../lib/marketData'

const InvestmentsContext = createContext(null)

async function recomputeAccountBalance(accountId, prices) {
  const { data: accountHoldings } = await supabase.from('holdings').select('shares, cost_basis_total, ticker').eq('account_id', accountId)
  const total = (accountHoldings ?? []).reduce((sum, h) => {
    const price = prices[h.ticker]?.price
    const value = price != null ? Number(h.shares) * price : Number(h.cost_basis_total)
    return sum + value
  }, 0)
  await supabase.from('accounts').update({ current_balance: total }).eq('id', accountId)
}

export function InvestmentsProvider({ children }) {
  const { user } = useAuth()
  const [holdings, setHoldings] = useState([])
  const [trades, setTrades] = useState([])
  const [dividends, setDividends] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setHoldings([]); setTrades([]); setDividends([]); setLoading(false); return }
    setLoading(true)
    const [holdingsRes, tradesRes, dividendsRes] = await Promise.all([
      supabase.from('holdings').select('*').eq('user_id', user.id),
      supabase.from('trades').select('*').eq('user_id', user.id).order('trade_date', { ascending: false }),
      supabase.from('dividends').select('*').eq('user_id', user.id).order('pay_date', { ascending: false }),
    ])
    setHoldings(holdingsRes.data ?? [])
    setTrades(tradesRes.data ?? [])
    setDividends(dividendsRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function recordTrade({ accountId, ticker, side, shares, pricePerShare, fees, tradeDate, note }) {
    const symbol = ticker.toUpperCase()
    const { data: existing } = await supabase.from('holdings')
      .select('*').eq('account_id', accountId).eq('ticker', symbol).maybeSingle()

    const trade = { shares: Number(shares), price_per_share: Number(pricePerShare), fees: Number(fees) || 0 }
    let tradeRow = {
      user_id: user.id, account_id: accountId, ticker: symbol, side,
      shares: trade.shares, price_per_share: trade.price_per_share, fees: trade.fees,
      trade_date: tradeDate, note: note || null,
    }

    if (side === 'buy') {
      const result = applyBuy(existing, trade)
      await supabase.from('holdings').upsert({
        account_id: accountId, user_id: user.id, ticker: symbol,
        shares: result.shares, cost_basis_total: result.cost_basis_total,
        purchase_date: existing?.purchase_date ?? tradeDate,
      }, { onConflict: 'account_id,ticker' })
    } else {
      if (!existing || Number(existing.shares) < trade.shares) {
        throw new Error(`You only hold ${existing?.shares ?? 0} shares of ${symbol}.`)
      }
      const result = applySell(existing, trade)
      tradeRow.realized_gain = result.realizedGain
      tradeRow.cost_basis_at_sale = result.costBasisAtSale
      await supabase.from('holdings').update({
        shares: result.shares, cost_basis_total: result.cost_basis_total,
      }).eq('id', existing.id)
    }

    await supabase.from('trades').insert(tradeRow)
    await recomputeAccountBalance(accountId, prices)
    await load()
  }

  async function recordDividend({ accountId, ticker, amount, reinvested, payDate }) {
    await supabase.from('dividends').insert({
      user_id: user.id, account_id: accountId, ticker: ticker.toUpperCase(),
      amount: Number(amount), reinvested: !!reinvested, pay_date: payDate,
    })
    await load()
  }

  async function refreshPrices(tickers) {
    if (!tickers || tickers.length === 0) return
    setRefreshing(true)
    try {
      const fresh = await getPrices(tickers)
      const nextPrices = { ...prices, ...fresh }
      setPrices(nextPrices)

      const accountIds = [...new Set(
        holdings.filter(h => tickers.includes(h.ticker)).map(h => h.account_id)
      )]
      await Promise.all(accountIds.map(id => recomputeAccountBalance(id, nextPrices)))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <InvestmentsContext.Provider value={{
      holdings, trades, dividends, prices, loading, refreshing,
      reload: load, recordTrade, recordDividend, refreshPrices,
    }}>
      {children}
    </InvestmentsContext.Provider>
  )
}

export function useInvestments() {
  return useContext(InvestmentsContext)
}
