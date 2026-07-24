'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
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
  behavioral: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  hr: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  technical: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const scoreGrade = (s: number) => {
  if (s >= 85) return 'text-emerald-400';
  if (s >= 70) return 'text-blue-400';
  if (s >= 55) return 'text-amber-400';
  return 'text-rose-400';
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-sm">
        <p className="text-slate-400 mb-1">Session {label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.stroke }}>
            {p.name}: <strong>{p.value?.toFixed(1)}</strong>
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

  useEffect(() => {
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          InterviewIQ
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 hidden sm:block">{profile?.full_name || profile?.email}</span>
          <Link
            href="/record"
            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition"
          >
            🎙️ New Session
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Hero Welcome */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-3xl font-extrabold text-white mb-1">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Candidate'} 👋
          </h1>
          <p className="text-slate-400 mb-6">Here's your interview performance dashboard.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Sessions', value: reports.length, unit: 'total' },
              { label: 'Latest Score', value: latest, unit: '/100' },
              { label: 'Best Score', value: best, unit: '/100' },
              { label: 'Avg Overall', value: avg(allOverall), unit: '/100' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-white">
                  {stat.value}<span className="text-sm text-slate-400 ml-1">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Chart */}
        {chartData.length > 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">
              Score Progress Over Time
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="session" tick={{ fill: '#475569', fontSize: 12 }} label={{ value: 'Session', position: 'insideBottom', fill: '#475569', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Overall" name="Overall" stroke="#818cf8" fill="url(#gOverall)" strokeWidth={2.5} dot={{ fill: '#818cf8', strokeWidth: 0, r: 4 }} />
                <Line type="monotone" dataKey="Speech" name="Speech" stroke="#34d399" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="Answer" name="Answer" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-3 justify-center text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" /> Overall</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Speech</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" /> Answer</span>
            </div>
          </div>
        )}

        {/* AI Capabilities Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { color: 'text-blue-400', icon: '🎤', title: 'Speech Analysis', sub: 'Whisper + Librosa', desc: 'WPM pacing, filler word detection, pitch & volume consistency' },
            { color: 'text-purple-400', icon: '👁️', title: 'Facial Analysis', sub: 'MediaPipe + DeepFace', desc: 'Eye contact tracking, head stability, expression scoring' },
            { color: 'text-indigo-400', icon: '🧠', title: 'Answer Quality', sub: 'STAR + Cosine Similarity', desc: 'Relevance scoring, STAR structure detection, confidence analysis' },
          ].map(c => (
            <div key={c.title} className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className={`text-sm font-bold ${c.color} mb-0.5`}>{c.title}</div>
              <div className="text-xs text-slate-500 mb-2">{c.sub}</div>
              <p className="text-xs text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Session History */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Session History</h2>
            {reports.length > 0 && (
              <span className="text-xs text-slate-500">{reports.length} session{reports.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {reports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-4xl mb-4">🎙️</div>
              <p className="text-slate-400 mb-2">No sessions yet.</p>
              <p className="text-sm text-slate-600 mb-6">Record your first mock interview to see your AI analysis here.</p>
              <Link
                href="/record"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition"
              >
                Start First Session
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {reports.map((r) => {
                const d = new Date(r.session_created_at || r.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                });
                const catClass = categoryColor[r.session_category] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';
                return (
                  <div key={r.id} className="px-6 py-4 hover:bg-slate-800/30 transition flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${catClass}`}>
                          {r.session_category}
                        </span>
                        <span className="text-xs text-slate-500">{d}</span>
                        {r.is_partial && (
                          <span className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">partial</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-200 truncate max-w-lg">{r.session_question}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className={`text-2xl font-bold ${scoreGrade(r.overall_score)}`}>
                          {r.overall_score?.toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-500">Overall</div>
                      </div>
                      <Link
                        href={`/report/${r.session}`}
                        className="px-4 py-2 text-sm bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition font-medium"
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
