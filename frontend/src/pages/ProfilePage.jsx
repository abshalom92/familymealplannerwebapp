import { useState, useEffect } from 'react'
import api from '../api/client'

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      setProfile(data)
      setForm({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        calorie_goal: data.calorie_goal ?? '',
        protein_goal_g: data.protein_goal_g ?? '',
        carbs_goal_g: data.carbs_goal_g ?? '',
        fats_goal_g: data.fats_goal_g ?? '',
        dietary_notes: data.dietary_notes ?? '',
      })
    })
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        calorie_goal: form.calorie_goal ? parseInt(form.calorie_goal) : null,
        protein_goal_g: form.protein_goal_g ? parseInt(form.protein_goal_g) : null,
        carbs_goal_g: form.carbs_goal_g ? parseInt(form.carbs_goal_g) : null,
        fats_goal_g: form.fats_goal_g ? parseInt(form.fats_goal_g) : null,
        dietary_notes: form.dietary_notes || null,
      }
      const { data } = await api.put('/profile', payload)
      setProfile(data)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{displayName}</h1>
            <p className="text-sm text-gray-400">@{profile.username}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} placeholder="Jane" />
            <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Doe" />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="text"
              value={profile.email ?? '—'}
              disabled
              className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Dietary Goals */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-1">Daily Dietary Goals</h2>
          <p className="text-xs text-gray-400 mb-4">Used to show progress on your Dashboard</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Calories (kcal)" name="calorie_goal" value={form.calorie_goal} onChange={handleChange} type="number" placeholder="2000" />
            <Field label="Protein (g)" name="protein_goal_g" value={form.protein_goal_g} onChange={handleChange} type="number" placeholder="150" />
            <Field label="Carbs (g)" name="carbs_goal_g" value={form.carbs_goal_g} onChange={handleChange} type="number" placeholder="250" />
            <Field label="Fats (g)" name="fats_goal_g" value={form.fats_goal_g} onChange={handleChange} type="number" placeholder="65" />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Dietary Notes</h2>
          <textarea
            name="dietary_notes"
            value={form.dietary_notes ?? ''}
            onChange={handleChange}
            placeholder="e.g. vegetarian, avoiding processed sugar, trying to eat more fiber…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      </form>
    </div>
  )
}
