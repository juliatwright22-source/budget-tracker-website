import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccounts } from '../context/AccountsContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import AccountForm from '../components/features/AccountForm'
import HoldingsPanel from '../components/features/HoldingsPanel'
import { ACCOUNT_CLASSES, ACCOUNT_TYPES } from '../lib/constants'
import { useFormat } from '../context/PreferencesContext'

function typeLabel(account) {
  if (account.is_custom_type) return account.account_type
  return ACCOUNT_TYPES.find(t => t.value === account.account_type)?.label ?? account.account_type
}

export default function Accounts() {
  const { activeAccounts, totalsByClass, netWorth, totalsByInstitution, floorWarnings, reload } = useAccounts()
  const { formatCurrency } = useFormat()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [holdingsAccount, setHoldingsAccount] = useState(null)

  function openNew() { setEditing(null); setOpen(true) }
  function openEdit(a) { setEditing(a); setOpen(true) }

  async function deleteAccount(id) {
    if (!confirm('Delete this account? Transactions linked to it will become unlinked.')) return
    await supabase.from('accounts').delete().eq('id', id)
    reload()
  }

  const institutionEntries = Object.entries(totalsByInstitution).sort((a, b) => b[1] - a[1])

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Accounts</h1>
        <Button variant="cta" size="sm" onClick={openNew}>+ Add account</Button>
      </div>

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
                        {cls.value === 'investment' && (
                          <button onClick={() => setHoldingsAccount(a)} className="text-xs font-sans text-blue hover:underline mt-1">
                            📊 Holdings
                          </button>
                        )}
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit account' : 'New account'}>
        <AccountForm
          defaultValues={editing ?? {}}
          onSuccess={() => setOpen(false)}
        />
      </Modal>

      <Modal open={!!holdingsAccount} onClose={() => setHoldingsAccount(null)} title={holdingsAccount?.name ?? ''}>
        {holdingsAccount && <HoldingsPanel account={holdingsAccount} />}
      </Modal>
    </PageWrapper>
  )
}
