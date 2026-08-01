import { useState } from 'react'
import { useInvestments } from '../../context/InvestmentsContext'
import { useFormat } from '../../context/PreferencesContext'
import { unrealizedGain } from '../../lib/investments'
import Button from '../ui/Button'
import Input from '../ui/Input'
import TradeForm from './TradeForm'

export default function HoldingsPanel({ account }) {
  const { holdings, trades, dividends, prices, refreshing, recordDividend, refreshPrices } = useInvestments()
  const { formatCurrency, formatDate } = useFormat()
  const [view, setView] = useState('overview')
  const [divTicker, setDivTicker] = useState('')
  const [divAmount, setDivAmount] = useState('')
  const [divReinvested, setDivReinvested] = useState(false)
  const [divDate, setDivDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const accountHoldings = holdings.filter(h => h.account_id === account.id && Number(h.shares) > 0)
  const accountTrades = trades.filter(t => t.account_id === account.id)
  const accountDividends = dividends.filter(d => d.account_id === account.id)
  const tickers = accountHoldings.map(h => h.ticker)

  async function handleDividend(e) {
    e.preventDefault()
    if (!divTicker.trim() || !divAmount) return
    setSaving(true)
    await recordDividend({ accountId: account.id, ticker: divTicker.trim(), amount: divAmount, reinvested: divReinvested, payDate: divDate })
    setSaving(false)
    setDivTicker(''); setDivAmount(''); setDivReinvested(false)
    setView('overview')
  }

  if (view === 'trade') {
    return (
      <div>
        <button onClick={() => setView('overview')} className="text-sm text-navy/50 hover:text-blue font-sans mb-4">&larr; Back</button>
        <TradeForm accountId={account.id} onSuccess={() => setView('overview')} />
      </div>
    )
  }

  if (view === 'dividend') {
    return (
      <div>
        <button onClick={() => setView('overview')} className="text-sm text-navy/50 hover:text-blue font-sans mb-4">&larr; Back</button>
        <form onSubmit={handleDividend} className="flex flex-col gap-4">
          <Input label="Ticker" type="text" value={divTicker} onChange={e => setDivTicker(e.target.value.toUpperCase())} placeholder="e.g. AAPL" />
          <Input label="Amount (USD)" type="number" min="0" step="0.01" value={divAmount} onChange={e => setDivAmount(e.target.value)} placeholder="0.00" />
          <Input label="Pay date" type="date" value={divDate} onChange={e => setDivDate(e.target.value)} />
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input type="checkbox" checked={divReinvested} onChange={e => setDivReinvested(e.target.checked)} className="rounded border-navy/20" />
            Reinvested (I'll log the reinvestment as a separate buy)
          </label>
          <Button type="submit" variant="cta" disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Log dividend'}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <Button variant="cta" size="sm" onClick={() => setView('trade')} className="flex-1">+ Record trade</Button>
        <Button variant="ghost" size="sm" onClick={() => setView('dividend')} className="flex-1">+ Log dividend</Button>
      </div>

      {tickers.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => refreshPrices(tickers)} disabled={refreshing} className="w-full">
          {refreshing ? 'Refreshing…' : '↻ Refresh prices'}
        </Button>
      )}

      <div>
        <h3 className="font-serif text-base text-navy mb-2">Holdings</h3>
        {accountHoldings.length === 0 ? (
          <p className="text-navy/40 font-sans text-sm">No holdings yet — record a trade to get started.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-navy/8">
            {accountHoldings.map(h => {
              const priceInfo = prices[h.ticker]
              const gain = unrealizedGain(h, priceInfo?.price)
              return (
                <li key={h.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="font-sans font-medium text-navy text-sm">{h.ticker}</p>
                    <p className="text-sm font-sans text-navy">{Number(h.shares)} sh</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-navy/50 font-sans mt-1">
                    <span>Cost basis: {formatCurrency(h.cost_basis_total)}</span>
                    {priceInfo ? (
                      <span className={gain.dollar >= 0 ? 'text-blue' : 'text-orange'}>
                        {formatCurrency(gain.marketValue)} ({gain.dollar >= 0 ? '+' : ''}{formatCurrency(gain.dollar)}, {gain.percent.toFixed(1)}%)
                        {priceInfo.stale ? ' · stale' : ''}
                      </span>
                    ) : (
                      <span>Refresh prices to see value</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {accountTrades.length > 0 && (
        <div>
          <h3 className="font-serif text-base text-navy mb-2">Trade history</h3>
          <ul className="flex flex-col divide-y divide-navy/8">
            {accountTrades.map(t => (
              <li key={t.id} className="py-2.5 first:pt-0 last:pb-0 text-sm font-sans">
                <div className="flex items-center justify-between">
                  <span className="capitalize">{t.side} {Number(t.shares)} {t.ticker} @ {formatCurrency(t.price_per_share)}</span>
                  <span className="text-navy/40 text-xs">{formatDate(t.trade_date)}</span>
                </div>
                {t.side === 'sell' && t.realized_gain != null && (
                  <p className={`text-xs mt-0.5 ${Number(t.realized_gain) >= 0 ? 'text-blue' : 'text-orange'}`}>
                    Realized: {Number(t.realized_gain) >= 0 ? '+' : ''}{formatCurrency(t.realized_gain)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {accountDividends.length > 0 && (
        <div>
          <h3 className="font-serif text-base text-navy mb-2">Dividends</h3>
          <ul className="flex flex-col divide-y divide-navy/8">
            {accountDividends.map(d => (
              <li key={d.id} className="py-2.5 first:pt-0 last:pb-0 text-sm font-sans flex items-center justify-between">
                <span>{d.ticker} {d.reinvested ? '(reinvested)' : ''}</span>
                <span>{formatCurrency(d.amount)} · {formatDate(d.pay_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
