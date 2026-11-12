export default function StatCard({ title, value, subtitle, icon: Icon, color = 'emerald' }) {
  const colorMap = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    purple: 'text-purple-700 bg-purple-50 border-purple-200',
    cyan: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        {Icon && (
          <div className={`p-2 rounded-lg border ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
