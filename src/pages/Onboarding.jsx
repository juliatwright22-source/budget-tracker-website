import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_CATEGORIES } from '../lib/constants'
import Button from '../components/ui/Button'
import TransactionForm from '../components/features/TransactionForm'

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState(['Rent/Mortgage', 'Groceries', 'Gas', 'Utilities'])
  const [custom, setCustom] = useState('')

  function toggleCategory(name) {
    setSelected(s => s.includes(name) ? s.filter(n => n !== name) : [...s, name])
  }

  async function handleCategories() {
    const toInsert = DEFAULT_CATEGORIES
      .filter(c => selected.includes(c.name))
      .map((c, i) => ({ ...c, user_id: user.id, display_order: i }))

    if (custom.trim()) {
      toInsert.push({ name: custom.trim(), emoji: '📦', color: '#004E72', user_id: user.id, display_order: toInsert.length })
    }

    await supabase.from('categories').insert(toInsert)
    setStep(3)
  }

  async function handleComplete() {
    await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id)
    await refreshProfile()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="flex gap-2 mb-10 justify-center">
          {[1, 2, 3].map(n => (
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
            <p className="text-navy-80 font-sans leading-relaxed mb-10">
              Your calm, simple guide to managing money for the first time.
              Let's get you set up in two quick steps.
            </p>
            <Button variant="cta" size="lg" onClick={() => setStep(2)} className="w-full">
              Let's go
            </Button>
          </div>
        )}

        {step === 2 && (
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

        {step === 3 && (
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
