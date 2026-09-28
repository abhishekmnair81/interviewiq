'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Line
} from 'recharts';
import { Bot, BarChart2, Zap, Trophy, Target, LineChart as LineChartIcon, FileText, Mic } from 'lucide-react';
import { apiFetch, UserProfile } from '@/lib/api';
import { LaserCollection } from '@/components/threeui/laser';
import ResumeUpload from '@/components/ResumeUpload';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';

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
  behavioral: 'text-primary-400 bg-primary-950/30 border-primary-500/20',
  hr: 'text-info-400 bg-info-950/30 border-info-500/20',
  technical: 'text-accent-400 bg-accent-950/30 border-accent-500/20',
};

const scoreGrade = (s: number) => {
  if (s >= 85) return 'text-accent-400';
  if (s >= 70) return 'text-primary-400';
  if (s >= 55) return 'text-warning-400';
  return 'text-error-400';
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-4 py-3 shadow-xl text-xs">
        <p className="text-secondary-color mb-1 font-bold">Session #{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.stroke }} className="font-extrabold font-mono tabular-nums">
            {p.name}: <span className="text-primary-color">{p.value?.toFixed(1)}</span>
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
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-surface-2 border-t-primary-500 rounded-full animate-spin" />
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
    <div className="min-h-screen-dvh bg-surface-0 text-primary-color font-sans relative overflow-hidden">
      {/* The single WebGL scene — ThreeUI LaserCollection (vanishing-array) */}
      <div className="fixed top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <LaserCollection
          variant="vanishing-array"
          speed={1.00}
          size={1.00}
          length={1.00}
          density={1.00}
          opacity={0.88}
          hue={0}
          saturation={1.00}
          brightness={1.00}
        />
        {/* Soft gradient masks to blend cleanly into the dark theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020305] via-transparent to-[#020305]/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020305]/60 via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="absolute inset-0 bg-noise opacity-30 z-0 pointer-events-none" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 glass-nav px-6 py-4 border-b border-surface-border">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo />

          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary-color font-bold hidden sm:block">
              {profile?.full_name || profile?.email}
            </span>
            <Link
              href="/interview/live"
              className="btn btn-md btn-glow rounded-xl gap-2 shadow-glow-signal"
            >
              <Bot size={16} /> Live AI Practice Studio
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-ghost rounded-xl px-3 py-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8 relative z-10 animate-fade-in">
        
        {/* Welcome Hero Card */}
        <div className="glass-card p-8 relative overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal-500/10 border border-signal-500/20 text-signal-400 text-xs font-bold mb-3 shadow-glow-signal">
                <span className="w-2 h-2 rounded-full bg-signal-500 animate-pulse" /> 
                Candidate Performance Hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Candidate'} 👋
              </h1>
              <p className="text-sm text-secondary-color mt-2 font-normal">
                Track your multimodal AI interview performance analytics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/interview/live"
                className="btn btn-lg btn-glow rounded-2xl"
              >
                Launch AI Practice Room →
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 relative z-10">
            {[
              { label: 'Total Sessions', value: reports.length, unit: 'sessions', icon: <BarChart2 size={16}/> },
              { label: 'Latest Score', value: latest, unit: '/100', icon: <Zap size={16}/> },
              { label: 'Personal Best', value: best, unit: '/100', icon: <Trophy size={16}/> },
              { label: 'Average Score', value: avg(allOverall), unit: '/100', icon: <Target size={16}/> },
            ].map(stat => (
              <div key={stat.label} className="bg-surface-2/50 backdrop-blur-md border border-surface-border rounded-2xl p-4 shadow-sm hover:border-signal-500/30 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold text-secondary-color mb-1">
                  <span>{stat.label}</span>
                  <span className="text-signal-400">{stat.icon}</span>
                </div>
                <div className="text-2xl font-black tracking-tight text-white font-mono tabular-nums">
                  {stat.value}<span className="text-xs text-muted-color ml-1 font-semibold font-sans">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resume Section */}
        {profile && (
          <ResumeUpload user={profile} onUpdate={setProfile} />
        )}

        {/* Chart Section */}
        {mounted && chartData.length > 1 && (
          <div className="glass-card p-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-secondary-color mb-6 flex items-center gap-2">
              <LineChartIcon size={16} className="text-primary-400" /> Multimodal Score Trend
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="session" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Overall" name="Overall" stroke="hsl(239, 84%, 67%)" fill="url(#gOverall)" strokeWidth={3} dot={{ fill: 'hsl(239, 84%, 67%)', strokeWidth: 0, r: 4 }} />
                <Line type="monotone" dataKey="Speech" name="Speech" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="Answer" name="Answer" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sessions List */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-secondary-color flex items-center gap-2">
              <FileText size={16} className="text-accent-400"/> Practice Logs &amp; Reports
            </h2>
            <span className="text-xs font-bold text-secondary-color">
              {reports.length} Session{reports.length !== 1 ? 's' : ''} Completed
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-signal-950/30 border border-signal-500/20 text-signal-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-glow-signal">
                <Mic size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Practice Logs Yet</h3>
              <p className="text-sm text-secondary-color max-w-sm mx-auto mb-6 font-normal">
                Record your first AI interview practice session to unlock real-time feedback &amp; reports.
              </p>
              <Link
                href="/interview/live"
                className="btn btn-lg btn-glow rounded-2xl"
              >
                Start First AI Practice Session
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {reports.map((r) => {
                const d = new Date(r.session_created_at || r.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                });
                const catClass = categoryColor[r.session_category] || 'text-secondary-color bg-surface-2 border-surface-border';
                return (
                  <div key={r.id} className="px-6 py-4 hover:bg-surface-2/50 transition-colors flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${catClass}`}>
                          {r.session_category}
                        </span>
                        <span className="text-xs text-muted font-medium">{d}</span>
                        {r.is_partial && (
                          <span className="text-[11px] font-bold text-warning-400 border border-warning-500/30 bg-warning-950/20 px-2 py-0.5 rounded-full">
                            partial
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white truncate max-w-xl">
                        &quot;{r.session_question}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-5 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className={`text-2xl font-black font-mono tabular-nums ${scoreGrade(r.overall_score)}`}>
                          {r.overall_score?.toFixed(0)}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-color">Overall Score</div>
                      </div>

                      <Link
                        href={`/report/${r.session}`}
                        className="btn btn-sm btn-secondary rounded-xl"
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
      
      <Footer />
    </div>
  );
}
