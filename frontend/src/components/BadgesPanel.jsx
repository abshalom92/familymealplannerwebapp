import { useNavigate } from 'react-router-dom'

function BadgeChip({ badge }) {
  return (
    <div title={badge.description} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 text-xs font-medium text-amber-800">
      <span>{badge.icon}</span>
      <span>{badge.name}</span>
    </div>
  )
}

export default function BadgesPanel({ data }) {
  const navigate = useNavigate()
  if (!data) return null

  const { familyBadges = [], personalBadges = [], nextBadge, inGroup } = data

  const allEarned = [...familyBadges, ...personalBadges]
    .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
  const latest = allEarned[0] ?? null
  const totalCount = allEarned.length

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏅</span>
          <h2 className="font-semibold text-gray-800">Achievements</h2>
          {totalCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>
      </div>

      {latest ? (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <span className="text-3xl">{latest.icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Latest badge</p>
            <p className="font-bold text-gray-800 leading-tight">{latest.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{latest.description}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic mb-4">No badges yet — start planning to earn your first!</p>
      )}

      {nextBadge && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Next up</p>
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <span className="text-2xl opacity-40">{nextBadge.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-700 text-sm leading-tight">{nextBadge.name}</p>
              <p className="text-xs text-gray-400 mb-2 leading-tight">{nextBadge.description}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.max(nextBadge.pct, 2)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{nextBadge.current} / {nextBadge.target}</p>
            </div>
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <div className="flex gap-1 flex-wrap mt-4">
          {allEarned.slice(1, 5).map(b => <BadgeChip key={b.id} badge={b} />)}
          {totalCount > 5 && (
            <span className="text-xs text-gray-400 self-center ml-1">+{totalCount - 5} more</span>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/family')}
        className="mt-3 text-xs text-green-600 hover:text-green-700 font-medium"
      >
        View all badges on Family page →
      </button>
    </div>
  )
}
