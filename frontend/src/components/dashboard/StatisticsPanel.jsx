import React, { useMemo, useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  Target,
  Users,
  Trophy,
  Calendar,
  Filter,
  GraduationCap,
  Award,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  User,
} from 'lucide-react';

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
  if (!arr || !arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

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
      const day = d.getDay();
      return day === 0 ? 6 : day - 1;
    }
    case 'monthly': {
      const dayOfMonth = d.getDate();
      return Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
    }
    case 'yearly':
      return d.getMonth();
    case 'overall': {
      const n = now();
      const monthsAgo = (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
      const idx = 11 - monthsAgo;
      return idx >= 0 && idx <= 11 ? idx : -1;
    }
    default:
      return -1;
  }
}

function BarChart({ buckets, data, color = '#10b981', height = 150 }) {
  const maxVal = Math.max(...data, 1);
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const chartW = 520;
  const chartH = height;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const barW = Math.max(Math.floor((innerW / buckets.length) * 0.55), 6);

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height="auto" className="overflow-visible">
      {[0, Math.round(maxVal / 2), maxVal].map((tick, i) => {
        const y = padT + innerH - (tick / maxVal) * innerH;
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={y}
              x2={chartW - padR}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b" className="font-mono">
              {tick}
            </text>
          </g>
        );
      })}

      {data.map((val, i) => {
        const x = padL + (i / buckets.length) * innerW + (innerW / buckets.length - barW) / 2;
        const bH = (val / maxVal) * innerH;
        const y = padT + innerH - bH;
        return (
          <g key={i} className="group">
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(bH, 2)}
              fill={val > 0 ? color : '#1e293b'}
              rx="3"
              className="transition-all duration-300 hover:opacity-80"
            />
            <title>{`${buckets[i]}: ${val}`}</title>
            <text
              x={x + barW / 2}
              y={chartH - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
              className="font-mono select-none"
            >
              {buckets[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ wins = 0, draws = 0, losses = 0, size = 150 }) {
  const total = wins + draws + losses;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const winPct = total ? (wins / total) * 100 : 0;
  const drawPct = total ? (draws / total) * 100 : 0;
  const lossPct = total ? (losses / total) * 100 : 0;

  const winStroke = (winPct / 100) * circumference;
  const drawStroke = (drawPct / 100) * circumference;
  const lossStroke = (lossPct / 100) * circumference;

  const drawOffset = -winStroke;
  const lossOffset = -(winStroke + drawStroke);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="16" />
          {total > 0 && (
            <>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#10b981"
                strokeWidth="16"
                strokeDasharray={`${winStroke} ${circumference}`}
                strokeDashoffset="0"
              />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="16"
                strokeDasharray={`${drawStroke} ${circumference}`}
                strokeDashoffset={drawOffset}
              />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#ef4444"
                strokeWidth="16"
                strokeDasharray={`${lossStroke} ${circumference}`}
                strokeDashoffset={lossOffset}
              />
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-white">{total ? `${Math.round(winPct)}%` : '0%'}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400">Win Rate</span>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/20" />
          <span className="text-slate-300 font-semibold">Wins</span>
          <span className="text-white font-mono font-bold ml-auto">{wins}</span>
          <span className="text-slate-400 font-mono text-[11px]">({Math.round(winPct)}%)</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-md bg-amber-500 shadow-sm shadow-amber-500/20" />
          <span className="text-slate-300 font-semibold">Draws</span>
          <span className="text-white font-mono font-bold ml-auto">{draws}</span>
          <span className="text-slate-400 font-mono text-[11px]">({Math.round(drawPct)}%)</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-md bg-rose-500 shadow-sm shadow-rose-500/20" />
          <span className="text-slate-300 font-semibold">Losses</span>
          <span className="text-white font-mono font-bold ml-auto">{losses}</span>
          <span className="text-slate-400 font-mono text-[11px]">({Math.round(lossPct)}%)</span>
        </div>
        <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-400">
          Total recorded matches: <strong className="text-white">{total}</strong>
        </div>
      </div>
    </div>
  );
}

function LineChart({
  buckets,
  data,
  height = 160,
  minVal = null,
  maxVal = null,
  unit = '%',
  color = '#06b6d4',
  chartId = 'chart',
}) {
  const validData = data.map((v) => (v == null || isNaN(v) ? null : Number(v)));
  const numbers = validData.filter((v) => v !== null);
  const hasData = numbers.length > 0;

  const dataMin = hasData ? Math.min(...numbers) : 0;
  const dataMax = hasData ? Math.max(...numbers) : 100;

  const effectiveMin = minVal !== null ? minVal : Math.max(0, Math.floor(dataMin * 0.95));
  const effectiveMax = maxVal !== null ? maxVal : Math.ceil(dataMax * 1.05) || 100;
  const range = effectiveMax - effectiveMin || 1;

  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const chartW = 540;
  const chartH = height;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const toX = (i) => padL + (i / Math.max(buckets.length - 1, 1)) * innerW;
  const toY = (v) => padT + innerH - ((v - effectiveMin) / range) * innerH;

  const points = validData
    .map((v, i) => (v !== null ? `${toX(i)},${toY(v)}` : null))
    .filter(Boolean)
    .join(' ');

  let areaPoints = '';
  if (hasData) {
    const firstIdx = validData.findIndex((v) => v !== null);
    let lastIdx = validData.length - 1;
    while (lastIdx >= 0 && validData[lastIdx] === null) lastIdx--;

    if (firstIdx !== -1 && lastIdx >= firstIdx) {
      const startX = toX(firstIdx);
      const endX = toX(lastIdx);
      const baseline = padT + innerH;
      areaPoints = `${startX},${baseline} ${points} ${endX},${baseline}`;
    }
  }

  const gradId = `grad-${chartId}-${color.replace('#', '')}`;

  const ticks = [0, 0.33, 0.66, 1].map((f) => Math.round(effectiveMin + f * range));

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height="auto" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {ticks.map((tickVal, i) => {
        const y = toY(tickVal);
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={y}
              x2={chartW - padR}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#64748b" className="font-mono">
              {tickVal}
              {unit === '%' ? '%' : ''}
            </text>
          </g>
        );
      })}

      {hasData && areaPoints && <polygon points={areaPoints} fill={`url(#${gradId})`} />}

      {hasData && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {hasData &&
        validData.map((v, i) =>
          v !== null ? (
            <g key={i} className="group cursor-pointer">
              <circle cx={toX(i)} cy={toY(v)} r="3.5" fill={color} stroke="#0f172a" strokeWidth="1.5" />
              <title>{`${buckets[i]}: ${v.toFixed(1)}${unit}`}</title>
            </g>
          ) : null
        )}

      {buckets.map((b, i) => (
        <text
          key={i}
          x={toX(i)}
          y={chartH - 8}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
          className="font-mono select-none"
        >
          {b}
        </text>
      ))}
    </svg>
  );
}

function EloDistribution({ students = [] }) {
  const brackets = [
    { label: '<1200', min: 0, max: 1199 },
    { label: '1200–1499', min: 1200, max: 1499 },
    { label: '1500–1799', min: 1500, max: 1799 },
    { label: '1800–2099', min: 1800, max: 2099 },
    { label: '2100+', min: 2100, max: 9999 },
  ];

  const counts = brackets.map((b) => {
    return students.filter((s) => {
      const elo = Number(s.current_elo || s.elo_rating || s.white_elo || 1200);
      return elo >= b.min && elo <= b.max;
    }).length;
  });

  const maxCount = Math.max(...counts, 1);

  return (
    <div className="space-y-3">
      {brackets.map((b, i) => {
        const c = counts[i];
        const barPct = Math.round((c / maxCount) * 100);
        return (
          <div key={b.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">{b.label}</span>
              <span className="text-emerald-400 font-mono font-bold">
                {c} {c === 1 ? 'player' : 'players'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-emerald-500/20"
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OpeningsTable({ games = [], accent = 'emerald' }) {
  const stats = useMemo(() => {
    const map = new Map();
    games.forEach((g) => {
      const raw = g.opening || g.eco || 'Unknown Opening';
      const key = raw.split(':')[0].trim();
      if (!map.has(key)) {
        map.set(key, { name: key, games: 0, wins: 0, accuracies: [] });
      }
      const entry = map.get(key);
      entry.games++;
      if (g.result === 'win') entry.wins++;
      if (g.review) {
        if (g.review.accuracy_white != null) entry.accuracies.push(g.review.accuracy_white);
        if (g.review.accuracy_black != null) entry.accuracies.push(g.review.accuracy_black);
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.games - a.games)
      .slice(0, 5)
      .map((e) => ({
        ...e,
        winRate: pct(e.wins, e.games),
        avgAcc: e.accuracies.length ? Math.round(avg(e.accuracies)) : null,
      }));
  }, [games]);

  if (!stats.length) {
    return <EmptyState message="No opening variations detected in this period." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
            <th className="pb-2.5">Opening Repertoire</th>
            <th className="pb-2.5 text-center">Games</th>
            <th className="pb-2.5 text-center">Win Rate</th>
            <th className="pb-2.5 text-right">Avg Accuracy</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
          {stats.map((row) => (
            <tr key={row.name} className="hover:bg-slate-800/40 transition-colors">
              <td className="py-2.5 font-bold text-white max-w-[180px] truncate">{row.name}</td>
              <td className="py-2.5 text-center font-mono text-slate-300">{row.games}</td>
              <td className="py-2.5 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                    row.winRate >= 55
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : row.winRate >= 45
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {row.winRate}%
                </span>
              </td>
              <td className="py-2.5 text-right font-mono font-bold text-cyan-400">
                {row.avgAcc ? `${row.avgAcc}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      {title && (
        <div className="flex items-center gap-2.5 text-sm font-bold text-white border-b border-slate-800/80 pb-3">
          {Icon && <Icon className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtext = '', accent = 'emerald' }) {
  const accentColor =
    accent === 'purple' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
    accent === 'amber' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</span>
        {Icon && (
          <div className={`p-1.5 rounded-xl border ${accentColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-2xl font-black text-white tracking-tight">{value}</div>
      {subtext && <p className="text-[10px] text-slate-400 truncate">{subtext}</p>}
    </div>
  );
}

function EmptyState({ message = 'No data available for this selection.' }) {
  return (
    <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
      <BarChart2 className="w-8 h-8 opacity-40 text-slate-400" />
      <span>{message}</span>
    </div>
  );
}

const PERIODS = [
  { key: 'weekly', label: '7D' },
  { key: 'monthly', label: '30D' },
  { key: 'yearly', label: '1Y' },
  { key: 'overall', label: 'All' },
];

export default function StatisticsPanel({
  role = 'coach',
  students = [],
  courses = [],
  accounts = [],
  credentials = [],
  enrollments = [],
  games = [],
  myGames = [],
  profile = null,
  chessStats = null,
}) {
  const [period, setPeriod] = useState('monthly');
  const [coachSubMode, setCoachSubMode] = useState('cohort');

  const isAdmin = role === 'admin';
  const isStudent = role === 'student';
  const isCoach = role === 'coach';

  const activeGames = useMemo(() => {
    if (isStudent) {
      return games || [];
    }
    if (isCoach) {
      if (coachSubMode === 'personal') {
        return myGames || [];
      }
      return students.flatMap((s) => (s.games || []).map((g) => ({ ...g, _student: s })));
    }
    return students.flatMap((s) => (s.games || []).map((g) => ({ ...g, _student: s })));
  }, [isStudent, isCoach, coachSubMode, games, myGames, students]);

  const filteredGames = useMemo(() => {
    return activeGames.filter((g) => inPeriod(g.played_at, period));
  }, [activeGames, period]);

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

  const bucketRating = useMemo(() => {
    const sums = new Array(buckets.length).fill(0);
    const cnts = new Array(buckets.length).fill(0);
    filteredGames.forEach((g) => {
      const rating = Number(g.white_elo || g.black_elo || g.elo);
      if (!rating || isNaN(rating)) return;
      const idx = getBucketIndex(g.played_at, period);
      if (idx < 0 || idx >= buckets.length) return;
      sums[idx] += rating;
      cnts[idx]++;
    });

    const baseRating = Number(
      chessStats?.chess_rapid?.last?.rating || profile?.current_elo || profile?.elo_rating || 1200
    );

    return sums.map((s, i) => (cnts[i] ? Math.round(s / cnts[i]) : baseRating));
  }, [filteredGames, buckets, period, chessStats, profile]);

  const bucketUserGrowth = useMemo(() => {
    if (!isAdmin) return [];
    const counts = new Array(buckets.length).fill(0);
    accounts.forEach((acc) => {
      const date = acc.created_at || acc.joined_at;
      if (!date) return;
      const idx = getBucketIndex(date, period);
      if (idx >= 0 && idx < counts.length) counts[idx]++;
    });

    let running = 0;
    return counts.map((c) => {
      running += c;
      return running;
    });
  }, [isAdmin, accounts, buckets, period]);

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

  const activeStudentsCount = useMemo(() => {
    const ids = new Set(filteredGames.map((g) => g.student_id || g._student?.id));
    return ids.size;
  }, [filteredGames]);

  const coursesCompletionRate = useMemo(() => {
    const totalChapters = courses.reduce((s, c) => s + ((c.chapters || []).length || 1), 0);
    if (!totalChapters) return 0;
    let completed = 0;
    if (isStudent) {
      courses.forEach((c) => {
        completed += (c.progress?.completed_chapter_ids || []).length;
      });
    } else {
      students.forEach((s) => {
        (s.assignments || []).forEach((a) => {
          const course = courses.find((c) => c.id === a.course_id);
          if (!course) return;
          completed += (a.progress?.completed_chapter_ids || []).length;
        });
      });
    }
    return pct(completed, totalChapters);
  }, [isStudent, courses, students]);

  const eloStudents = useMemo(() => {
    if (isAdmin) return accounts.filter((a) => a.current_elo || a.elo_rating);
    return students.filter((s) => s.current_elo || s.elo_rating);
  }, [isAdmin, accounts, students]);

  const accentTheme = isAdmin
    ? 'purple'
    : isCoach && coachSubMode === 'cohort'
    ? 'amber'
    : 'emerald';

  const activePill =
    accentTheme === 'purple'
      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
      : accentTheme === 'amber'
      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
      : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              accentTheme === 'purple'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : accentTheme === 'amber'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">
                {isAdmin
                  ? 'Platform-Wide Telemetry & KPIs'
                  : isCoach && coachSubMode === 'cohort'
                  ? 'Student Cohort Analytics'
                  : isCoach
                  ? 'My Personal Learning Progress'
                  : 'Personal Learning Analytics & Trends'}
              </h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  accentTheme === 'purple'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : accentTheme === 'amber'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isAdmin ? 'Admin Console' : isCoach && coachSubMode === 'cohort' ? 'Coach Studio' : 'Learner Track'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Tracking all users, courses, engine accuracy, and platform growth.'
                : isCoach && coachSubMode === 'cohort'
                ? 'Monitoring student cohort performance, move accuracy, and opening repertoires.'
                : 'Visual trend graphics of your rating progression, Stockfish NNUE accuracy, and review history.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCoach && (
            <div className="p-1 bg-slate-950 border border-slate-800 rounded-2xl flex gap-1">
              <button
                type="button"
                onClick={() => setCoachSubMode('cohort')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  coachSubMode === 'cohort'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Student Cohort
              </button>
              <button
                type="button"
                onClick={() => setCoachSubMode('personal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  coachSubMode === 'personal'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Personal Progress
              </button>
            </div>
          )}

          <div className="p-1 bg-slate-950 border border-slate-800 rounded-2xl flex gap-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === key ? activePill : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {isAdmin ? (
          <>
            <KpiCard icon={Users} label="Total Accounts" value={accounts.length} accent="purple" subtext="Platform Users" />
            <KpiCard icon={Trophy} label="Total Games" value={filteredGames.length} accent="purple" subtext="Platform Matches" />
            <KpiCard
              icon={Target}
              label="Engine Accuracy"
              value={accuracyValues.length ? `${avgAccuracy.toFixed(1)}%` : '—'}
              accent="purple"
              subtext="Stockfish 18 NNUE"
            />
            <KpiCard
              icon={Award}
              label="Verified Coaches"
              value={credentials.filter((c) => c.verification_status === 'verified').length}
              accent="purple"
              subtext={`${credentials.filter((c) => c.verification_status === 'pending').length} pending review`}
            />
            <KpiCard icon={Layers} label="Curriculum Rate" value={`${coursesCompletionRate}%`} accent="purple" subtext="Course completion" />
          </>
        ) : isCoach && coachSubMode === 'cohort' ? (
          <>
            <KpiCard icon={Users} label="Roster Students" value={students.length} accent="amber" subtext="In your cohort" />
            <KpiCard icon={Trophy} label="Cohort Matches" value={filteredGames.length} accent="amber" subtext="Played this period" />
            <KpiCard
              icon={Target}
              label="Cohort Accuracy"
              value={accuracyValues.length ? `${avgAccuracy.toFixed(1)}%` : '—'}
              accent="amber"
              subtext="Stockfish NNUE average"
            />
            <KpiCard
              icon={TrendingUp}
              label="Win Rate"
              value={`${pct(wdl.wins, filteredGames.length)}%`}
              accent="amber"
              subtext={`${wdl.wins}W / ${wdl.losses}L / ${wdl.draws}D`}
            />
            <KpiCard
              icon={CheckCircle2}
              label="Course Progress"
              value={`${coursesCompletionRate}%`}
              accent="amber"
              subtext="Curriculum completion"
            />
          </>
        ) : (
          <>
            <KpiCard
              icon={Zap}
              label="Current Rating"
              value={`${chessStats?.chess_rapid?.last?.rating || profile?.current_elo || '1200'} Elo`}
              accent="emerald"
              subtext={chessStats?.chess_rapid?.best?.rating ? `Peak: ${chessStats.chess_rapid.best.rating}` : 'Rapid rating'}
            />
            <KpiCard icon={Trophy} label="Matches Analyzed" value={filteredGames.length} accent="emerald" subtext="In selected period" />
            <KpiCard
              icon={Target}
              label="Avg Accuracy"
              value={accuracyValues.length ? `${avgAccuracy.toFixed(1)}%` : '—'}
              accent="emerald"
              subtext="Stockfish 18 NNUE"
            />
            <KpiCard
              icon={TrendingUp}
              label="Win Rate"
              value={`${pct(wdl.wins, filteredGames.length)}%`}
              accent="emerald"
              subtext={`${wdl.wins}W / ${wdl.losses}L / ${wdl.draws}D`}
            />
            <KpiCard icon={Layers} label="Enrolled Courses" value={courses.length} accent="emerald" subtext="MoveTrainer study" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Section
            title={
              isAdmin
                ? 'Platform User Growth Trend'
                : isCoach && coachSubMode === 'cohort'
                ? 'Cohort Engine Accuracy Trend'
                : 'Rating Progression Trend'
            }
            icon={TrendingUp}
          >
            {isAdmin ? (
              <LineChart
                buckets={buckets}
                data={bucketUserGrowth}
                unit=" Users"
                color="#a855f7"
                chartId="admin-growth"
                height={170}
              />
            ) : isCoach && coachSubMode === 'cohort' ? (
              <LineChart
                buckets={buckets}
                data={bucketAccuracy}
                unit="%"
                minVal={0}
                maxVal={100}
                color="#f59e0b"
                chartId="cohort-acc"
                height={170}
              />
            ) : (
              <LineChart
                buckets={buckets}
                data={bucketRating}
                unit=" Elo"
                color="#10b981"
                chartId="student-elo"
                height={170}
              />
            )}
          </Section>
        </div>

        <div className="lg:col-span-5">
          <Section
            title={
              isAdmin
                ? 'Platform Engine Accuracy Trend'
                : isCoach && coachSubMode === 'cohort'
                ? 'Cohort Games Volume'
                : 'Stockfish 18 NNUE Accuracy Trend'
            }
            icon={Target}
          >
            {isAdmin ? (
              <LineChart
                buckets={buckets}
                data={bucketAccuracy}
                unit="%"
                minVal={0}
                maxVal={100}
                color="#06b6d4"
                chartId="admin-acc"
                height={170}
              />
            ) : isCoach && coachSubMode === 'cohort' ? (
              <BarChart buckets={buckets} data={bucketGameCounts} color="#f59e0b" height={170} />
            ) : (
              <LineChart
                buckets={buckets}
                data={bucketAccuracy}
                unit="%"
                minVal={0}
                maxVal={100}
                color="#06b6d4"
                chartId="student-acc"
                height={170}
              />
            )}
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <Section title="Game Outcomes Distribution" icon={Trophy}>
            <DonutChart wins={wdl.wins} draws={wdl.draws} losses={wdl.losses} />
          </Section>
        </div>

        <div className="lg:col-span-7">
          <Section
            title={
              isAdmin
                ? 'Platform Activity Volume'
                : isCoach && coachSubMode === 'cohort'
                ? 'Student Elo Bracket Distribution'
                : 'Matches & Study Activity Volume'
            }
            icon={BarChart2}
          >
            {isCoach && coachSubMode === 'cohort' ? (
              <EloDistribution students={students} />
            ) : (
              <BarChart
                buckets={buckets}
                data={bucketGameCounts}
                color={isAdmin ? '#a855f7' : '#10b981'}
                height={160}
              />
            )}
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={isAdmin ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Section title="Opening Repertoire Performance" icon={Calendar}>
            <OpeningsTable games={filteredGames} accent={accentTheme} />
          </Section>
        </div>

        {isAdmin && (
          <div className="lg:col-span-5">
            <Section title="Global Platform ELO Distribution" icon={Users}>
              {eloStudents.length === 0 ? (
                <EmptyState message="No ELO data recorded across platform users." />
              ) : (
                <EloDistribution students={eloStudents} />
              )}
            </Section>
          </div>
        )}
      </div>

      {isCoach && coachSubMode === 'cohort' && students.length > 0 && (
        <Section title="Student Roster Comparative Performance" icon={Users}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3 text-center">Elo Rating</th>
                  <th className="pb-3 text-center">Games</th>
                  <th className="pb-3 text-center">Avg Accuracy</th>
                  <th className="pb-3 text-right">Courses Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                {students.map((std) => {
                  const stdGames = std.games || [];
                  const accs = stdGames
                    .filter((g) => g.review?.accuracy_white)
                    .map((g) => g.review.accuracy_white);
                  const studentAcc = accs.length ? Math.round(avg(accs)) : null;

                  return (
                    <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-bold text-white flex items-center gap-2.5">
                        <img
                          src={
                            std.avatar_url ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={std.display_name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700"
                        />
                        <span>{std.display_name || 'Student'}</span>
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-amber-400">
                        {std.current_elo || 1200} Elo
                      </td>
                      <td className="py-3 text-center font-mono">{stdGames.length}</td>
                      <td className="py-3 text-center">
                        {studentAcc ? (
                          <span className="font-mono font-bold text-cyan-400">{studentAcc}%</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-400">
                        {(std.assignments || []).length} assigned
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
