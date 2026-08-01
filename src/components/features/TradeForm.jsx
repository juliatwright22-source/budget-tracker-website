import { useState } from 'react'
import { useInvestments } from '../../context/InvestmentsContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function TradeForm({ accountId, onSuccess }) {
  const { recordTrade } = useInvestments()
  const [side, setSide] = useState('buy')
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [pricePerShare, setPricePerShare] = useState('')
  const [fees, setFees] = useState('0')
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!ticker.trim()) { setError('Please enter a ticker.'); return }
    if (!shares || Number(shares) <= 0) { setError('Please enter a valid share count.'); return }
    if (!pricePerShare || Number(pricePerShare) <= 0) { setError('Please enter a valid price per share.'); return }
    setSaving(true); setError('')

    try {
      await recordTrade({
        accountId, ticker: ticker.trim(), side,
        shares: Number(shares), pricePerShare: Number(pricePerShare),
        fees: Number(fees) || 0, tradeDate, note,
      })
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex rounded-lg overflow-hidden border border-navy/20">
        {['buy', 'sell'].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`flex-1 py-2.5 text-sm font-medium font-sans capitalize transition-colors
              ${side === s
                ? s === 'buy' ? 'bg-blue text-white' : 'bg-orange text-white'
                : 'bg-white text-navy/50 hover:bg-navy/5'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <Input label="Ticker" type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. AAPL" />
      <Input label="Shares" type="number" min="0" step="0.0001" value={shares} onChange={e => setShares(e.target.value)} placeholder="0" />
      <Input label="Price per share (USD)" type="number" min="0" step="0.01" value={pricePerShare} onChange={e => setPricePerShare(e.target.value)} placeholder="0.00" />
      <Input label="Fees (optional)" type="number" min="0" step="0.01" value={fees} onChange={e => setFees(e.target.value)} placeholder="0.00" />
      <Input label="Trade date" type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)} />
      <Input label="Note (optional)" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" variant={side === 'buy' ? 'cta' : 'primary'} disabled={saving} className="w-full mt-1">
        {saving ? 'Saving…' : side === 'buy' ? 'Record buy' : 'Record sell'}
      </Button>
    </form>
  )
}
