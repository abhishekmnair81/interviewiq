'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Line
} from 'recharts';
import { Bot, BarChart2, Zap, Trophy, Target, LineChart as LineChartIcon, FileText, Mic, Search, User, ChevronDown, LogOut, Briefcase, Filter, FileSearch, FileEdit, PieChart as ChartIcon, Menu, X, LayoutDashboard, BrainCircuit, LineChart as ChartLine, BookOpen } from 'lucide-react';
import { apiFetch, UserProfile } from '@/lib/api';
import { LaserCollection } from '@/components/threeui/laser';
import ResumeUpload from '@/components/ResumeUpload';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import FullScreenLoader from '@/components/FullScreenLoader';
import AnimatedCounter from '@/components/AnimatedCounter';

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

  const [chartFilters, setChartFilters] = useState({
    overall: true,
    speech: true,
    face: true,
    answer: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    return <FullScreenLoader />;
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
  const allSpeech = reports.map(r => r.speech_score).filter(Boolean);
  const allFace = reports.map(r => r.face_score).filter(Boolean);
  const allAnswer = reports.map(r => r.answer_score).filter(Boolean);

  const best = allOverall.length ? Math.max(...allOverall).toFixed(1) : '—';
  const latest = reports[0]?.overall_score?.toFixed(1) || '—';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  };

  const toggleChartFilter = (key: keyof typeof chartFilters) => {
    setChartFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.session_question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.session_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const recentResults = reports.slice(0, 3);

  const handleNavClick = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-surface-0 text-primary-color font-sans relative overflow-hidden">
      {/* Background Layer */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#020305] via-transparent to-[#020305]/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020305]/60 via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="absolute inset-0 bg-noise opacity-30 z-0 pointer-events-none" />

      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-0 left-0 w-full z-40 glass-nav px-4 py-3 border-b border-surface-border flex items-center justify-between">
        <Logo />
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-secondary-color hover:text-white transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 glass-card border-r border-surface-border flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-surface-border">
          <Logo />
          <button className="lg:hidden p-1 text-secondary-color" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {/* Main Navigation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-color mb-3 px-3">Main Menu</div>
            <div className="space-y-1">
              <a 
                href="#overview" 
                onClick={() => handleNavClick('overview')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === 'overview' ? 'bg-primary-500/10 text-primary-400 shadow-inner border border-primary-500/20' : 'text-secondary-color hover:bg-surface-2 hover:text-white'}`}
              >
                <LayoutDashboard size={18} /> Overview
              </a>
              <a 
                href="#interview" 
                onClick={() => handleNavClick('interview')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === 'interview' ? 'bg-primary-500/10 text-primary-400 shadow-inner border border-primary-500/20' : 'text-secondary-color hover:bg-surface-2 hover:text-white'}`}
              >
                <BrainCircuit size={18} /> AI Interview
              </a>
              <a 
                href="#reports" 
                onClick={() => handleNavClick('reports')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === 'reports' ? 'bg-primary-500/10 text-primary-400 shadow-inner border border-primary-500/20' : 'text-secondary-color hover:bg-surface-2 hover:text-white'}`}
              >
                <ChartLine size={18} /> Reports
              </a>
            </div>
          </div>

          {/* Upcoming Navigation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-color mb-3 px-3">Coming Soon</div>
            <div className="space-y-1">
              <div className="flex justify-between items-center px-3 py-2.5 rounded-xl text-sm font-medium text-muted-color opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <FileSearch size={18} /> Resume Tools
                </div>
                <span className="text-[9px] font-bold uppercase border border-surface-border px-1.5 py-0.5 rounded-md text-secondary-color">Soon</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5 rounded-xl text-sm font-medium text-muted-color opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <BookOpen size={18} /> Aptitude Tests
                </div>
                <span className="text-[9px] font-bold uppercase border border-surface-border px-1.5 py-0.5 rounded-md text-secondary-color">Soon</span>
              </div>
            </div>
          </div>
        </nav>

        {/* User Block at bottom */}
        <div className="p-4 border-t border-surface-border relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-inner-md border border-primary-400 flex-shrink-0">
              {getInitials(profile?.full_name || profile?.email || 'User')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-color truncate">{profile?.email}</p>
            </div>
            <ChevronDown size={14} className="text-muted-color flex-shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-[calc(100%+0.5rem)] left-4 w-64 glass-card border border-surface-border shadow-2xl py-2 z-50 animate-slide-up">
              <div className="py-1">
                <a href="#resume-upload" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-secondary-color hover:bg-surface-2 hover:text-white transition-colors">
                  <FileText size={14} /> Resume &amp; Context
                </a>
              </div>
              <div className="border-t border-surface-border py-1">
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-400 hover:bg-error-500/10 transition-colors">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative z-10 pt-16 lg:pt-0 scroll-smooth">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-16 lg:space-y-24">
          
          {/* Section 1: GREETING */}
          <section id="overview" className="scroll-mt-10 animate-fade-in">
            {/* Welcome Hero Card */}
            <div className="glass-card p-8 relative overflow-hidden shadow-xl">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 relative z-10">
                <div className="flex gap-6 items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary-500 to-indigo-700 flex flex-shrink-0 items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-glow-primary border-2 border-primary-400/50">
                    {getInitials(profile?.full_name || profile?.email || 'User')}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal-500/10 border border-signal-500/20 text-signal-400 text-xs font-bold mb-3 shadow-glow-signal">
                      <span className="w-2 h-2 rounded-full bg-signal-500 animate-pulse" /> 
                      Candidate Performance Hub
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
                      Welcome back, {profile?.full_name?.split(' ')[0] || 'Candidate'} 👋
                    </h1>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 border border-surface-border text-xs text-secondary-color font-medium">
                        <User size={12} className="text-muted-color" /> {profile?.email}
                      </span>
                      {(profile as any)?.target_role && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 border border-surface-border text-xs text-secondary-color font-medium">
                          <Briefcase size={12} className="text-muted-color" /> {(profile as any)?.target_role}
                        </span>
                      )}
                    </div>
                  </div>
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
                      {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value !== '—' ? <AnimatedCounter value={parseFloat(stat.value as string)} /> : '—'}
                      <span className="text-xs text-muted-color ml-1 font-semibold font-sans">{stat.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: INTERVIEW */}
          <section id="interview" className="scroll-mt-10 space-y-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-surface-border pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                  <BrainCircuit className="text-primary-400" /> AI Interview
                </h2>
                <p className="text-sm text-secondary-color mt-1">Practice, review, and refine your technique.</p>
              </div>
              <Link
                href="/interview/live"
                className="btn btn-lg btn-glow rounded-2xl shadow-glow-signal shrink-0"
              >
                Launch AI Practice Room →
              </Link>
            </div>

            {/* Journey Timeline */}
            <div className="glass-card p-6 md:p-8 relative overflow-hidden shadow-lg">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-secondary-color mb-8 flex items-center gap-2">
                 Your Interview Journey
              </h3>
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4 before:absolute before:top-1/2 before:-translate-y-1/2 before:left-8 md:before:left-0 before:w-1 before:h-full md:before:w-full md:before:h-1 before:bg-surface-border before:-z-10 z-10">
                
                <div className="flex md:flex-col items-center gap-4 text-center group bg-surface-1 md:bg-transparent pr-4 md:pr-0 relative z-20">
                  <div className="w-16 h-16 rounded-full bg-surface-2 border border-surface-border flex items-center justify-center shadow-md group-hover:border-primary-500/50 group-hover:shadow-glow-primary transition-all">
                    <FileText className="text-primary-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Upload Resume</h4>
                    <p className="text-xs text-muted-color mt-1">Contextualize the AI</p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center gap-4 text-center group bg-surface-1 md:bg-transparent pr-4 md:pr-0 relative z-20">
                  <div className="w-16 h-16 rounded-full bg-surface-2 border border-surface-border flex items-center justify-center shadow-md group-hover:border-signal-500/50 group-hover:shadow-glow-signal transition-all">
                    <Mic className="text-signal-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Practice</h4>
                    <p className="text-xs text-muted-color mt-1">Live Audio/Video Session</p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center gap-4 text-center group bg-surface-1 md:bg-transparent pr-4 md:pr-0 relative z-20">
                  <div className="w-16 h-16 rounded-full bg-surface-2 border border-surface-border flex items-center justify-center shadow-md group-hover:border-accent-500/50 group-hover:shadow-glow-accent transition-all">
                    <BarChart2 className="text-accent-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Analyze</h4>
                    <p className="text-xs text-muted-color mt-1">Review Multimodal Scores</p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center gap-4 text-center group bg-surface-1 md:bg-transparent pr-4 md:pr-0 relative z-20">
                  <div className="w-16 h-16 rounded-full bg-surface-2 border border-surface-border flex items-center justify-center shadow-md group-hover:border-warning-500/50 group-hover:shadow-glow-warning transition-all">
                    <Trophy className="text-warning-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Improve &amp; Land</h4>
                    <p className="text-xs text-muted-color mt-1">Nail the real interview</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Section */}
            <div id="resume-upload">
              {profile && (
                <ResumeUpload user={profile} onUpdate={setProfile} />
              )}
            </div>

            <div id="reports" className="scroll-mt-10" />

            {/* Analysis & Chart Row */}
            {mounted && chartData.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Chart Section */}
                <div className="glass-card p-6 lg:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-secondary-color flex items-center gap-2">
                      <LineChartIcon size={16} className="text-primary-400" /> Multimodal Score Trend
                    </h3>
                    
                    {/* Interactive Legend */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => toggleChartFilter('overall')} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border transition-all ${chartFilters.overall ? 'bg-primary-900/30 border-primary-500/50 text-primary-300' : 'bg-surface-2 border-surface-border text-muted-color opacity-50'}`}>
                        Overall
                      </button>
                      <button onClick={() => toggleChartFilter('speech')} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border transition-all ${chartFilters.speech ? 'bg-signal-900/30 border-signal-500/50 text-signal-300' : 'bg-surface-2 border-surface-border text-muted-color opacity-50'}`}>
                        Speech
                      </button>
                      <button onClick={() => toggleChartFilter('face')} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border transition-all ${chartFilters.face ? 'bg-accent-900/30 border-accent-500/50 text-accent-300' : 'bg-surface-2 border-surface-border text-muted-color opacity-50'}`}>
                        Face
                      </button>
                      <button onClick={() => toggleChartFilter('answer')} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border transition-all ${chartFilters.answer ? 'bg-warning-900/30 border-warning-500/50 text-warning-300' : 'bg-surface-2 border-surface-border text-muted-color opacity-50'}`}>
                        Answer
                      </button>
                    </div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="session" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      
                      {chartFilters.overall && (
                        <Area type="monotone" dataKey="Overall" name="Overall" stroke="var(--color-primary-500)" fill="url(#gOverall)" strokeWidth={3} dot={{ fill: 'var(--color-primary-500)', strokeWidth: 0, r: 4 }} />
                      )}
                      {chartFilters.speech && (
                        <Line type="monotone" dataKey="Speech" name="Speech" stroke="var(--color-signal-500)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                      )}
                      {chartFilters.face && (
                        <Line type="monotone" dataKey="Face" name="Face" stroke="var(--color-accent-400)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                      )}
                      {chartFilters.answer && (
                        <Line type="monotone" dataKey="Answer" name="Answer" stroke="var(--color-warning-500)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Skill Breakdown */}
                <div className="glass-card p-6 lg:col-span-1 h-full flex flex-col">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-secondary-color mb-6 flex items-center gap-2">
                    <Target size={16} className="text-primary-400" /> Skill Breakdown
                  </h3>
                  
                  {reports.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-color">
                      No data to analyze
                    </div>
                  ) : (
                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-signal-300">Speech Clarity</span>
                          <span className="text-white font-mono">{avg(allSpeech)}</span>
                        </div>
                        <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-signal-500 rounded-full" style={{ width: `${avg(allSpeech)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-accent-300">Facial Composure</span>
                          <span className="text-white font-mono">{avg(allFace)}</span>
                        </div>
                        <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-500 rounded-full" style={{ width: `${avg(allFace)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-warning-300">STAR Structure</span>
                          <span className="text-white font-mono">{avg(allAnswer)}</span>
                        </div>
                        <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-warning-500 rounded-full" style={{ width: `${avg(allAnswer)}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Right-Rail or Above logs: Recent Results & Next Step */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-6">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-secondary-color mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-warning-400" /> Recent Results
                </h3>
                {recentResults.length === 0 ? (
                  <p className="text-sm text-muted-color">No recent results.</p>
                ) : (
                  <div className="space-y-3">
                    {recentResults.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2/50 border border-surface-border">
                        <div className="flex items-center gap-3">
                          <div className={`text-lg font-black font-mono w-10 text-center ${scoreGrade(r.overall_score)}`}>
                            {r.overall_score?.toFixed(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white capitalize">{r.session_category}</div>
                            <div className="text-[10px] text-muted-color">
                              {new Date(r.session_created_at || r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Link href={`/report/${r.session}`} className="btn btn-sm btn-ghost rounded-lg">View</Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:col-span-1 glass-card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary-900/20 to-transparent border-primary-500/20">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center mb-4">
                  <Bot size={24} />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Ready for the next round?</h4>
                <p className="text-xs text-secondary-color mb-4">Jump back into the simulator to improve your scores.</p>
                <Link href="/interview/live" className="btn btn-md btn-primary w-full">Start Practice</Link>
              </div>
            </div>

            {/* Sessions List */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-5 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-secondary-color flex items-center gap-2">
                    <FileText size={16} className="text-accent-400"/> Practice Logs
                  </h3>
                  <span className="text-xs font-bold text-surface-border hidden sm:inline">|</span>
                  <span className="text-xs font-bold text-secondary-color">
                    {reports.length} Session{reports.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Search and Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-color" />
                    <input 
                      type="text" 
                      placeholder="Search questions..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-surface-2 border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-muted-color focus:outline-none focus:border-primary-500 w-full sm:w-48 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-color" />
                    <select 
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-surface-2 border border-surface-border rounded-lg pl-8 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500 appearance-none transition-colors"
                    >
                      <option value="all">All Categories</option>
                      <option value="behavioral">Behavioral</option>
                      <option value="hr">HR</option>
                      <option value="technical">Technical</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-color pointer-events-none" />
                  </div>
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-signal-950/30 border border-signal-500/20 text-signal-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-glow-signal">
                    <Mic size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">No Practice Logs Yet</h4>
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
              ) : filteredReports.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-secondary-color">
                  No sessions match your filters.
                </div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {filteredReports.map((r) => {
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
          </section>

          {/* Section 3: UPCOMING */}
          <section id="upcoming" className="scroll-mt-10 space-y-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="border-b border-surface-border pb-4">
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <BookOpen className="text-primary-400" /> Coming Soon
              </h2>
              <p className="text-sm text-secondary-color mt-1">We are continuously expanding the platform. Here is a sneak peek at what&apos;s next.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ATS Resume Checker */}
              <div className="glass-card p-8 group relative overflow-hidden opacity-75">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
                  <FileSearch size={100} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-surface-border flex items-center justify-center mb-6 text-accent-400 shadow-sm relative z-10">
                  <FileSearch size={24} />
                </div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <h4 className="text-lg font-bold text-white">ATS Checker</h4>
                  <span className="text-[9px] font-bold uppercase border border-surface-border text-secondary-color px-1.5 py-0.5 rounded-md bg-surface-2">Soon</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-normal relative z-10 mb-6">
                  Upload your resume and get an instant ATS score. Identify missing keywords and formatting errors.
                </p>
                <button disabled className="btn btn-sm btn-secondary w-full opacity-50 cursor-not-allowed">Coming Soon</button>
              </div>

              {/* ATS Resume Builder */}
              <div className="glass-card p-8 group relative overflow-hidden opacity-75">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
                  <FileEdit size={100} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-surface-border flex items-center justify-center mb-6 text-primary-400 shadow-sm relative z-10">
                  <FileEdit size={24} />
                </div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <h4 className="text-lg font-bold text-white">ATS Builder</h4>
                  <span className="text-[9px] font-bold uppercase border border-surface-border text-secondary-color px-1.5 py-0.5 rounded-md bg-surface-2">Soon</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-normal relative z-10 mb-6">
                  Build a highly optimized, ATS-friendly resume from scratch using our AI-guided templates.
                </p>
                <button disabled className="btn btn-sm btn-secondary w-full opacity-50 cursor-not-allowed">Coming Soon</button>
              </div>

              {/* Aptitude Tests */}
              <div className="glass-card p-8 group relative overflow-hidden opacity-75">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
                  <ChartIcon size={100} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-surface-border flex items-center justify-center mb-6 text-warning-400 shadow-sm relative z-10">
                  <ChartIcon size={24} />
                </div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <h4 className="text-lg font-bold text-white">Aptitude Tests</h4>
                  <span className="text-[9px] font-bold uppercase border border-surface-border text-secondary-color px-1.5 py-0.5 rounded-md bg-surface-2">Soon</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-normal relative z-10 mb-6">
                  Prepare for the initial screening rounds with our comprehensive suite of aptitude assessments.
                </p>
                <button disabled className="btn btn-sm btn-secondary w-full opacity-50 cursor-not-allowed">Coming Soon</button>
              </div>
            </div>
          </section>
          
          <Footer />
        </div>
      </main>
    </div>
  );
}
