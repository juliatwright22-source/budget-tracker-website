import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import TransactionForm from '../components/features/TransactionForm'
import RecurringRuleForm from '../components/features/RecurringRuleForm'
import { parseVoiceInput } from '../lib/utils'
import { useFormat } from '../context/PreferencesContext'

const FREQUENCY_LABELS = {
  weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly',
  quarterly: 'Every 3 months', annually: 'Annually',
}

export default function Transactions() {
  const { user } = useAuth()
  const { transactions, categories, recurringRules, reload } = useBudget()
  const { formatCurrency, formatDate } = useFormat()
  const [view, setView] = useState('transactions')
  const [addOpen, setAddOpen] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCat, setFilterCat] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [voiceModal, setVoiceModal] = useState(false)
  const [voiceParsed, setVoiceParsed] = useState(null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [overrideRule, setOverrideRule] = useState(null)
  const [overrideAmount, setOverrideAmount] = useState('')
  const [overrideDate, setOverrideDate] = useState('')
  const [overrideNote, setOverrideNote] = useState('')

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Voice input isn\'t supported in your browser. Try Chrome.'); return }
    const r = new SpeechRecognition()
    r.lang = 'en-US'
    r.onstart = () => setListening(true)
    r.onend = () => setListening(false)
    r.onresult = (e) => {
      const text = e.results[0][0].transcript
      const parsed = parseVoiceInput(text)
      const matchedCat = categories.find(c => c.name.toLowerCase() === parsed.categoryHint?.toLowerCase())
      setVoiceParsed({
        ...parsed,
        categoryId: matchedCat?.id ?? '',
        rawText: text,
        date: new Date().toISOString().split('T')[0],
      })
      setVoiceModal(true)
    }
    r.start()
    recognitionRef.current = r
  }

  async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id)
    reload()
  }

  function openNewRule() { setEditingRule(null); setRuleModalOpen(true) }
  function openEditRule(rule) { setEditingRule(rule); setRuleModalOpen(true) }

  async function toggleRuleActive(rule) {
    await supabase.from('recurring_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
    reload()
  }

  async function deleteRule(id) {
    if (!confirm('Delete this recurring item? Already-generated transactions will stay, just unlinked.')) return
    await supabase.from('recurring_rules').delete().eq('id', id)
    reload()
  }

  async function skipNextOccurrence(rule) {
    if (!confirm(`Skip the ${formatDate(rule.next_occurrence)} occurrence of "${rule.name}"?`)) return
    await supabase.from('recurring_rule_exceptions').upsert({
      recurring_rule_id: rule.id,
      user_id: user.id,
      occurrence_date: rule.next_occurrence,
      action: 'skip',
    }, { onConflict: 'recurring_rule_id,occurrence_date' })
    reload()
  }

  function openOverride(rule) {
    setOverrideRule(rule)
    setOverrideAmount(String(rule.amount))
    setOverrideDate(rule.next_occurrence)
    setOverrideNote(rule.name)
  }

  async function saveOverride() {
    if (!overrideRule) return
    await supabase.from('recurring_rule_exceptions').upsert({
      recurring_rule_id: overrideRule.id,
      user_id: user.id,
      occurrence_date: overrideRule.next_occurrence,
      action: 'edit',
      override_amount: overrideAmount !== '' ? Number(overrideAmount) : null,
      override_date: overrideDate || null,
      override_note: overrideNote || null,
    }, { onConflict: 'recurring_rule_id,occurrence_date' })
    setOverrideRule(null)
    reload()
  }

  const filtered = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (filterCat && tx.category_id !== filterCat) return false
    if (filterMonth && !tx.date.startsWith(filterMonth)) return false
    if (search) {
      const cat = catMap[tx.category_id]
      const haystack = `${tx.note ?? ''} ${cat?.name ?? ''} ${tx.amount}`.toLowerCase()
      if (!haystack.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Transactions</h1>
        {view === 'transactions' ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={startVoice}>
              {listening ? '🔴 Listening…' : '🎙 Voice'}
            </Button>
            <Button variant="cta" size="sm" onClick={() => setAddOpen(true)}>+ Add</Button>
          </div>
        ) : (
          <Button variant="cta" size="sm" onClick={openNewRule}>+ Add recurring item</Button>
        )}
      </div>

      <div className="flex rounded-lg overflow-hidden border border-navy/20 mb-6 max-w-xs">
        {['transactions', 'recurring'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-sm font-medium font-sans capitalize transition-colors
              ${view === v ? 'bg-blue text-white' : 'bg-white text-navy/50 hover:bg-navy/5'}`}
          >
            {v === 'transactions' ? 'Transactions' : 'Recurring'}
          </button>
        ))}
      </div>

      {view === 'recurring' ? (
        recurringRules.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔁</p>
            <p className="text-navy/50 font-sans mb-4">No recurring items yet — add rent, a paycheck, or any bill that repeats.</p>
            <Button variant="primary" onClick={openNewRule}>Add a recurring item</Button>
          </div>
        ) : (
          <Card>
            <ul className="flex flex-col divide-y divide-navy/8">
              {recurringRules.map(rule => {
                const cat = categories.find(c => c.id === rule.category_id)
                return (
                  <li key={rule.id} className={`flex items-center justify-between py-3.5 first:pt-0 last:pb-0 ${!rule.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat?.emoji ?? (rule.type === 'income' ? '💵' : '🔁')}</span>
                      <div>
                        <p className="text-sm font-medium text-navy font-sans">{rule.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge type={rule.type} />
                          <span className="text-xs text-navy/40 font-sans">{FREQUENCY_LABELS[rule.frequency]}</span>
                          <span className="text-xs text-navy/40 font-sans">
                            {rule.is_active ? `Next: ${formatDate(rule.next_occurrence)}` : 'Paused'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-sans font-semibold text-sm ${rule.type === 'income' ? 'text-blue' : 'text-orange'}`}>
                        {rule.type === 'income' ? '+' : '-'}{formatCurrency(rule.amount)}
                      </span>
                      {rule.is_active && (
                        <>
                          <button onClick={() => openOverride(rule)} className="text-navy/30 hover:text-blue text-xs font-sans transition-colors">Edit next</button>
                          <button onClick={() => skipNextOccurrence(rule)} className="text-navy/30 hover:text-blue text-xs font-sans transition-colors">Skip next</button>
                        </>
                      )}
                      <button onClick={() => toggleRuleActive(rule)} className="text-navy/30 hover:text-blue text-sm transition-colors" title={rule.is_active ? 'Pause' : 'Resume'}>
                        {rule.is_active ? '⏸' : '▶'}
                      </button>
                      <button onClick={() => openEditRule(rule)} className="text-navy/30 hover:text-blue text-sm transition-colors">✏</button>
                      <button onClick={() => deleteRule(rule.id)} className="text-navy/30 hover:text-orange text-sm transition-colors">✕</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )
      ) : (
        <>
      {/* Filters */}
      <Card className="mb-5">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[160px] px-4 py-2 rounded-lg border border-navy/20 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-navy/20 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue/40 bg-white"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 rounded-lg border border-navy/20 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue/40 bg-white"
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-navy/20 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue/40 bg-white"
          />
        </div>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-navy/50 font-sans">No transactions yet — add your first one.</p>
        </div>
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-navy/8">
            {filtered.map(tx => {
              const cat = catMap[tx.category_id]
              return (
                <li key={tx.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat?.emoji ?? (tx.type === 'income' ? '💵' : '📦')}</span>
                    <div>
                      <p className="text-sm font-medium text-navy font-sans">{tx.note ?? cat?.name ?? tx.type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge type={tx.type} />
                        {cat && <span className="text-xs text-navy/40 font-sans">{cat.name}</span>}
                        <span className="text-xs text-navy/40 font-sans">{formatDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-sans font-semibold text-sm ${tx.type === 'income' ? 'text-blue' : 'text-orange'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <button onClick={() => setEditTx(tx)} className="text-navy/30 hover:text-blue text-sm transition-colors">✏</button>
                    <button onClick={() => deleteTransaction(tx.id)} className="text-navy/30 hover:text-orange text-sm transition-colors">✕</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add transaction">
        <TransactionForm onSuccess={() => { setAddOpen(false); reload() }} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTx} onClose={() => setEditTx(null)} title="Edit transaction">
        {editTx && (
          <TransactionForm
            defaultValues={{
              id: editTx.id,
              type: editTx.type,
              amount: editTx.amount,
              categoryId: editTx.category_id ?? '',
              accountId: editTx.account_id ?? '',
              date: editTx.date,
              note: editTx.note ?? '',
            }}
            onSuccess={() => { setEditTx(null); reload() }}
          />
        )}
      </Modal>

      {/* Voice confirm modal */}
      <Modal open={voiceModal} onClose={() => setVoiceModal(false)} title="Does this look right?">
        {voiceParsed && (
          <div className="flex flex-col gap-4">
            <div className="bg-navy/5 rounded-lg p-4 text-sm font-sans text-navy/70">
              "{voiceParsed.rawText}"
            </div>
            <TransactionForm
              defaultValues={voiceParsed}
              onSuccess={() => { setVoiceModal(false); reload() }}
            />
          </div>
        )}
      </Modal>

      {/* Floating add */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 w-14 h-14 bg-orange text-white rounded-full shadow-lg
          flex items-center justify-center text-3xl hover:opacity-90 transition-opacity z-30"
      >+</button>
        </>
      )}

      {/* Recurring rule add/edit modal */}
      <Modal open={ruleModalOpen} onClose={() => setRuleModalOpen(false)} title={editingRule ? 'Edit recurring item' : 'New recurring item'}>
        <RecurringRuleForm
          defaultValues={editingRule ?? {}}
          onSuccess={() => setRuleModalOpen(false)}
        />
      </Modal>

      {/* Override next occurrence modal */}
      <Modal open={!!overrideRule} onClose={() => setOverrideRule(null)} title={`Edit next occurrence — ${overrideRule?.name}`}>
        <div className="flex flex-col gap-4">
          <Input label="Amount (USD)" type="number" min="0" step="0.01" value={overrideAmount} onChange={e => setOverrideAmount(e.target.value)} />
          <Input label="Date" type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} />
          <Input label="Note" type="text" value={overrideNote} onChange={e => setOverrideNote(e.target.value)} />
          <Button variant="cta" onClick={saveOverride} className="w-full">Save this occurrence only</Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
