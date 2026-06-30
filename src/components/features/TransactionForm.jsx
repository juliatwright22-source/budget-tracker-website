import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useBudget } from '../../context/BudgetContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function TransactionForm({ onSuccess, defaultValues = {} }) {
  const { user } = useAuth()
  const { categories, reload } = useBudget()
  const [type, setType] = useState(defaultValues.type ?? 'expense')
  const [amount, setAmount] = useState(defaultValues.amount ?? '')
  const [categoryId, setCategoryId] = useState(defaultValues.categoryId ?? '')
  const [date, setDate] = useState(defaultValues.date ?? new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(defaultValues.note ?? '')
  const [receipt, setReceipt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || isNaN(Number(amount))) { setError('Please enter a valid amount.'); return }
    setSaving(true); setError('')

    let receipt_url = null
    if (receipt) {
      const ext = receipt.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, receipt)
      if (!uploadErr) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(path)
        receipt_url = data.publicUrl
      }
    }

    const payload = {
      user_id: user.id,
      type,
      amount: Number(amount),
      category_id: type === 'expense' && categoryId ? categoryId : null,
      date,
      note: note || null,
      receipt_url,
    }

    const { error: dbErr } = defaultValues.id
      ? await supabase.from('transactions').update(payload).eq('id', defaultValues.id)
      : await supabase.from('transactions').insert(payload)

    setSaving(false)
    if (dbErr) { setError('Something went wrong. Try again.'); return }
    await reload()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border border-navy/20">
        {['expense', 'income'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2.5 text-sm font-medium font-sans capitalize transition-colors
              ${type === t
                ? t === 'expense' ? 'bg-orange text-white' : 'bg-blue text-white'
                : 'bg-white text-navy/50 hover:bg-navy/5'}`}
          >
            {t === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <Input
        label="Amount (USD)"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />

      {type === 'expense' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy">Category</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
              focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue"
          >
            <option value="">No category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
      )}

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />

      <Input
        label="Note (optional)"
        type="text"
        placeholder="What was this for?"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-navy">Receipt photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setReceipt(e.target.files[0])}
          className="text-sm text-navy/60 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0
            file:text-sm file:font-medium file:bg-blue/10 file:text-blue hover:file:bg-blue/20"
        />
      </div>

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" variant={type === 'expense' ? 'cta' : 'primary'} disabled={saving} className="w-full mt-1">
        {saving ? 'Saving…' : defaultValues.id ? 'Update transaction' : 'Add transaction'}
      </Button>
    </form>
  )
}
