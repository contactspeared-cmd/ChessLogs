import React, { useMemo, useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  Target,
  Users,
  Trophy,
  Calendar,
  Filter,
  ChevronDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = () => new Date();

function startOf(period) {
  const d = now();
  switch (period) {
    case 'daily':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    case 'weekly':
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case 'yearly':
      return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    case 'overall':
    default:
      return new Date(0);
  }
}

function inPeriod(dateStr, period) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= startOf(period);
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

// ---------------------------------------------------------------------------
// Time bucket helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getBuckets(period) {
  switch (period) {
    case 'daily':
      return Array.from({ length: 24 }, (_, i) => `${i}:00`);
    case 'weekly':
      return DAY_NAMES;
    case 'monthly':
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    case 'yearly':
      return MONTH_NAMES;
    case 'overall':
    default: {
      const result = [];
      const d = now();
      for (let i = 11; i >= 0; i--) {
        const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
        result.push(MONTH_NAMES[m.getMonth()]);
      }
      return result;
    }
  }
}

function getBucketIndex(dateStr, period) {
  const d = new Date(dateStr);
  switch (period) {
    case 'daily':
      return d.getHours();
    case 'weekly': {
      const day = d.getDay(); // 0=Sun
      return day === 0 ? 6 : day - 1; // Mon=0 … Sun=6
    }
    case 'monthly': {
      const dayOfMonth = d.getDate();
      return Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
    }
    case 'yearly':
      return d.getMonth();
    case 'overall': {
      const n = now();
      const monthsAgo =
        (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
      const idx = 11 - monthsAgo;
      return idx >= 0 && idx <= 11 ? idx : -1;
    }
    default:
      return -1;
  }
}

// ---------------------------------------------------------------------------
// SVG Bar Chart
// ---------------------------------------------------------------------------

function BarChart({ buckets, data, color = '#10b981', height = 160 }) {
  const max = Math.max(...data, 1);
  const padL = 32;
  const padR = 8;
  const padT = 8;
  const padB = 32;
  const chartW = 500;
  const chartH = height;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const barW = Math.max(2, innerW / buckets.length - 2);

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      width="100%"
      height="auto"
      aria-label="Games activity bar chart"
    >
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + innerH * (1 - frac);
        return (
          <g key={frac}>
            <line
              x1={padL}
              y1={y}
              x2={chartW - padR}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text
              x={padL - 4}
              y={y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#64748b"
            >
              {Math.round(max * frac)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {buckets.map((label, i) => {
        const val = data[i] || 0;
        const barH = (val / max) * innerH;
        const x = padL + (i * innerW) / buckets.length + ((innerW / buckets.length - barW) / 2);
        const y = padT + innerH - barH;
        return (
          <g key={label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH || 1}
              rx="2"
              fill={color}
              opacity="0.85"
            >
              <title>{`${label}: ${val} game${val !== 1 ? 's' : ''}`}</title>
            </rect>
            {buckets.length <= 24 ? null : (
              <text
                x={x + barW / 2}
                y={padT + innerH + 14}
                textAnchor="middle"
                fontSize="8"
                fill="#64748b"
              >
                {label}
              </text>
            )}
            {buckets.length <= 24 && i % 4 === 0 && (
              <text
                x={x + barW / 2}
                y={padT + innerH + 14}
                textAnchor="middle"
                fontSize="8"
                fill="#64748b"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}

      {/* X-axis labels for non-daily */}
      {buckets.length <= 12 &&
        buckets.map((label, i) => {
          const x =
            padL + (i * innerW) / buckets.length + innerW / buckets.length / 2;
          return (
            <text
              key={label + 'lbl'}
              x={x}
              y={padT + innerH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {label}
            </text>
          );
        })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SVG Donut Chart
// ---------------------------------------------------------------------------

function DonutChart({ wins, draws, losses }) {
  const total = wins + draws + losses;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 56;
  const stroke = 22;

  function slice(value, offset, color, label) {
    if (!total || !value) return null;
    const frac = value / total;
    const circ = 2 * Math.PI * r;
    const dash = frac * circ;
    const gap = circ - dash;
    const rotation = offset * 360 - 90;
    return (
      <circle
        key={label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="butt"
        transform={`rotate(${rotation} ${cx} ${cy})`}
      >
        <title>{`${label}: ${value} (${pct(value, total)}%)`}</title>
      </circle>
    );
  }

  const winFrac = total ? wins / total : 0;
  const drawFrac = total ? draws / total : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-label="Win/Draw/Loss donut chart"
      >
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        ) : (
          <>
            {slice(wins, 0, '#10b981', 'Wins')}
            {slice(draws, winFrac, '#f59e0b', 'Draws')}
            {slice(losses, winFrac + drawFrac, '#f43f5e', 'Losses')}
          </>
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#f1f5f9">
          {total === 0 ? '—' : `${pct(wins, total)}%`}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">
          Win Rate
        </text>
      </svg>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-300">W {wins}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-300">D {draws}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-slate-300">L {losses}</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Line Chart
// ---------------------------------------------------------------------------

function LineChart({ buckets, data, height = 140 }) {
  const validData = data.map((v) => (isNaN(v) ? null : v));
  const hasData = validData.some((v) => v !== null);
  const padL = 36;
  const padR = 8;
  const padT = 8;
  const padB = 32;
  const chartW = 500;
  const chartH = height;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const toX = (i) => padL + (i / (buckets.length - 1 || 1)) * innerW;
  const toY = (v) => padT + innerH - (v / 100) * innerH;

  const points = validData
    .map((v, i) => (v !== null ? `${toX(i)},${toY(v)}` : null))
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      width="100%"
      height="auto"
      aria-label="Accuracy trend line chart"
    >
      {/* Gridlines */}
      {[0, 25, 50, 75, 100].map((pctVal) => {
        const y = toY(pctVal);
        return (
          <g key={pctVal}>
            <line
              x1={padL}
              y1={y}
              x2={chartW - padR}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b">
              {pctVal}%
            </text>
          </g>
        );
      })}

      {/* Line */}
      {hasData && (
        <polyline
          points={points}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Dots */}
      {hasData &&
        validData.map((v, i) =>
          v !== null ? (
            <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill="#06b6d4">
              <title>{`${buckets[i]}: ${v.toFixed(1)}%`}</title>
            </circle>
          ) : null
        )}

      {/* X labels */}
      {buckets.map((label, i) => (
        <text
          key={label}
          x={toX(i)}
          y={padT + innerH + 14}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          {buckets.length <= 12 ? label : i % 4 === 0 ? label : ''}
        </text>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ icon: Icon, label, value, accent }) {
  const accentClasses =
    accent === 'purple'
      ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
      : 'bg-amber-500/10 border-amber-500/20 text-amber-400';

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${accentClasses}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-70">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ELO Distribution (admin only)
// ---------------------------------------------------------------------------

const ELO_BANDS = [
  { label: '<1000', min: 0, max: 999 },
  { label: '1000–1200', min: 1000, max: 1199 },
  { label: '1200–1500', min: 1200, max: 1499 },
  { label: '1500–1800', min: 1500, max: 1799 },
  { label: '1800–2000', min: 1800, max: 1999 },
  { label: '2000+', min: 2000, max: Infinity },
];

function EloDistribution({ students }) {
  const counts = ELO_BANDS.map(({ min, max }) =>
    students.filter((s) => s.current_elo >= min && s.current_elo <= max).length
  );
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="space-y-2">
      {ELO_BANDS.map(({ label }, i) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-right text-slate-400 shrink-0">{label}</span>
          <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(counts[i] / maxCount) * 100}%` }}
            />
          </div>
          <span className="w-6 text-slate-300 shrink-0">{counts[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top Openings Table
// ---------------------------------------------------------------------------

function OpeningsTable({ games, accent }) {
  const openingMap = useMemo(() => {
    const map = {};
    games.forEach((g) => {
      const name = g.opening || g.eco || 'Unknown';
      if (!map[name]) map[name] = { games: 0, wins: 0 };
      map[name].games++;
      if (g.result === 'win') map[name].wins++;
    });
    return map;
  }, [games]);

  const rows = useMemo(
    () =>
      Object.entries(openingMap)
        .map(([name, { games: g, wins }]) => ({ name, games: g, winPct: pct(wins, g) }))
        .sort((a, b) => b.games - a.games)
        .slice(0, 8),
    [openingMap]
  );

  if (!rows.length) return <p className="text-slate-500 text-sm">No openings data.</p>;

  const headerClass = accent === 'purple' ? 'text-purple-400' : 'text-amber-400';

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className={`${headerClass} uppercase tracking-wider`}>
          <th className="text-left pb-2 font-medium">#</th>
          <th className="text-left pb-2 font-medium">Opening</th>
          <th className="text-right pb-2 font-medium">Games</th>
          <th className="text-right pb-2 font-medium">Win%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.name} className="border-t border-slate-800">
            <td className="py-1.5 text-slate-500">{i + 1}</td>
            <td className="py-1.5 text-slate-200 truncate max-w-[180px]">{row.name}</td>
            <td className="py-1.5 text-right text-slate-300">{row.games}</td>
            <td className="py-1.5 text-right">
              <span
                className={
                  row.winPct >= 60
                    ? 'text-emerald-400'
                    : row.winPct >= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {row.winPct}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ message = 'No data for this period.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
      <BarChart2 size={36} className="opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-4 text-slate-300 text-sm font-semibold">
          {Icon && <Icon size={15} className="text-slate-400" />}
          <span>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'overall', label: 'Overall' },
];

export default function StatisticsPanel({
  role = 'coach',
  students = [],
  courses = [],
  accounts = [],
  credentials = [],
  enrollments = [],
}) {
  const [period, setPeriod] = useState('weekly');

  const isAdmin = role === 'admin';
  const accent = isAdmin ? 'purple' : 'amber';
  const activePillClass = isAdmin
    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
    : 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-900/40';
  const inactivePillClass = 'text-slate-400 hover:text-slate-200 hover:bg-slate-800';

  // ---- Collect all games across students filtered by period ----
  const allGames = useMemo(() => {
    return students.flatMap((s) =>
      (s.games || []).map((g) => ({ ...g, _student: s }))
    );
  }, [students]);

  const filteredGames = useMemo(() => {
    return allGames.filter((g) => inPeriod(g.played_at, period));
  }, [allGames, period]);

  // ---- Win/Draw/Loss ----
  const wdl = useMemo(() => {
    return filteredGames.reduce(
      (acc, g) => {
        if (g.result === 'win') acc.wins++;
        else if (g.result === 'draw') acc.draws++;
        else acc.losses++;
        return acc;
      },
      { wins: 0, draws: 0, losses: 0 }
    );
  }, [filteredGames]);

  // ---- Accuracy values ----
  const accuracyValues = useMemo(() => {
    return filteredGames
      .filter((g) => g.review)
      .flatMap((g) => {
        const vals = [];
        if (g.review.accuracy_white != null) vals.push(g.review.accuracy_white);
        if (g.review.accuracy_black != null) vals.push(g.review.accuracy_black);
        return vals;
      });
  }, [filteredGames]);

  const avgAccuracy = useMemo(() => avg(accuracyValues), [accuracyValues]);

  // ---- Time buckets ----
  const buckets = useMemo(() => getBuckets(period), [period]);

  const bucketGameCounts = useMemo(() => {
    const counts = new Array(buckets.length).fill(0);
    filteredGames.forEach((g) => {
      const idx = getBucketIndex(g.played_at, period);
      if (idx >= 0 && idx < counts.length) counts[idx]++;
    });
    return counts;
  }, [filteredGames, buckets, period]);

  const bucketAccuracy = useMemo(() => {
    const sums = new Array(buckets.length).fill(0);
    const cnts = new Array(buckets.length).fill(0);
    filteredGames.forEach((g) => {
      if (!g.review) return;
      const idx = getBucketIndex(g.played_at, period);
      if (idx < 0 || idx >= buckets.length) return;
      if (g.review.accuracy_white != null) {
        sums[idx] += g.review.accuracy_white;
        cnts[idx]++;
      }
      if (g.review.accuracy_black != null) {
        sums[idx] += g.review.accuracy_black;
        cnts[idx]++;
      }
    });
    return sums.map((s, i) => (cnts[i] ? s / cnts[i] : null));
  }, [filteredGames, buckets, period]);

  // ---- Active students (played at least 1 game in period) ----
  const activeStudents = useMemo(() => {
    const ids = new Set(filteredGames.map((g) => g.student_id || g._student?.id));
    return ids.size;
  }, [filteredGames]);

  // ---- Courses completed ----
  const coursesCompletionRate = useMemo(() => {
    const totalChapters = courses.reduce((s, c) => s + ((c.chapters || []).length || 1), 0);
    if (!totalChapters) return 0;
    let completed = 0;
    students.forEach((s) => {
      (s.assignments || []).forEach((a) => {
        const course = courses.find((c) => c.id === a.course_id);
        if (!course) return;
        const chapCount = (course.chapters || []).length || 1;
        const doneCount = (a.progress?.completed_chapter_ids || []).length;
        completed += doneCount;
      });
    });
    return pct(completed, totalChapters);
  }, [students, courses]);

  // ---- Admin: total accounts filtered by created_at ----
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => inPeriod(a.created_at || a.joined_at, period));
  }, [accounts, period]);

  // ---- Admin: ELO distribution (all students, not period-filtered) ----
  const eloStudents = useMemo(() => students.filter((s) => s.current_elo != null), [students]);

  // ---- KPI data ----
  const kpiItems = useMemo(() => {
    if (isAdmin) {
      return [
        {
          icon: Users,
          label: 'Total Accounts',
          value: filteredAccounts.length || accounts.length,
        },
        { icon: Trophy, label: 'Games Played', value: filteredGames.length },
        {
          icon: Target,
          label: 'Platform Accuracy',
          value: accuracyValues.length ? `${avgAccuracy.toFixed(1)}%` : '—',
        },
        { icon: BarChart2, label: 'Courses Completion', value: `${coursesCompletionRate}%` },
        { icon: TrendingUp, label: 'Active Students', value: activeStudents },
      ];
    }
    return [
      { icon: Trophy, label: 'Student Games', value: filteredGames.length },
      { icon: Target, label: 'Cohort Win Rate', value: `${pct(wdl.wins, filteredGames.length)}%` },
      {
        icon: BarChart2,
        label: 'Avg Accuracy',
        value: accuracyValues.length ? `${avgAccuracy.toFixed(1)}%` : '—',
      },
      { icon: TrendingUp, label: 'Course Completion', value: `${coursesCompletionRate}%` },
      { icon: Users, label: 'Active in Training', value: activeStudents },
    ];
  }, [
    isAdmin,
    filteredAccounts,
    accounts,
    filteredGames,
    accuracyValues,
    avgAccuracy,
    coursesCompletionRate,
    activeStudents,
    wdl,
  ]);

  const hasGames = filteredGames.length > 0;

  return (
    <div className="bg-slate-950 min-h-screen p-4 md:p-6 space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-white font-semibold text-lg">
          <Filter size={18} className={isAdmin ? 'text-purple-400' : 'text-amber-400'} />
          <span>Statistics</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              isAdmin
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            {isAdmin ? 'Admin' : 'Coach'}
          </span>
        </div>

        <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-full">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                period === key ? activePillClass : inactivePillClass
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiItems.map(({ icon, label, value }) => (
          <KpiCard key={label} icon={icon} label={label} value={value} accent={accent} />
        ))}
      </div>

      {/* Charts Row */}
      {!hasGames ? (
        <Section>
          <EmptyState message="No games found for this time period." />
        </Section>
      ) : (
        <>
          {/* Bar Chart */}
          <Section title="Games Activity" icon={BarChart2}>
            <BarChart
              buckets={buckets}
              data={bucketGameCounts}
              color="#10b981"
            />
          </Section>

          {/* Donut + Line Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Win / Draw / Loss" icon={Trophy}>
              <div className="flex justify-center py-2">
                <DonutChart
                  wins={wdl.wins}
                  draws={wdl.draws}
                  losses={wdl.losses}
                />
              </div>
            </Section>

            <Section title="Accuracy Trend" icon={TrendingUp}>
              {bucketAccuracy.every((v) => v === null) ? (
                <EmptyState message="No reviewed games in this period." />
              ) : (
                <LineChart buckets={buckets} data={bucketAccuracy} />
              )}
            </Section>
          </div>

          {/* Openings + ELO */}
          <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2' : ''} gap-6`}>
            <Section title="Top Openings" icon={Calendar}>
              <OpeningsTable games={filteredGames} accent={accent} />
            </Section>

            {isAdmin && (
              <Section title="ELO Distribution" icon={Target}>
                {eloStudents.length === 0 ? (
                  <EmptyState message="No student ELO data available." />
                ) : (
                  <EloDistribution students={eloStudents} />
                )}
              </Section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
