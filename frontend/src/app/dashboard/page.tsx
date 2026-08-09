'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Line
} from 'recharts';
import { apiFetch, UserProfile } from '@/lib/api';

interface SessionReport {
  id: string;
  session: string;
  session_question: string;
  session_category: string;
  session_created_at: string;
  speech_score: number;
  face_score: number;
  answer_score: number;
  overall_score: number;
  is_partial: boolean;
  created_at: string;
}

const categoryColor: Record<string, string> = {
  behavioral: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  hr: 'text-sky-700 bg-sky-50 border-sky-200',
  technical: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const scoreGrade = (s: number) => {
  if (s >= 85) return 'text-emerald-600';
  if (s >= 70) return 'text-indigo-600';
  if (s >= 55) return 'text-amber-600';
  return 'text-rose-600';
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card border border-slate-200 rounded-2xl px-4 py-3 shadow-xl text-xs backdrop-blur-xl bg-white text-slate-900">
        <p className="text-slate-500 mb-1 font-bold">Session #{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.stroke }} className="font-extrabold">
            {p.name}: <span className="text-slate-900">{p.value?.toFixed(1)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        const [prof, reps] = await Promise.all([
          apiFetch<UserProfile>('/users/profile/'),
          apiFetch<SessionReport[]>('/reports/'),
        ]);
        setProfile(prof);
        setReports(Array.isArray(reps) ? reps : (reps as any).results || []);
      } catch {
        localStorage.clear();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await apiFetch('/users/logout/', { method: 'POST', body: JSON.stringify({ refresh }) });
      } catch { }
    }
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const chartData = [...reports].reverse().map((r, i) => ({
    session: i + 1,
    Overall: r.overall_score,
    Speech: r.speech_score,
    Face: r.face_score,
    Answer: r.answer_score,
  }));

  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '—';

  const allOverall = reports.map(r => r.overall_score).filter(Boolean);
  const best = allOverall.length ? Math.max(...allOverall).toFixed(1) : '—';
  const latest = reports[0]?.overall_score?.toFixed(1) || '—';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {}
      <div className="ambient-blur w-[600px] h-[600px] bg-indigo-200/40 top-[-200px] left-1/2 -translate-x-1/2" />
      <div className="ambient-blur w-[400px] h-[400px] bg-emerald-200/30 bottom-[-100px] right-[-100px]" />

      {}
      <header className="sticky top-0 z-30 glass-nav px-6 py-4 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <span className="text-xl font-black text-white">IQ</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 font-sans">
              Interview<span className="text-indigo-600">IQ</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-600 font-bold hidden sm:block">
              {profile?.full_name || profile?.email}
            </span>
            <Link
              href="/interview/live"
              className="text-xs font-bold px-4 py-2.5 rounded-2xl btn-emerald shadow-md transition flex items-center gap-2"
            >
              <span>🤖</span> Live AI Practice Studio
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-2 text-slate-500 hover:text-slate-900 transition rounded-xl hover:bg-slate-200/60"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8 relative z-10">
        {}
        <div className="glass-card p-8 rounded-3xl border border-slate-200/90 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" /> Candidate Performance Hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Candidate'} 👋
              </h1>
              <p className="text-xs text-slate-600 mt-1 font-normal">Track your multimodal AI interview performance analytics.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/interview/live"
                className="px-6 py-3.5 btn-primary font-black rounded-2xl shadow-md text-xs text-center"
              >
                Launch AI Practice Room →
              </Link>
            </div>
          </div>

          {}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Total Sessions', value: reports.length, unit: 'sessions', icon: '📊' },
              { label: 'Latest Score', value: latest, unit: '/100', icon: '⚡' },
              { label: 'Personal Best', value: best, unit: '/100', icon: '🏆' },
              { label: 'Average Score', value: avg(allOverall), unit: '/100', icon: '🎯' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/90 border border-slate-200/90 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>{stat.label}</span>
                  <span>{stat.icon}</span>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {stat.value}<span className="text-xs text-slate-500 ml-1 font-semibold">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        {mounted && chartData.length > 1 && (
          <div className="glass-card p-6 rounded-3xl border border-slate-200/90">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2">
              <span>📈</span> Multimodal Score Trend
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="session" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Overall" name="Overall" stroke="#4f46e5" fill="url(#gOverall)" strokeWidth={3} dot={{ fill: '#4f46e5', strokeWidth: 0, r: 4 }} />
                <Line type="monotone" dataKey="Speech" name="Speech" stroke="#059669" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="Answer" name="Answer" stroke="#d97706" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {}
        <div className="glass-card rounded-3xl border border-slate-200/90 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span>📜</span> Practice Logs &amp; Reports
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {reports.length} Session{reports.length !== 1 ? 's' : ''} Completed
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
                🎙️
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Practice Logs Yet</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto mb-6 font-normal">
                Record your first AI interview practice session to unlock real-time feedback &amp; reports.
              </p>
              <Link
                href="/interview/live"
                className="px-6 py-3.5 btn-primary font-bold rounded-2xl shadow-md text-xs inline-block"
              >
                Start First AI Practice Session
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {reports.map((r) => {
                const d = new Date(r.session_created_at || r.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                });
                const catClass = categoryColor[r.session_category] || 'text-slate-700 bg-slate-100 border-slate-200';
                return (
                  <div key={r.id} className="px-6 py-4 hover:bg-slate-100/70 transition flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${catClass}`}>
                          {r.session_category}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{d}</span>
                        {r.is_partial && (
                          <span className="text-[11px] font-bold text-amber-800 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded-full">
                            partial
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xl">
                        &quot;{r.session_question}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-5 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className={`text-2xl font-black ${scoreGrade(r.overall_score)}`}>
                          {r.overall_score?.toFixed(0)}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Overall Score</div>
                      </div>

                      <Link
                        href={`/report/${r.session}`}
                        className="px-4 py-2 text-xs font-bold btn-secondary rounded-2xl shadow-sm"
                      >
                        View Report →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
