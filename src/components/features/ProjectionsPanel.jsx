import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useFormat } from '../../context/PreferencesContext'
import { defaultProjectionRates, projectGrowth } from '../../lib/projections'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import Button from '../ui/Button'
import Input from '../ui/Input'

// Sequential single-hue ramp (light -> dark) since the three scenarios are an
// ordered progression of the same assumption, not unrelated categories.
const SCENARIO_COLORS = { conservative: '#7ab3c8', expected: '#004E72', optimistic: '#092634' }

export default function ProjectionsPanel({ account }) {
  const { user } = useAuth()
  const { formatCurrency } = useFormat()
  const [loaded, setLoaded] = useState(false)
  const [conservative, setConservative] = useState('')
  const [expected, setExpected] = useState('')
  const [optimistic, setOptimistic] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('0')
  const [years, setYears] = useState('10')
  const [oneTimeContribution, setOneTimeContribution] = useState('')
  const [oneTimeMonth, setOneTimeMonth] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.from('account_projection_settings').select('*').eq('account_id', account.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const defaults = defaultProjectionRates(account)
        setConservative(data?.conservative_rate ?? defaults.conservative ?? '')
        setExpected(data?.expected_rate ?? defaults.expected ?? '')
        setOptimistic(data?.optimistic_rate ?? defaults.optimistic ?? '')
        setMonthlyContribution(String(data?.monthly_contribution ?? 0))
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [account.id])

  async function save() {
    setSaving(true)
    await supabase.from('account_projection_settings').upsert({
      account_id: account.id,
      user_id: user.id,
      conservative_rate: conservative !== '' ? Number(conservative) : null,
      expected_rate: expected !== '' ? Number(expected) : null,
      optimistic_rate: optimistic !== '' ? Number(optimistic) : null,
      monthly_contribution: Number(monthlyContribution) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' })
    setSaving(false)
  }

  if (!loaded) return <p className="text-navy/40 font-sans text-sm text-center py-8">Loading…</p>

  const startingValue = Number(account.current_balance)
  const yearsNum = Number(years) || 0
  const commonParams = {
    startingValue,
    monthlyContribution: Number(monthlyContribution) || 0,
    years: yearsNum,
    oneTimeContribution: oneTimeContribution !== '' ? Number(oneTimeContribution) : 0,
    oneTimeMonth: oneTimeMonth !== '' ? Number(oneTimeMonth) : null,
  }

  const results = {
    conservative: projectGrowth({ ...commonParams, annualRatePercent: conservative !== '' ? Number(conservative) : null }),
    expected: projectGrowth({ ...commonParams, annualRatePercent: expected !== '' ? Number(expected) : null }),
    optimistic: projectGrowth({ ...commonParams, annualRatePercent: optimistic !== '' ? Number(optimistic) : null }),
  }

  const hasRates = conservative !== '' && expected !== '' && optimistic !== ''
  const chartData = []
  if (hasRates) {
    for (let i = 0; i <= yearsNum; i++) {
      chartData.push({
        year: i,
        conservative: results.conservative.series[i]?.value ?? null,
        expected: results.expected.series[i]?.value ?? null,
        optimistic: results.optimistic.series[i]?.value ?? null,
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2">
        <Input label="Conservative %" type="number" step="0.1" value={conservative} onChange={e => setConservative(e.target.value)} placeholder="—" />
        <Input label="Expected %" type="number" step="0.1" value={expected} onChange={e => setExpected(e.target.value)} placeholder="—" />
        <Input label="Optimistic %" type="number" step="0.1" value={optimistic} onChange={e => setOptimistic(e.target.value)} placeholder="—" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input label="Monthly contribution" type="number" min="0" step="1" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} placeholder="0" />
        <Input label="Time horizon (years)" type="number" min="1" step="1" value={years} onChange={e => setYears(e.target.value)} placeholder="10" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input label="One-time contribution (optional)" type="number" min="0" step="1" value={oneTimeContribution} onChange={e => setOneTimeContribution(e.target.value)} placeholder="e.g. bonus" />
        <Input label="In month #" type="number" min="1" step="1" value={oneTimeMonth} onChange={e => setOneTimeMonth(e.target.value)} placeholder="e.g. 12" />
      </div>

      {hasRates ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid stroke="#09263414" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#09263480' }} tickFormatter={y => `Yr ${y}`} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#09263480' }} tickFormatter={v => formatCurrency(v).replace(/\.00$/, '')} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={y => `Year ${y}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="conservative" name="Conservative" stroke={SCENARIO_COLORS.conservative} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expected" name="Expected" stroke={SCENARIO_COLORS.expected} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="optimistic" name="Optimistic" stroke={SCENARIO_COLORS.optimistic} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <p className="text-sm font-sans text-navy/70">
            In {yearsNum} year{yearsNum === 1 ? '' : 's'}, this account could be worth between{' '}
            <span className="font-medium text-navy">{formatCurrency(results.conservative.finalValue)}</span> and{' '}
            <span className="font-medium text-navy">{formatCurrency(results.optimistic.finalValue)}</span>, with{' '}
            <span className="font-medium text-navy">{formatCurrency(results.expected.finalValue)}</span> as the expected case.
          </p>
        </>
      ) : (
        <p className="text-navy/40 font-sans text-sm text-center py-6">
          Enter conservative, expected, and optimistic rates to see a projection.
        </p>
      )}

      <Button variant="cta" onClick={save} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save assumptions'}
      </Button>
    </div>
  )
}
