import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const PALETTE_COLORS = ['#004E72', '#FF6E42', '#092634']

export default function Categories() {
  const { user } = useAuth()
  const { categories, reload } = useBudget()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')
  const [color, setColor] = useState('#004E72')
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(null); setName(''); setEmoji('📦'); setColor('#004E72'); setOpen(true) }
  function openEdit(cat) { setEditing(cat); setName(cat.name); setEmoji(cat.emoji); setColor(cat.color); setOpen(true) }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const payload = { name: name.trim(), emoji, color }
    if (editing) {
      await supabase.from('categories').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('categories').insert({ ...payload, user_id: user.id })
    }
    setSaving(false)
    setOpen(false)
    reload()
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category? Transactions in it will become uncategorized.')) return
    await supabase.from('categories').delete().eq('id', id)
    reload()
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-navy">Categories</h1>
        <Button variant="cta" size="sm" onClick={openNew}>+ New category</Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-navy/50 font-sans mb-4">No categories yet — create one to get started.</p>
          <Button variant="primary" onClick={openNew}>Create your first category</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.emoji}</span>
                <div>
                  <p className="font-sans font-medium text-navy text-sm">{cat.name}</p>
                  <div className="w-3 h-3 rounded-full mt-1" style={{ background: cat.color }} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(cat)} className="text-navy/30 hover:text-blue text-sm transition-colors">✏</button>
                <button onClick={() => deleteCategory(cat.id)} className="text-navy/30 hover:text-orange text-sm transition-colors">✕</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'New category'}>
        <div className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coffee" />
          <div>
            <label className="text-sm font-medium text-navy block mb-2">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              maxLength={2}
              className="w-16 text-2xl text-center px-2 py-1.5 rounded-lg border border-navy/20 focus:outline-none focus:ring-2 focus:ring-blue/40"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-navy block mb-2">Color</label>
            <div className="flex gap-3">
              {PALETTE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-navy/50' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Button variant="primary" onClick={save} disabled={saving} className="w-full">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
