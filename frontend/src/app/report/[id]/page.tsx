'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import { apiFetch } from '@/lib/api';

interface Report {
  id: string;
  session: string;
  session_question: string;
  session_category: string;
  session_created_at: string;
  speech_score: number;
  face_score: number;
  answer_score: number;
  overall_score: number;
  transcript: string;
  speech_metrics: { wpm: number; filler_count: number };
  face_metrics: { eye_contact_percentage: number; head_stability: number };
  answer_metrics: {
    relevance_score: number;
    star_score: number;
    confidence_score: number;
    star_components: Record<string, boolean>;
    vague_phrases: string[];
  };
  contradictions: Array<{ type: string; severity: string; message: string }>;
  improvement_tips: string[];
  is_partial: boolean;
  created_at: string;
}

const FILLER_WORDS = ['um', 'uh', 'like', 'basically', 'literally', 'err', 'ah', 'hmm', 'right'];

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const offset = circ - ((score || 0) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-slate-900">
          {score?.toFixed(0) || 0}
        </span>
      </div>
      <span className="text-xs text-slate-600 font-bold tracking-tight text-center">{label}</span>
    </div>
  );
}

function HighlightedTranscript({ text, vagueList }: { text: string; vagueList: string[] }) {
  if (!text) return <p className="text-slate-500 italic text-sm">No speech recorded in session.</p>;

  const words = text.split(/(\s+)/);

  return (
    <p className="leading-relaxed text-slate-700 text-sm font-normal">
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[^a-z\s]/g, '');
        const isFiller = FILLER_WORDS.includes(clean);
        const isVague = vagueList.some(p => clean.includes(p.toLowerCase()));
        if (isFiller) {
          return <mark key={i} className="bg-rose-100 text-rose-800 rounded px-1 font-bold">{word}</mark>;
        }
        if (isVague) {
          return <mark key={i} className="bg-amber-100 text-amber-900 rounded px-1 font-bold">{word}</mark>;
        }
        return <span key={i}>{word}</span>;
      })}
    </p>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    apiFetch<Report>(`/reports/by-session/${sessionId}/`)
      .then(setReport)
      .catch(() => setError('Report not found or still being processed.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
      const res = await fetch(`${API}/reports/${report.id}/pdf/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `InterviewIQ_Report_${sessionId.slice(0, 8)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="glass-card p-8 rounded-3xl border border-slate-200/80 max-w-md shadow-lg">
          <p className="text-rose-600 font-semibold mb-4">{error || 'Report not found.'}</p>
          <Link href="/dashboard" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-md inline-block">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const radarData = [
    { axis: 'Speech', value: report.speech_score || 0 },
    { axis: 'Eye Contact', value: report.face_score || 0 },
    { axis: 'Relevance', value: report.answer_metrics?.relevance_score || 0 },
    { axis: 'Confidence', value: report.answer_metrics?.confidence_score || 0 },
    { axis: 'STAR Structure', value: report.answer_metrics?.star_score || 0 },
  ];

  const starComponents = report.answer_metrics?.star_components || {};
  const starLabels: Record<string, string> = {
    situation: 'Situation',
    task: 'Task',
    action: 'Action',
    result: 'Result',
  };

  const overallGrade = (score: number) => {
    if (score >= 85) return { label: 'Strong Performance', color: 'text-emerald-600' };
    if (score >= 70) return { label: 'Good Effort', color: 'text-indigo-600' };
    if (score >= 55) return { label: 'Moderate Answer', color: 'text-amber-600' };
    return { label: 'Needs Improvement', color: 'text-rose-600' };
  };

  const grade = overallGrade(report.overall_score);
  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {/* Background Soft Glows */}
      <div className="ambient-blur w-[600px] h-[600px] bg-indigo-200/40 top-[-200px] left-1/2 -translate-x-1/2" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-30 glass-nav px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-xl font-black text-white">IQ</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
              Analysis Report
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg transition disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : '⬇ Export Text Summary'}
            </button>
            <Link href="/dashboard" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition px-3 py-2">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Report Body */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 relative z-10">
        {/* Banner Header */}
        <div className="glass-card p-8 rounded-3xl border border-slate-200/80">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 capitalize">
                  {report.session_category} Question
                </span>
                {report.is_partial && (
                  <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                    Partial
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug mb-3">
                &quot;{report.session_question}&quot;
              </h1>
              <p className="text-xs font-semibold text-slate-500">{date}</p>
            </div>
            <div className="text-center md:text-right flex-shrink-0 bg-white/90 p-6 rounded-2xl border border-slate-200/90 shadow-sm">
              <div className="text-6xl font-black text-slate-900 tracking-tight">{report.overall_score?.toFixed(0)}</div>
              <div className={`text-sm font-bold ${grade.color} mt-1`}>{grade.label}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Overall AI Score</div>
            </div>
          </div>
        </div>

        {/* Score Breakdown Rings & Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">Score Distribution</h2>
            <div className="flex flex-wrap justify-around gap-6">
              <ScoreRing score={report.answer_score} label="Answer Quality" color="#4f46e5" />
              <ScoreRing score={report.speech_score} label="Speech Delivery" color="#059669" />
              <ScoreRing score={report.face_score} label="Facial Presence" color="#ea580c" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { label: 'WPM Speed', value: report.speech_metrics?.wpm?.toFixed(0) || '0', unit: 'wpm' },
                { label: 'Filler Words', value: report.speech_metrics?.filler_count || 0, unit: 'count' },
                { label: 'Eye Contact', value: `${report.face_metrics?.eye_contact_percentage?.toFixed(0) || 0}`, unit: '%' },
                { label: 'Head Stability', value: report.face_metrics?.head_stability?.toFixed(0) || 0, unit: '/100' },
              ].map(m => (
                <div key={m.label} className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 mb-1">{m.label}</div>
                  <div className="text-xl font-black text-slate-900">
                    {m.value}<span className="text-xs text-slate-500 ml-1 font-semibold">{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-200/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Performance Radar</h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="rgba(0,0,0,0.08)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#475569', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Radar
                  name="Score" dataKey="value"
                  stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STAR Method Analysis */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">STAR Framework Structure</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(starLabels).map(([key, label]) => {
              const present = starComponents[key];
              return (
                <div
                  key={key}
                  className={`rounded-2xl p-4 border text-center ${
                    present
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-rose-200 bg-rose-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{present ? '✓' : '✗'}</div>
                  <div className={`text-xs font-bold ${present ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold">{present ? 'Detected' : 'Missing'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actionable Improvement Tips */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Actionable AI Recommendations
          </h2>
          <div className="space-y-3">
            {(report.improvement_tips || []).map((tip, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/80 border border-slate-200/80 rounded-2xl shadow-sm">
                <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-normal">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Highlighted Transcript */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Whisper Audio Speech Transcript
          </h2>
          <div className="bg-white/80 rounded-2xl p-5 border border-slate-200/80 max-h-72 overflow-y-auto shadow-inner">
            <HighlightedTranscript
              text={report.transcript}
              vagueList={report.answer_metrics?.vague_phrases || []}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
