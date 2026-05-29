// Shows planning flag status for multi-HoH groups. Hidden for single-HoH / non-HoH.
export default function PlanningFlagBanner({
  flagHeldByMe,
  flagHolder,       // { username, last_seen } | null
  plannerClaimedAt,
  isOnline,
  onClaim,
  onRelease,
  claiming,
  showConfirm,
  onConfirmClaim,
  onCancelConfirm,
}) {
  if (!flagHolder && !flagHeldByMe) {
    return (
      <div className="mb-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
        <span className="text-sm text-gray-600">No one holds the planning flag. Claim it to edit the meal plan.</span>
        <button
          onClick={onClaim}
          disabled={!isOnline || claiming}
          className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-semibold rounded-full transition-colors"
        >
          {claiming ? 'Claiming…' : 'Claim Flag'}
        </button>
      </div>
    )
  }

  if (flagHeldByMe) {
    return (
      <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-green-800">
          <span className="font-semibold">🏳️ You hold the planning flag.</span>
          {plannerClaimedAt && (
            <span className="text-green-600 text-xs">
              Claimed {new Date(plannerClaimedAt).toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={onRelease}
          disabled={!isOnline}
          className="ml-4 px-3 py-1 border border-green-300 text-green-700 hover:bg-green-100 disabled:opacity-40 text-xs font-semibold rounded-full transition-colors"
        >
          Release
        </button>
      </div>
    )
  }

  // Someone else holds it
  const holderOfflineHours = flagHolder?.last_seen
    ? Math.floor((Date.now() - new Date(flagHolder.last_seen).getTime()) / 3600000)
    : null
  const isOffline24h = holderOfflineHours === null || holderOfflineHours >= 24

  if (showConfirm) {
    return (
      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl">
        <p className="text-sm font-semibold text-amber-800 mb-1">
          ⚠️ {flagHolder?.username} has been offline for {holderOfflineHours ?? '24+'} hour{holderOfflineHours !== 1 ? 's' : ''}.
        </p>
        <p className="text-sm text-amber-700 mb-3">
          They may have meals planned offline. Please connect with them to confirm before claiming the flag.
          Do you want to continue?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirmClaim}
            disabled={claiming}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {claiming ? 'Claiming…' : 'Yes, claim it'}
          </button>
          <button
            onClick={onCancelConfirm}
            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
      <span className="text-sm text-blue-800">
        <span className="font-semibold">@{flagHolder?.username}</span> is the active planner.
        {isOffline24h && (
          <span className="ml-1 text-amber-700 font-medium">
            (offline for {holderOfflineHours ?? '24+'} hour{holderOfflineHours !== 1 ? 's' : ''})
          </span>
        )}
      </span>
      {isOffline24h && (
        <button
          onClick={onClaim}
          disabled={!isOnline || claiming}
          className="ml-4 px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-semibold rounded-full transition-colors"
        >
          {claiming ? 'Claiming…' : 'Claim Flag'}
        </button>
      )}
    </div>
  )
}
