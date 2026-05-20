import { useEffect, useState } from 'react'
import api from '../api/client'

const PREFERENCE_SUGGESTIONS = ['vegetarian', 'vegan', 'gluten-free', 'low-carb', 'dairy-free', 'halal', 'kosher']
const ALLERGY_SUGGESTIONS = ['nuts', 'peanuts', 'dairy', 'eggs', 'shellfish', 'fish', 'soy', 'wheat', 'gluten']

function TagInput({ label, tags, onChange, suggestions = [] }) {
  const [input, setInput] = useState('')

  const addTag = (val) => {
    const tag = val.trim().toLowerCase()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
  }

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag))

  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  const unused = suggestions.filter((s) => !tags.includes(s))

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="border border-gray-200 rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[42px] focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-900 font-bold">✕</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={tags.length ? '' : 'Type and press Enter…'}
          className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PreferenceTagInput({ label, tags, onChange, suggestions }) {
  const [input, setInput] = useState('')

  const addTag = (val) => {
    const tag = val.trim().toLowerCase()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
  }

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag))

  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  const unused = suggestions.filter((s) => !tags.includes(s))

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="border border-gray-200 rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[42px] focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-green-900 font-bold">✕</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={tags.length ? '' : 'Type and press Enter…'}
          className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const emptyForm = { name: '', allergies: [], foods_to_avoid: [], food_preferences: [] }

function MemberForm({ initial = emptyForm, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name')(e.target.value)}
          placeholder="e.g. Mom, Dad, Emma…"
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <TagInput
        label="Allergies"
        tags={form.allergies}
        onChange={set('allergies')}
        suggestions={ALLERGY_SUGGESTIONS}
      />
      <TagInput
        label="Foods to Avoid"
        tags={form.foods_to_avoid}
        onChange={set('foods_to_avoid')}
        suggestions={[]}
      />
      <PreferenceTagInput
        label="Food Preferences"
        tags={form.food_preferences}
        onChange={set('food_preferences')}
        suggestions={PREFERENCE_SUGGESTIONS}
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function MemberCard({ member, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👤</span>
          <h3 className="font-semibold text-gray-800 text-lg">{member.name}</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-xs text-gray-500 hover:text-green-600 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors"
          >
            Edit
          </button>
          {confirmDelete ? (
            <span className="flex gap-1">
              <button
                onClick={onDelete}
                className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {member.allergies?.length > 0 && (
        <div className="mb-2">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Allergies</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {member.allergies.map((a) => (
              <span key={a} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{a}</span>
            ))}
          </div>
        </div>
      )}

      {member.foods_to_avoid?.length > 0 && (
        <div className="mb-2">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avoid</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {member.foods_to_avoid.map((f) => (
              <span key={f} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      )}

      {member.food_preferences?.length > 0 && (
        <div>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Preferences</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {member.food_preferences.map((p) => (
              <span key={p} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      )}

      {!member.allergies?.length && !member.foods_to_avoid?.length && !member.food_preferences?.length && (
        <p className="text-sm text-gray-400 italic">No restrictions or preferences set.</p>
      )}
    </div>
  )
}

export default function FamilyPage() {
  const [members, setMembers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const load = () => api.get('/family/').then((r) => setMembers(r.data))

  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    await api.post('/family/', form)
    setShowAdd(false)
    load()
  }

  const handleUpdate = async (form) => {
    await api.put(`/family/${editingId}`, form)
    setEditingId(null)
    load()
  }

  const handleDelete = async (id) => {
    await api.delete(`/family/${id}`)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Family Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">Set allergies & preferences to filter meals when planning.</p>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + Add Member
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white border border-green-200 rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">New Family Member</h2>
          <MemberForm onSave={handleCreate} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {members.length === 0 && !showAdd ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
          <p className="font-medium">No family members yet</p>
          <p className="text-sm mt-1">Add members to personalize meal filtering.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member) =>
            editingId === member.id ? (
              <div key={member.id} className="bg-white border border-green-200 rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">Edit {member.name}</h2>
                <MemberForm
                  initial={member}
                  onSave={handleUpdate}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={() => setEditingId(member.id)}
                onDelete={() => handleDelete(member.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
