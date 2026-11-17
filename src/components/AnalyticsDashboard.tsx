import { useEffect, useState } from 'react';
import { BarChart3, Download, Search, TrendingUp } from 'lucide-react';
import { BENCHMARK_ANALYTICS } from '../data/blueprints';
import type { AnalyticsSnapshot } from '../types';

export function AnalyticsDashboard() {
  const [datasetMode, setDatasetMode] = useState<'live' | 'benchmark'>('live');
  const [liveData, setLiveData] = useState<AnalyticsSnapshot>(BENCHMARK_ANALYTICS);
  const [benchmarkData, setBenchmarkData] = useState<AnalyticsSnapshot>(BENCHMARK_ANALYTICS);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { live?: AnalyticsSnapshot; benchmark?: AnalyticsSnapshot } | null) => {
        if (data?.live) setLiveData(data.live);
        if (data?.benchmark) setBenchmarkData(data.benchmark);
      })
      .catch(() => {});
  }, []);

  const current = datasetMode === 'live' ? liveData : benchmarkData;

  const filteredRoster = current.studentRoster.filter((row) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.squad.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Name', 'Squad', 'Accuracy (%)', 'Avg Response (s)', 'XP', 'Sessions'];
    const rows = filteredRoster.map((r) => [
      r.id,
      `"${r.name.replace(/"/g, '""')}"`,
      r.squad,
      r.accuracy,
      r.avgResponseSec,
      r.xp,
      r.sessionsCompleted,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartfun360-${datasetMode}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG chart geometry
  const chartW = 560;
  const chartH = 210;
  const padX = 36;
  const padY = 24;
  const points = current.weeklyParticipation;
  const stepX = points.length > 1 ? (chartW - padX * 2) / (points.length - 1) : 0;

  const toY = (val: number) => {
    const minVal = 60;
    const maxVal = 100;
    const ratio = (val - minVal) / (maxVal - minVal);
    return chartH - padY - ratio * (chartH - padY * 2);
  };

  const attendancePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${padX + i * stepX} ${toY(p.attendance)}`)
    .join(' ');
  const quizPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${padX + i * stepX} ${toY(p.quizActive)}`)
    .join(' ');

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Header & Dataset Switch */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Learning Intelligence & Telemetry
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1">
            Classroom Analytics Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Monitor student participation velocity, topic mastery, and export classroom CSV reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <button
              type="button"
              onClick={() => setDatasetMode('live')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: datasetMode === 'live' ? 'var(--bg-surface)' : 'transparent',
                color: datasetMode === 'live' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Live Classroom Telemetry
            </button>
            <button
              type="button"
              onClick={() => setDatasetMode('benchmark')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: datasetMode === 'benchmark' ? 'var(--bg-surface)' : 'transparent',
                color: datasetMode === 'benchmark' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Sample Benchmark Dataset
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-on-primary)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </section>

      {/* Interactive Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Student Participation Chart */}
        <div
          className="lg:col-span-6 rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                Weekly Student Participation
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Attendance vs. active buzzer engagement (%)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                Attendance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-secondary)' }} />
                Quiz Active
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto min-w-[420px]">
              {[60, 70, 80, 90, 100].map((tick) => {
                const y = toY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={chartW - padX}
                      y2={y}
                      stroke="var(--border-hairline)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={6}
                      y={y + 4}
                      fontSize="10"
                      fill="var(--text-muted)"
                      className="font-mono"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              <path
                d={attendancePath}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d={quizPath}
                fill="none"
                stroke="var(--accent-secondary)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {points.map((p, i) => {
                const cx = padX + i * stepX;
                const cyAtt = toY(p.attendance);
                const cyQuiz = toY(p.quizActive);
                const active = hoveredIdx === i;
                return (
                  <g
                    key={p.day}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    <circle cx={cx} cy={cyAtt} r={active ? 6 : 4} fill="var(--accent-primary)" />
                    <circle cx={cx} cy={cyQuiz} r={active ? 6 : 4} fill="var(--accent-secondary)" />
                    <text
                      x={cx}
                      y={chartH - 4}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--text-muted)"
                      className="font-mono"
                    >
                      {p.day}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-xs font-mono tabular-nums min-h-[18px]" style={{ color: 'var(--text-secondary)' }}>
            {hoveredIdx !== null
              ? `${points[hoveredIdx].day}: ${points[hoveredIdx].attendance}% Attendance · ${points[hoveredIdx].quizActive}% Active Quiz Participation`
              : 'Hover over data points to inspect daily classroom engagement.'}
          </div>
        </div>

        {/* Topic Mastery & Comprehension Breakdown */}
        <div
          className="lg:col-span-6 rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div>
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              Topic Mastery & Comprehension
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Verified conceptual accuracy across curriculum units
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {current.topicMastery.map((item) => (
              <div key={item.subject} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold gap-2">
                  <span className="truncate">{item.subject}</span>
                  <span className="font-mono tabular-nums shrink-0">
                    {item.mastery}% · {item.sessions} sessions
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.mastery}%`,
                      background: 'var(--hero-gradient)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Performance Table */}
      <section
        className="rounded-2xl p-6 space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Student Performance Telemetry</h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter student or squad..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                <th className="py-2.5 pr-4 font-semibold">Student</th>
                <th className="py-2.5 px-4 font-semibold">Squad</th>
                <th className="py-2.5 px-4 font-semibold text-right">Accuracy</th>
                <th className="py-2.5 px-4 font-semibold text-right">Avg Speed</th>
                <th className="py-2.5 px-4 font-semibold text-right">Sessions</th>
                <th className="py-2.5 pl-4 font-semibold text-right">Total XP</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No matching student telemetry records found.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-none text-xs sm:text-sm"
                    style={{ borderColor: 'var(--border-hairline)' }}
                  >
                    <td className="py-3 pr-4 font-semibold">{row.name}</td>
                    <td className="py-3 px-4 capitalize">{row.squad}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{row.accuracy}%</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{row.avgResponseSec}s</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{row.sessionsCompleted}</td>
                    <td className="py-3 pl-4 text-right font-mono font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                      {row.xp.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
