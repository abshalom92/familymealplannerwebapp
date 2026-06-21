import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const PREFERENCE_SUGGESTIONS = ['vegetarian', 'vegan', 'gluten-free', 'low-carb', 'dairy-free', 'halal', 'kosher']
const ALLERGY_SUGGESTIONS = ['nuts', 'peanuts', 'dairy', 'eggs', 'shellfish', 'fish', 'soy', 'wheat', 'gluten']

function TagInput({ label, tags, onChange, suggestions = [], apiSearch = false }) {
  const [input, setInput] = useState('')
  const [dropdownResults, setDropdownResults] = useState([])
  const debounceRef = useRef(null)

  const addTag = (val) => {
    const tag = val.trim().toLowerCase()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
    setDropdownResults([])
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

  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    if (apiSearch && val.length >= 2) {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const res = await api.get(`/meals/ingredients/search?q=${encodeURIComponent(val)}`)
        setDropdownResults(res.data.filter((r) => !tags.includes(r.toLowerCase())))
      }, 300)
    } else {
      setDropdownResults([])
    }
  }

  const unused = suggestions.filter((s) => !tags.includes(s))

  return (
    <div className="relative">
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
          onChange={handleInputChange}
          onKeyDown={handleKey}
          onBlur={() => setTimeout(() => setDropdownResults([]), 150)}
          placeholder={tags.length ? '' : 'Type and press Enter…'}
          className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
        />
      </div>
      {dropdownResults.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
          {dropdownResults.map((r) => (
            <li key={r}>
              <button
                type="button"
                onMouseDown={() => addTag(r)}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      )}
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

const emptyForm = { name: '', allergies: [], foods_to_avoid: [], food_preferences: [], weight_lbs: '' }

function MemberForm({ initial = emptyForm, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      })
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
        apiSearch
      />
      <TagInput
        label="Foods to Avoid"
        tags={form.foods_to_avoid}
        onChange={set('foods_to_avoid')}
        suggestions={[]}
        apiSearch
      />
      <PreferenceTagInput
        label="Food Preferences"
        tags={form.food_preferences}
        onChange={set('food_preferences')}
        suggestions={PREFERENCE_SUGGESTIONS}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
        <input
          type="number"
          value={form.weight_lbs}
          onChange={(e) => setForm(f => ({ ...f, weight_lbs: e.target.value }))}
          placeholder="e.g. 145"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
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

function FamilyGroupPanel() {
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('none') // 'none' | 'create' | 'join'
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadGroup = useCallback(() => {
    setLoading(true)
    api.get('/group')
      .then(({ data }) => {
        setGroup(data)
        const me = data.members.find(m => m.username === user?.username)
        if (me?.is_head) {
          api.get('/group/pending').then(({ data: p }) => setPending(Array.isArray(p) ? p : [])).catch(() => setPending([]))
        }
      })
      .catch(() => { setGroup(null); setPending([]) })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => { loadGroup() }, [loadGroup])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/group/create', { name: groupName })
      setGroup(data)
      setView('none')
      setGroupName('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create group')
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/group/join', { join_code: joinCode.trim() })
      setGroup(data)
      setView('none')
      setJoinCode('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code or already in a group')
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave this family group?')) return
    try {
      await api.delete('/group/leave')
      setGroup(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not leave group')
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Generate a new join code? The old one will stop working.')) return
    const { data } = await api.post('/group/regenerate-code')
    setGroup(data)
  }

  const handleApprove = async (userId) => {
    await api.post(`/group/approve/${userId}`)
    loadGroup()
  }

  const handleDeny = async (userId) => {
    await api.delete(`/group/deny/${userId}`)
    loadGroup()
  }

  const handlePromote = async (userId) => {
    if (!confirm('Promote this member to Head of Household?')) return
    await api.post(`/group/promote/${userId}`)
    loadGroup()
  }

  const handleDemote = async () => {
    if (!confirm('Step down as Head of Household?')) return
    try {
      await api.post('/group/demote')
      loadGroup()
    } catch (err) {
      alert(err.response?.data?.detail || 'Cannot step down')
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(group.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">👨‍👩‍👧‍👦</span>
        <div>
          <h2 className="font-semibold text-gray-800">Family Group</h2>
          <p className="text-xs text-gray-500">Share a calendar with your household members.</p>
        </div>
      </div>

      {group && !group.members.find(m => m.username === user?.username) ? (
        /* Pending approval state */
        <div className="text-center py-6">
          <p className="text-2xl mb-2">⏳</p>
          <p className="font-medium text-gray-700">{group.name}</p>
          <p className="text-sm text-gray-400 mt-1">Your request to join is waiting for approval from a Head of Household.</p>
          <button
            onClick={handleLeave}
            className="mt-4 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel request
          </button>
        </div>
      ) : group ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-lg font-bold text-gray-800">{group.name}</p>
              <p className="text-xs text-gray-400">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Join Code</p>
                <p className="text-xl font-mono font-bold text-green-700 tracking-widest">{group.join_code}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={copyCode}
                  className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                {group.owner_id === group.members.find(m => m.username === user?.username)?.user_id && (
                  <button
                    onClick={handleRegenerate}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    New code
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pending requests (HoH only) */}
          {pending.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-yellow-700 mb-2">
                {pending.length} pending join request{pending.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {pending.map((p) => {
                  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
                  return (
                    <div key={p.user_id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{name} <span className="text-gray-400">@{p.username}</span></span>
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(p.user_id)}
                          className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                          Approve
                        </button>
                        <button onClick={() => handleDeny(p.user_id)}
                          className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors">
                          Deny
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Approved members */}
          <div className="flex flex-wrap gap-2 mb-4">
            {group.members.map((m) => {
              const displayName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username
              const isMe = m.username === user?.username
              const iAmHoH = group.members.find(x => x.username === user?.username)?.is_head
              return (
                <div key={m.user_id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 leading-tight">
                      {displayName}
                      {m.is_head && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">HoH</span>}
                    </p>
                    <p className="text-[10px] text-gray-400">@{m.username}</p>
                    {m.food_preferences?.length > 0 && (
                      <p className="text-[10px] text-green-600 mt-0.5">
                        Prefers: {m.food_preferences.join(', ')}
                      </p>
                    )}
                  </div>
                  {iAmHoH && !isMe && !m.is_head && (
                    <button onClick={() => handlePromote(m.user_id)}
                      className="ml-1 text-[10px] text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors">
                      Make HoH
                    </button>
                  )}
                  {isMe && m.is_head && (
                    <button onClick={handleDemote}
                      className="ml-1 text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors">
                      Step down
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={handleLeave}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Leave group
          </button>
        </>
      ) : (
        <>
          {view === 'none' && (
            <div className="flex gap-3">
              <button
                onClick={() => { setView('create'); setError('') }}
                className="flex-1 border-2 border-dashed border-green-300 text-green-700 hover:bg-green-50 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                + Create a group
              </button>
              <button
                onClick={() => { setView('join'); setError('') }}
                className="flex-1 border-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                Join with code
              </button>
            </div>
          )}

          {view === 'create' && (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Group name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. The Johnson Family"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors">
                  Create
                </button>
                <button type="button" onClick={() => setView('none')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {view === 'join' && (
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Join code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A3F2B1C9"
                  maxLength={8}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                  Join
                </button>
                <button type="button" onClick={() => setView('none')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}

const MAX_PEOPLE = 40

function HouseholdSizePanel() {
  const [settings, setSettings] = useState({ num_adults: 2, num_children: 0, num_toddlers: 0 })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/household/settings').then((r) => setSettings(r.data))
  }, [])

  const total = settings.num_adults + settings.num_children + settings.num_toddlers
  const overLimit = total > MAX_PEOPLE

  const set = (key) => (e) => {
    const val = Math.max(0, parseInt(e.target.value) || 0)
    setSettings((s) => ({ ...s, [key]: val }))
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    if (overLimit) {
      setError(`Total cannot exceed ${MAX_PEOPLE} people.`)
      return
    }
    try {
      await api.put('/household/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏠</span>
        <div>
          <h2 className="font-semibold text-gray-800">Household Size</h2>
          <p className="text-xs text-gray-500">Used to scale grocery quantities automatically.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { key: 'num_adults', label: 'Adults', sub: '(full portion)' },
          { key: 'num_children', label: 'Children', sub: '(¾ portion)' },
          { key: 'num_toddlers', label: 'Toddlers', sub: '(½ portion)' },
        ].map(({ key, label, sub }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}
              <span className="text-xs text-gray-400 font-normal ml-1">{sub}</span>
            </label>
            <input
              type="number"
              min="0"
              max={MAX_PEOPLE}
              value={settings[key]}
              onChange={set(key)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className={`text-sm font-medium ${overLimit ? 'text-red-600' : 'text-gray-600'}`}>
            Total: {total} / {MAX_PEOPLE} people
          </span>
          {overLimit && <p className="text-xs text-red-500 mt-0.5">Maximum is {MAX_PEOPLE} mouths.</p>}
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={overLimit}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function FamilyPage() {
  const [members, setMembers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const load = () => api.get('/family/').then((r) => setMembers(Array.isArray(r.data) ? r.data : [])).catch(() => {})

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
      <FamilyGroupPanel />
      <HouseholdSizePanel />

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
