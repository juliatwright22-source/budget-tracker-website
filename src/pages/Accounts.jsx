import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAccounts } from '../context/AccountsContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import AccountForm from '../components/features/AccountForm'
import HoldingsPanel from '../components/features/HoldingsPanel'
import ProjectionsPanel from '../components/features/ProjectionsPanel'
import DebtDetailsForm from '../components/features/DebtDetailsForm'
import { ACCOUNT_CLASSES, ACCOUNT_TYPES } from '../lib/constants'
import { useFormat } from '../context/PreferencesContext'
import { payoffOrder, simulatePayoff } from '../lib/debt'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function downsample(schedule, maxPoints = 100) {
  if (schedule.length <= maxPoints) return schedule
  const step = Math.ceil(schedule.length / maxPoints)
  return schedule.filter((_, i) => i % step === 0 || i === schedule.length - 1)
}

function typeLabel(account) {
  if (account.is_custom_type) return account.account_type
  return ACCOUNT_TYPES.find(t => t.value === account.account_type)?.label ?? account.account_type
}

export default function Accounts() {
  const { user } = useAuth()
  const { activeAccounts, totalsByClass, netWorth, totalsByInstitution, floorWarnings, reload } = useAccounts()
  const { formatCurrency } = useFormat()
  const [view, setView] = useState('accounts')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [holdingsAccount, setHoldingsAccount] = useState(null)
  const [projectionsAccount, setProjectionsAccount] = useState(null)
  const [debtDetailsAccount, setDebtDetailsAccount] = useState(null)

  const [debtDetailsMap, setDebtDetailsMap] = useState({})
  const [strategy, setStrategy] = useState('avalanche')
  const [extraPayment, setExtraPayment] = useState('0')
  const [payoffLoaded, setPayoffLoaded] = useState(false)

  function openNew() { setEditing(null); setOpen(true) }
  function openEdit(a) { setEditing(a); setOpen(true) }

  async function deleteAccount(id) {
    if (!confirm('Delete this account? Transactions linked to it will become unlinked.')) return
    await supabase.from('accounts').delete().eq('id', id)
    reload()
  }

  useEffect(() => {
    if (view !== 'payoff' || !user) return
    let cancelled = false
    Promise.all([
      supabase.from('debt_details').select('*').eq('user_id', user.id),
      supabase.from('debt_payoff_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([detailsRes, settingsRes]) => {
      if (cancelled) return
      setDebtDetailsMap(Object.fromEntries((detailsRes.data ?? []).map(d => [d.account_id, d])))
      setStrategy(settingsRes.data?.strategy ?? 'avalanche')
      setExtraPayment(String(settingsRes.data?.extra_monthly_payment ?? 0))
      setPayoffLoaded(true)
    })
    return () => { cancelled = true }
  }, [view, user])

  async function savePayoffSettings(nextStrategy, nextExtra) {
    await supabase.from('debt_payoff_settings').upsert({
      user_id: user.id, strategy: nextStrategy, extra_monthly_payment: Number(nextExtra) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  const institutionEntries = Object.entries(totalsByInstitution).sort((a, b) => b[1] - a[1])
  const debtAccounts = activeAccounts.filter(a => a.account_class === 'debt')
  const debtsForSim = debtAccounts
    .filter(a => debtDetailsMap[a.id])
    .map(a => ({
      id: a.id,
      balance: Number(a.current_balance),
      interest_rate: Number(debtDetailsMap[a.id].interest_rate),
      minimum_payment: Number(debtDetailsMap[a.id].minimum_payment),
    }))
  const simResult = debtsForSim.length > 0 ? simulatePayoff(debtsForSim, strategy, extraPayment) : null
  const order = debtsForSim.length > 0 ? payoffOrder(debtsForSim, strategy) : []

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Accounts</h1>
        {view === 'accounts' && <Button variant="cta" size="sm" onClick={openNew}>+ Add account</Button>}
      </div>

      <div className="flex rounded-lg overflow-hidden border border-navy/20 mb-6 max-w-xs">
        {['accounts', 'payoff'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-sm font-medium font-sans transition-colors
              ${view === v ? 'bg-blue text-white' : 'bg-white text-navy/50 hover:bg-navy/5'}`}
          >
            {v === 'accounts' ? 'Accounts' : 'Payoff Plan'}
          </button>
        ))}
      </div>

      {view === 'payoff' ? (
        !payoffLoaded ? (
          <p className="text-navy/40 font-sans text-sm text-center py-20">Loading…</p>
        ) : debtAccounts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-navy/50 font-sans">No debt accounts yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex rounded-lg overflow-hidden border border-navy/20 mb-4">
                {['avalanche', 'snowball'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setStrategy(s); savePayoffSettings(s, extraPayment) }}
                    className={`flex-1 py-2 text-sm font-medium font-sans capitalize transition-colors
                      ${strategy === s ? 'bg-blue text-white' : 'bg-white text-navy/50 hover:bg-navy/5'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Input
                label="Extra monthly payment (USD)"
                type="number" min="0" step="1"
                value={extraPayment}
                onChange={e => setExtraPayment(e.target.value)}
                onBlur={() => savePayoffSettings(strategy, extraPayment)}
              />
            </Card>

            {debtsForSim.length === 0 ? (
              <p className="text-navy/40 font-sans text-sm text-center py-6">
                Add an interest rate and minimum payment to your debt accounts (💳 Payoff details, in the Accounts view) to see a plan.
              </p>
            ) : (
              <>
                <Card>
                  <p className="text-sm font-sans text-navy/70">
                    At this pace, you'll be debt-free in <span className="font-medium text-navy">{simResult.totalMonths} months</span>,
                    paying about <span className="font-medium text-navy">{formatCurrency(simResult.totalInterestPaid)}</span> in total interest.
                  </p>
                </Card>

                <div>
                  <h3 className="font-serif text-base text-navy mb-2">Payoff order</h3>
                  <Card>
                    <ul className="flex flex-col divide-y divide-navy/8">
                      {order.map((id, i) => {
                        const acc = debtAccounts.find(a => a.id === id)
                        return (
                          <li key={id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm font-sans">
                            <span>{i + 1}. {acc?.name}</span>
                            <span className="text-navy/50">Paid off month {simResult.payoffMonths[id] ?? '—'}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </Card>
                </div>

                <div>
                  <h3 className="font-serif text-base text-navy mb-2">Total debt remaining</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={downsample(simResult.schedule)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid stroke="#09263414" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#09263480' }} tickFormatter={m => `Mo ${m}`} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#09263480' }} tickFormatter={v => formatCurrency(v).replace(/\.00$/, '')} axisLine={false} tickLine={false} width={64} />
                      <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={m => `Month ${m}`} />
                      <Line type="monotone" dataKey="totalRemaining" name="Total debt remaining" stroke="#004E72" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )
      ) : (
      <>
      {floorWarnings.length > 0 && (
        <Card className="mb-5 border-orange/40 bg-orange/5">
          <p className="text-sm font-sans text-orange font-medium mb-1">Balance below your floor</p>
          {floorWarnings.map(a => (
            <p key={a.id} className="text-xs font-sans text-navy/70">
              {a.name} is at {formatCurrency(a.current_balance)}, below your {formatCurrency(a.min_balance_floor)} floor.
            </p>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Net worth</p>
          <p className="font-sans font-semibold text-xl text-navy">{formatCurrency(netWorth)}</p>
        </Card>
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Cash</p>
          <p className="font-sans font-semibold text-xl text-blue">{formatCurrency(totalsByClass.cash)}</p>
        </Card>
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Investments</p>
          <p className="font-sans font-semibold text-xl text-blue">{formatCurrency(totalsByClass.investment)}</p>
        </Card>
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Debt</p>
          <p className="font-sans font-semibold text-xl text-orange">{formatCurrency(totalsByClass.debt)}</p>
        </Card>
      </div>

      {activeAccounts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏦</p>
          <p className="text-navy/50 font-sans mb-4">No accounts yet — add your first one.</p>
          <Button variant="primary" onClick={openNew}>Add an account</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {ACCOUNT_CLASSES.map(cls => {
            const accountsInClass = activeAccounts.filter(a => a.account_class === cls.value)
            if (accountsInClass.length === 0) return null
            return (
              <div key={cls.value}>
                <h2 className="font-serif text-lg text-navy mb-3">{cls.emoji} {cls.label}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accountsInClass.map(a => (
                    <Card key={a.id} className="flex items-start justify-between">
                      <div>
                        <p className="font-sans font-medium text-navy text-sm">{a.name}</p>
                        <p className="text-xs text-navy/40 font-sans mt-0.5">{typeLabel(a)}{a.institution_name ? ` · ${a.institution_name}` : ''}</p>
                        <p className={`font-sans font-semibold text-lg mt-2 ${cls.value === 'debt' ? 'text-orange' : 'text-navy'}`}>
                          {formatCurrency(a.current_balance)}
                        </p>
                        <div className="flex gap-3 mt-1">
                          {cls.value === 'investment' && (
                            <button onClick={() => setHoldingsAccount(a)} className="text-xs font-sans text-blue hover:underline">
                              📊 Holdings
                            </button>
                          )}
                          {cls.value !== 'debt' && (
                            <button onClick={() => setProjectionsAccount(a)} className="text-xs font-sans text-blue hover:underline">
                              📈 Projections
                            </button>
                          )}
                          {cls.value === 'debt' && (
                            <button onClick={() => setDebtDetailsAccount(a)} className="text-xs font-sans text-blue hover:underline">
                              💳 Payoff details
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(a)} className="text-navy/30 hover:text-blue text-sm transition-colors">✏</button>
                        <button onClick={() => deleteAccount(a.id)} className="text-navy/30 hover:text-orange text-sm transition-colors">✕</button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {institutionEntries.length > 0 && (
            <div>
              <h2 className="font-serif text-lg text-navy mb-3">By institution</h2>
              <Card>
                <ul className="flex flex-col divide-y divide-navy/8">
                  {institutionEntries.map(([name, total]) => (
                    <li key={name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <span className="text-sm font-sans text-navy">{name}</span>
                      <span className="text-sm font-sans font-medium text-navy">{formatCurrency(total)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      )}
      </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit account' : 'New account'}>
        <AccountForm
          defaultValues={editing ?? {}}
          onSuccess={() => setOpen(false)}
        />
      </Modal>

      <Modal open={!!holdingsAccount} onClose={() => setHoldingsAccount(null)} title={holdingsAccount?.name ?? ''}>
        {holdingsAccount && <HoldingsPanel account={holdingsAccount} />}
      </Modal>

      <Modal open={!!projectionsAccount} onClose={() => setProjectionsAccount(null)} title={projectionsAccount ? `Projections — ${projectionsAccount.name}` : ''}>
        {projectionsAccount && <ProjectionsPanel account={projectionsAccount} />}
      </Modal>

      <Modal open={!!debtDetailsAccount} onClose={() => setDebtDetailsAccount(null)} title={debtDetailsAccount ? `Payoff details — ${debtDetailsAccount.name}` : ''}>
        {debtDetailsAccount && (
          <DebtDetailsForm account={debtDetailsAccount} onSuccess={() => setDebtDetailsAccount(null)} />
        )}
      </Modal>
    </PageWrapper>
  )
}
