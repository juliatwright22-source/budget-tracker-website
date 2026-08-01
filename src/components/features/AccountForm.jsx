import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAccounts } from '../../context/AccountsContext'
import { ACCOUNT_CLASSES, ACCOUNT_TYPES } from '../../lib/constants'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function AccountForm({ onSuccess, defaultValues = {} }) {
  const { user } = useAuth()
  const { institutionOptions, reload } = useAccounts()
  const [accountClass, setAccountClass] = useState(defaultValues.account_class ?? 'cash')
  const [accountType, setAccountType] = useState(defaultValues.account_type ?? 'checking')
  const [customTypeName, setCustomTypeName] = useState(defaultValues.is_custom_type ? defaultValues.account_type : '')
  const [name, setName] = useState(defaultValues.name ?? '')
  const [institution, setInstitution] = useState(defaultValues.institution_name ?? '')
  const [startingBalance, setStartingBalance] = useState(defaultValues.starting_balance != null ? String(defaultValues.starting_balance) : '0')
  const [currentBalance, setCurrentBalance] = useState(defaultValues.current_balance != null ? String(defaultValues.current_balance) : '0')
  const [minFloor, setMinFloor] = useState(defaultValues.min_balance_floor != null ? String(defaultValues.min_balance_floor) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const typesForClass = ACCOUNT_TYPES.filter(t => t.class === accountClass || t.value === 'custom')

  function handleClassChange(cls) {
    setAccountClass(cls)
    const firstType = ACCOUNT_TYPES.find(t => t.class === cls)
    setAccountType(firstType?.value ?? 'custom')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Please give this account a name.'); return }
    const isCustom = accountType === 'custom'
    if (isCustom && !customTypeName.trim()) { setError('Please name the custom account type.'); return }
    setSaving(true); setError('')

    // Cash balances are trigger-maintained from linked transactions, so current_balance
    // is only ever set here at creation (seeded from starting_balance) and left alone on
    // edit. Investment/debt accounts have no transaction linkage yet, so their balance is
    // always manually entered — both at creation and on edit.
    const isCash = accountClass === 'cash'
    const payload = {
      name: name.trim(),
      institution_name: institution.trim() || null,
      account_class: accountClass,
      account_type: isCustom ? customTypeName.trim() : accountType,
      is_custom_type: isCustom,
      starting_balance: isCash ? Number(startingBalance) || 0 : Number(currentBalance) || 0,
      min_balance_floor: isCash && minFloor !== '' ? Number(minFloor) : null,
    }
    if (!defaultValues.id) {
      payload.current_balance = isCash ? Number(startingBalance) || 0 : Number(currentBalance) || 0
    } else if (!isCash) {
      payload.current_balance = Number(currentBalance) || 0
    }

    const { error: dbErr } = defaultValues.id
      ? await supabase.from('accounts').update(payload).eq('id', defaultValues.id)
      : await supabase.from('accounts').insert({ ...payload, user_id: user.id })

    setSaving(false)
    if (dbErr) { setError('Something went wrong. Try again.'); return }
    await reload()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-navy block mb-2">Account type</label>
        <div className="flex rounded-lg overflow-hidden border border-navy/20">
          {ACCOUNT_CLASSES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => handleClassChange(c.value)}
              className={`flex-1 py-2.5 text-sm font-medium font-sans transition-colors
                ${accountClass === c.value ? 'bg-blue text-white' : 'bg-white text-navy/50 hover:bg-navy/5'}`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-navy">Specific type</label>
        <select
          value={accountType}
          onChange={e => setAccountType(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
            focus:outline-none focus:ring-2 focus:ring-blue/40"
        >
          {typesForClass.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {accountType === 'custom' && (
        <Input label="Custom type name" value={customTypeName} onChange={e => setCustomTypeName(e.target.value)} placeholder="e.g. Pension" />
      )}

      <Input label="Account name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fidelity 401(k)" />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-navy">Institution (optional)</label>
        <input
          list="institution-options"
          type="text"
          value={institution}
          onChange={e => setInstitution(e.target.value)}
          placeholder="e.g. Fidelity"
          className="w-full px-4 py-2.5 rounded-lg border border-navy/20 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
        <datalist id="institution-options">
          {institutionOptions.map(name => <option key={name} value={name} />)}
        </datalist>
      </div>

      {accountClass === 'cash' ? (
        <Input
          label={defaultValues.id ? 'Starting balance (USD)' : 'Starting balance (USD)'}
          type="number"
          step="0.01"
          value={startingBalance}
          onChange={e => setStartingBalance(e.target.value)}
          placeholder="0.00"
        />
      ) : (
        <Input
          label={accountClass === 'debt' ? 'Current balance owed (USD)' : 'Current balance (USD)'}
          type="number"
          step="0.01"
          value={currentBalance}
          onChange={e => setCurrentBalance(e.target.value)}
          placeholder="0.00"
        />
      )}
      {accountClass === 'cash' && defaultValues.id && (
        <p className="text-xs text-navy/40 font-sans -mt-2">
          Current balance updates automatically from linked transactions and isn't edited here.
        </p>
      )}

      {accountClass === 'cash' && (
        <Input
          label="Minimum balance floor (optional)"
          type="number"
          min="0"
          step="0.01"
          value={minFloor}
          onChange={e => setMinFloor(e.target.value)}
          placeholder="e.g. 500"
        />
      )}

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" variant="cta" disabled={saving} className="w-full mt-1">
        {saving ? 'Saving…' : defaultValues.id ? 'Save changes' : 'Add account'}
      </Button>
    </form>
  )
}
