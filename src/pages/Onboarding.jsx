import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePreferences } from '../context/PreferencesContext'
import { DEFAULT_CATEGORIES, CURRENCIES, LOCALES, ONBOARDING_PERSONAS, GOAL_TEMPLATES } from '../lib/constants'
import Button from '../components/ui/Button'
import AccountForm from '../components/features/AccountForm'
import RecurringRuleForm from '../components/features/RecurringRuleForm'
import GoalForm from '../components/features/GoalForm'
import TransactionForm from '../components/features/TransactionForm'

const TOTAL_STEPS = 7

const INCOME_OPTIONS = [
  { key: 'salaried', label: 'Salaried or hourly', description: 'I get paid on a regular schedule' },
  { key: 'freelance', label: 'Freelance / variable', description: 'My income changes month to month' },
  { key: 'multiple_jobs', label: 'Multiple jobs', description: "I'll log income as it comes in" },
  { key: 'passive', label: 'Passive / other income', description: "I'll log income as it comes in" },
]

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const { reload: reloadPreferences } = usePreferences()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [persona, setPersona] = useState(null)
  const [selected, setSelected] = useState([])
  const [custom, setCustom] = useState('')

  const [currencyChoice, setCurrencyChoice] = useState('USD')
  const [localeChoice, setLocaleChoice] = useState('en-US')
  const [dateFormatChoice, setDateFormatChoice] = useState('MM/DD/YYYY')

  const [accountAdded, setAccountAdded] = useState(false)
  const [accountFormKey, setAccountFormKey] = useState(0)

  const [incomeStructure, setIncomeStructure] = useState(null)

  function choosePersona(p) {
    setPersona(p)
    setSelected(p.suggestedCategories)
  }

  function toggleCategory(name) {
    setSelected(s => s.includes(name) ? s.filter(n => n !== name) : [...s, name])
  }

  async function handlePreferences() {
    await supabase.from('profiles').update({
      currency: currencyChoice, locale: localeChoice, date_format: dateFormatChoice,
    }).eq('id', user.id)
    await reloadPreferences()
    setStep(3)
  }

  async function handleCategories() {
    const toInsert = DEFAULT_CATEGORIES
      .filter(c => selected.includes(c.name))
      .map((c, i) => ({ ...c, user_id: user.id, display_order: i }))

    if (custom.trim()) {
      toInsert.push({ name: custom.trim(), emoji: '📦', color: '#004E72', user_id: user.id, display_order: toInsert.length })
    }

    if (toInsert.length > 0) await supabase.from('categories').insert(toInsert)
    setStep(5)
  }

  async function handleComplete() {
    await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id)
    await refreshProfile()
    navigate('/dashboard')
  }

  const suggestedGoalTemplate = persona?.suggestedGoalTemplate
    ? GOAL_TEMPLATES.find(t => t.key === persona.suggestedGoalTemplate)
    : null
  const goalDefaultValues = suggestedGoalTemplate
    ? {
        template: suggestedGoalTemplate.key,
        name: suggestedGoalTemplate.label,
        emoji: suggestedGoalTemplate.emoji,
        target_basis: suggestedGoalTemplate.target_basis,
        target_months_expenses: suggestedGoalTemplate.target_months_expenses,
      }
    : {}

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="flex gap-2 mb-10 justify-center">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                n <= step ? 'bg-orange w-8' : 'bg-navy/15 w-4'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center">
            <div className="text-5xl mb-6">⛵</div>
            <h1 className="font-serif text-3xl text-navy mb-3">
              Welcome to Yachty, {profile?.display_name ?? 'there'}
            </h1>
            <p className="text-navy-80 font-sans leading-relaxed mb-8">
              Which of these sounds most like you? We'll use it to suggest a starting setup —
              everything here is editable later.
            </p>
            <div className="flex flex-col gap-2 mb-8 text-left">
              {ONBOARDING_PERSONAS.map(p => {
                const active = persona?.key === p.key
                return (
                  <button
                    key={p.key}
                    onClick={() => choosePersona(p)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                      ${active ? 'bg-blue text-white border-blue' : 'bg-white text-navy border-navy/20 hover:border-blue/50'}`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <p className="font-sans font-medium text-sm">{p.label}</p>
                      <p className={`font-sans text-xs ${active ? 'text-white/70' : 'text-navy/50'}`}>{p.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <Button variant="cta" size="lg" onClick={() => setStep(2)} className="w-full" disabled={!persona}>
              Let's go
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-serif text-3xl text-navy mb-2">A few preferences</h1>
            <p className="text-navy-80 font-sans text-sm mb-8">You can change these anytime in Settings.</p>

            <div className="flex flex-col gap-4 mb-8">
              <div>
                <label className="text-sm font-medium text-navy block mb-1">Currency</label>
                <select
                  value={currencyChoice}
                  onChange={e => setCurrencyChoice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue/40"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-navy block mb-1">Language & region</label>
                <select
                  value={localeChoice}
                  onChange={e => setLocaleChoice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue/40"
                >
                  {LOCALES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-navy block mb-1">Date format</label>
                <select
                  value={dateFormatChoice}
                  onChange={e => setDateFormatChoice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy font-sans text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue/40"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <Button variant="cta" size="lg" onClick={handlePreferences} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="font-serif text-3xl text-navy mb-2">Add an account</h1>
            <p className="text-navy-80 font-sans text-sm mb-8">
              Checking, savings, a credit card — whatever you'd like to track. You can add more anytime.
            </p>
            <AccountForm key={accountFormKey} onSuccess={() => setAccountAdded(true)} />
            {accountAdded && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm text-blue font-sans text-center">Account added!</p>
                <Button variant="ghost" size="sm" onClick={() => { setAccountAdded(false); setAccountFormKey(k => k + 1) }} className="w-full">
                  + Add another account
                </Button>
              </div>
            )}
            <button
              onClick={() => setStep(4)}
              className="w-full mt-4 text-sm text-navy/40 hover:text-navy/70 font-sans transition-colors"
            >
              {accountAdded ? 'Continue' : 'Skip for now'}
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="font-serif text-3xl text-navy mb-2">What do you spend money on?</h1>
            <p className="text-navy-80 font-sans text-sm mb-8">
              Pick the categories that apply to you — you can always add more later.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              {DEFAULT_CATEGORIES.map(cat => {
                const active = selected.includes(cat.name)
                return (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategory(cat.name)}
                    className={`px-4 py-2 rounded-full border text-sm font-sans font-medium transition-all
                      ${active
                        ? 'bg-blue text-white border-blue'
                        : 'bg-white text-navy border-navy/20 hover:border-blue/50'}`}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 mb-8">
              <input
                type="text"
                placeholder="Add a custom category…"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-navy/20 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue/40"
              />
            </div>

            <Button variant="cta" size="lg" onClick={handleCategories} className="w-full">
              Looks good
            </Button>
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="font-serif text-3xl text-navy mb-2">How does your income work?</h1>
            <p className="text-navy-80 font-sans text-sm mb-8">
              This just helps us know whether to set up a recurring paycheck for you.
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {INCOME_OPTIONS.map(o => {
                const active = incomeStructure === o.key
                return (
                  <button
                    key={o.key}
                    onClick={() => setIncomeStructure(o.key)}
                    className={`flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all
                      ${active ? 'bg-blue text-white border-blue' : 'bg-white text-navy border-navy/20 hover:border-blue/50'}`}
                  >
                    <p className="font-sans font-medium text-sm">{o.label}</p>
                    <p className={`font-sans text-xs ${active ? 'text-white/70' : 'text-navy/50'}`}>{o.description}</p>
                  </button>
                )
              })}
            </div>

            {incomeStructure === 'salaried' ? (
              <RecurringRuleForm defaultValues={{ type: 'income' }} onSuccess={() => setStep(6)} />
            ) : (
              <Button variant="cta" size="lg" onClick={() => setStep(6)} className="w-full" disabled={!incomeStructure}>
                Continue
              </Button>
            )}
            <button
              onClick={() => setStep(6)}
              className="w-full mt-4 text-sm text-navy/40 hover:text-navy/70 font-sans transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 6 && (
          <div>
            <h1 className="font-serif text-3xl text-navy mb-2">
              {suggestedGoalTemplate ? 'A goal to start with' : 'Set a goal (optional)'}
            </h1>
            <p className="text-navy-80 font-sans text-sm mb-8">
              {suggestedGoalTemplate
                ? `Based on what you told us, ${suggestedGoalTemplate.label.toLowerCase()} is a common place to start — edit anything below, or skip.`
                : "You can always add goals later — this is completely optional."}
            </p>
            <GoalForm defaultValues={goalDefaultValues} onSuccess={() => setStep(7)} />
            <button
              onClick={() => setStep(7)}
              className="w-full mt-4 text-sm text-navy/40 hover:text-navy/70 font-sans transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 7 && (
          <div>
            <h1 className="font-serif text-3xl text-navy mb-2">Add your first transaction</h1>
            <p className="text-navy-80 font-sans text-sm mb-8">
              Don't worry — you can always edit or delete this later.
            </p>
            <TransactionForm onSuccess={handleComplete} />
            <button
              onClick={handleComplete}
              className="w-full mt-4 text-sm text-navy/40 hover:text-navy/70 font-sans transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
