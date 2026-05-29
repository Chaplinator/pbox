export function StatCard({ label, value, icon, color = 'brand' }) {
  const colors = {
    brand: 'text-brand-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    yellow: 'text-yellow-700',
  }

  const colorClass = colors[color] || colors.brand

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
        </div>
        {icon && <div className="text-3xl opacity-20">{icon}</div>}
      </div>
    </div>
  )
}
