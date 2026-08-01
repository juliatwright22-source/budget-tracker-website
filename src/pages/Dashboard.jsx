import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { useAccounts } from '../context/AccountsContext'
import { useGoals } from '../context/GoalsContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import TransactionForm from '../components/features/TransactionForm'
import AlertBanner from '../components/features/AlertBanner'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getGreeting, getMonthName, lastMonthRange, lastMonthKey } from '../lib/utils'
import { useFormat } from '../context/PreferencesContext'
import { goalProgress } from '../lib/goals'

const CHART_COLORS = ['#004E72', '#FF6E42', '#092634', '#7ab3c8', '#ffb59b']

export default function Dashboard() {
  const { profile } = useAuth()
  const {
    transactions, categories, totalIncome, totalExpenses, balance, monthlyTx, reload,
    lastMonthCashFlowIntent, saveCashFlowIntent,
  } = useBudget()
  const { netWorth, accounts } = useAccounts()
  const { goals } = useGoals()
  const accountsById = Object.fromEntries(accounts.map(a => [a.id, a]))
  const totalSaved = goals.reduce((s, g) => s + goalProgress(g, accountsById), 0)
  const { formatCurrency, formatDate } = useFormat()
  const [addOpen, setAddOpen] = useState(false)
  const [banner, setBanner] = useState(null)
  const [actualDescription, setActualDescription] = useState('')
  const [actualAmount, setActualAmount] = useState('')

  // Monthly summary banner
  useEffect(() => {
    const key = `yachty_dismissed_${lastMonthKey()}`
    if (localStorage.getItem(key)) return
    const today = new Date()
    if (today.getDate() === 1 && transactions.length > 0) {
      const { start, end } = lastMonthRange()
      const lastMonthTx = transactions.filter(t => t.date >= start && t.date <= end)
      if (lastMonthTx.length === 0) return
      const income = lastMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const spent = lastMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const saved = spent < income ? income - spent : 0

      // Biggest category
      const catSpend = {}
      lastMonthTx.filter(t => t.type === 'expense' && t.category_id).forEach(t => {
        catSpend[t.category_id] = (catSpend[t.category_id] ?? 0) + Number(t.amount)
      })
      const biggestCatId = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0]?.[0]
      const biggestCat = categories.find(c => c.id === biggestCatId)

      setBanner({ income, spent, saved, biggestCat, key })
    }
  }, [transactions, categories])

  function dismissBanner() {
    if (banner?.key) localStorage.setItem(banner.key, '1')
    setBanner(null)
  }

  async function resolveIntent() {
    await saveCashFlowIntent(lastMonthKey(), {
      actual_description: actualDescription || null,
      actual_amount: actualAmount !== '' ? Number(actualAmount) : null,
      status: 'resolved',
    })
    setActualDescription(''); setActualAmount('')
  }

  // Donut chart data
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const catSpend = {}
  monthlyTx.filter(t => t.type === 'expense' && t.category_id).forEach(t => {
    const name = catMap[t.category_id]?.name ?? 'Other'
    catSpend[name] = (catSpend[name] ?? 0) + Number(t.amount)
  })
  const chartData = Object.entries(catSpend).map(([name, value]) => ({ name, value }))

  const recentTx = transactions.slice(0, 5)

  return (
    <PageWrapper>
      <AlertBanner />

      {/* Monthly summary banner */}
      {banner && (
        <div className="mb-6 bg-navy rounded-xl p-5 text-white relative">
          <button onClick={dismissBanner} className="absolute top-4 right-4 text-white/40 hover:text-white text-xl">&times;</button>
          <h3 className="font-serif text-lg mb-3">Here's how {getMonthName(-1)} went, {profile?.display_name}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm font-sans">
            <div><p className="text-white/50 text-xs">Income</p><p className="font-medium">{formatCurrency(banner.income)}</p></div>
            <div><p className="text-white/50 text-xs">Spent</p><p className="font-medium">{formatCurrency(banner.spent)}</p></div>
            <div><p className="text-white/50 text-xs">Saved</p><p className="font-medium text-orange">{formatCurrency(banner.saved)}</p></div>
            {banner.biggestCat && <div><p className="text-white/50 text-xs">Biggest category</p><p className="font-medium">{banner.biggestCat.emoji} {banner.biggestCat.name}</p></div>}
          </div>
          <p className="text-white/60 text-xs mt-3 font-sans">You stayed under budget — great work. Keep it up this month.</p>

          {lastMonthCashFlowIntent?.status === 'declared' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm font-sans text-white/90 mb-2">
                You planned: "{lastMonthCashFlowIntent.intent_description}"
                {lastMonthCashFlowIntent.planned_amount != null && ` (${formatCurrency(lastMonthCashFlowIntent.planned_amount)})`} — what did you actually do?
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="What actually happened?"
                  value={actualDescription}
                  onChange={e => setActualDescription(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={actualAmount}
                  onChange={e => setActualAmount(e.target.value)}
                  className="w-full sm:w-28 px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <Button variant="cta" size="sm" onClick={resolveIntent}>Save</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-navy">{getGreeting()}, {profile?.display_name} 👋</h1>
        <p className="text-navy-80 font-sans text-sm mt-1">{getMonthName()} at a glance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Income this month</p>
          <p className="font-sans font-semibold text-xl text-blue">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Spent this month</p>
          <p className="font-sans font-semibold text-xl text-orange">{formatCurrency(totalExpenses)}</p>
        </Card>
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Remaining</p>
          <p className="font-sans font-semibold text-xl text-navy">{formatCurrency(balance)}</p>
        </Card>
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Net worth</p>
          {accounts.length > 0
            ? <p className="font-sans font-semibold text-xl text-navy">{formatCurrency(netWorth)}</p>
            : <p className="text-xs font-sans text-navy/40 mt-1">Add an account to track this</p>}
        </Card>
        <Card>
          <p className="text-xs font-sans text-navy/50 mb-1">Total saved</p>
          <p className="font-sans font-semibold text-xl text-blue">{formatCurrency(totalSaved)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Donut chart */}
        <Card>
          <h2 className="font-serif text-lg text-navy mb-4">Spending by category</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-navy/40 font-sans text-sm text-center py-8">Add some expenses to see your breakdown.</p>
          )}
          {chartData.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              {chartData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs font-sans text-navy/70">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent transactions */}
        <Card>
          <h2 className="font-serif text-lg text-navy mb-4">Recent transactions</h2>
          {recentTx.length === 0 ? (
            <p className="text-navy/40 font-sans text-sm text-center py-8">No transactions yet — add your first one.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentTx.map(tx => {
                const cat = catMap[tx.category_id]
                return (
                  <li key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cat?.emoji ?? (tx.type === 'income' ? '💵' : '📦')}</span>
                      <div>
                        <p className="text-sm font-medium text-navy font-sans">{tx.note ?? cat?.name ?? tx.type}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge type={tx.type} />
                          <span className="text-xs text-navy/40 font-sans">{formatDate(tx.date)}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`font-sans font-semibold text-sm ${tx.type === 'income' ? 'text-blue' : 'text-orange'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 w-14 h-14 bg-orange text-white rounded-full shadow-lg
          flex items-center justify-center text-3xl hover:opacity-90 transition-opacity z-30"
        aria-label="Add transaction"
      >
        +
      </button>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add transaction">
        <TransactionForm onSuccess={() => { setAddOpen(false); reload() }} />
      </Modal>
    </PageWrapper>
  )
}
