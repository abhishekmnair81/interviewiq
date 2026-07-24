'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, Tooltip
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
const VAGUE_PHRASES = ['i think', 'maybe', 'kind of', 'kinda', 'sort of', 'i guess', 'probably', 'i suppose'];

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
          {score?.toFixed(0)}
        </span>
      </div>
      <span className="text-xs text-slate-400 font-medium text-center">{label}</span>
    </div>
  );
}

function HighlightedTranscript({ text, vagueList }: { text: string; vagueList: string[] }) {
  if (!text) return <p className="text-slate-500 italic">No transcript available.</p>;

  const allFlags = [...FILLER_WORDS, ...vagueList.map(p => p.toLowerCase())];
  const words = text.split(/(\s+)/);

  return (
    <p className="leading-8 text-slate-300 text-sm">
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[^a-z\s]/g, '');
        const isFiller = FILLER_WORDS.includes(clean);
        const isVague = vagueList.some(p => clean.includes(p.toLowerCase()));
        if (isFiller) {
          return <mark key={i} className="bg-rose-500/30 text-rose-300 rounded px-0.5 mx-0.5">{word}</mark>;
        }
        if (isVague) {
          return <mark key={i} className="bg-amber-500/25 text-amber-300 rounded px-0.5 mx-0.5">{word}</mark>;
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
      .catch(() => setError('Report not found or still being generated.'))
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading your analysis report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-rose-400 text-lg mb-4">{error || 'Report not found.'}</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">← Back to Dashboard</Link>
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

  const severityColor: Record<string, string> = {
    high: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    medium: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    low: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  };

  const starComponents = report.answer_metrics?.star_components || {};
  const starLabels: Record<string, string> = {
    situation: 'Situation',
    task: 'Task',
    action: 'Action',
    result: 'Result',
  };

  const overallGrade = (score: number) => {
    if (score >= 85) return { label: 'Excellent', color: 'text-emerald-400' };
    if (score >= 70) return { label: 'Good', color: 'text-blue-400' };
    if (score >= 55) return { label: 'Average', color: 'text-amber-400' };
    return { label: 'Needs Work', color: 'text-rose-400' };
  };

  const grade = overallGrade(report.overall_score);
  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          InterviewIQ
        </Link>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : '⬇ Export Report'}
          </button>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 transition">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {report.session_category} Question
                </span>
                {report.is_partial && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Partial Analysis
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white leading-snug mb-3">
                "{report.session_question}"
              </h1>
              <p className="text-sm text-slate-500">{date}</p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-6xl font-black text-white">{report.overall_score?.toFixed(0)}</div>
              <div className={`text-lg font-bold ${grade.color}`}>{grade.label}</div>
              <div className="text-xs text-slate-500 mt-1">Overall Score</div>
            </div>
          </div>
        </div>

        {/* Score Rings + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Rings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">Score Breakdown</h2>
            <div className="flex flex-wrap justify-around gap-6">
              <ScoreRing score={report.answer_score} label="Answer Quality" color="#818cf8" />
              <ScoreRing score={report.speech_score} label="Speech Delivery" color="#34d399" />
              <ScoreRing score={report.face_score} label="Facial Presence" color="#fb923c" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { label: 'WPM', value: report.speech_metrics?.wpm?.toFixed(0), unit: 'wpm', ideal: '130–160' },
                { label: 'Filler Words', value: report.speech_metrics?.filler_count, unit: 'detected' },
                { label: 'Eye Contact', value: `${report.face_metrics?.eye_contact_percentage?.toFixed(0)}`, unit: '%' },
                { label: 'Head Stability', value: report.face_metrics?.head_stability?.toFixed(0), unit: '/100' },
              ].map(m => (
                <div key={m.label} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">{m.label}</div>
                  <div className="text-xl font-bold text-white">
                    {m.value}<span className="text-sm text-slate-400 ml-1">{m.unit}</span>
                  </div>
                  {m.ideal && <div className="text-xs text-slate-600 mt-0.5">Ideal: {m.ideal}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Performance Radar</h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
                <Radar
                  name="Score" dataKey="value"
                  stroke="#818cf8" fill="#818cf8" fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STAR Structure */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">STAR Method Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(starLabels).map(([key, label]) => {
              const present = starComponents[key];
              return (
                <div
                  key={key}
                  className={`rounded-xl p-4 border text-center ${
                    present
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-rose-500/30 bg-rose-500/05'
                  }`}
                >
                  <div className="text-2xl mb-1">{present ? '✓' : '✗'}</div>
                  <div className={`text-sm font-bold ${present ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {label}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{present ? 'Detected' : 'Missing'}</div>
                </div>
              );
            })}
          </div>
          {(report.answer_metrics?.vague_phrases?.length ?? 0) > 0 && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-xs font-bold text-amber-400 mb-2">Vague phrases detected:</p>
              <div className="flex flex-wrap gap-2">
                {report.answer_metrics.vague_phrases.map((p, i) => (
                  <span key={i} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                    "{p}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contradictions */}
        {report.contradictions?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              ⚡ Cross-Modal Contradictions Detected
            </h2>
            <div className="space-y-3">
              {report.contradictions.map((c, i) => (
                <div key={i} className={`border rounded-xl p-4 ${severityColor[c.severity]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {c.severity} severity
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{c.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Tips */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Actionable Improvement Tips
          </h2>
          <div className="space-y-3">
            {(report.improvement_tips || []).map((tip, i) => (
              <div key={i} className="flex gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Highlighted Transcript */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Transcript — Word Analysis
            </h2>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500/40 inline-block" />
                <span className="text-slate-400">Filler word</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500/30 inline-block" />
                <span className="text-slate-400">Vague phrase</span>
              </span>
            </div>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-5 max-h-72 overflow-y-auto">
            <HighlightedTranscript
              text={report.transcript}
              vagueList={report.answer_metrics?.vague_phrases || []}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pb-8">
          <Link
            href="/record"
            className="flex-1 text-center py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition"
          >
            🎙️ Practice Again
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 text-center py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
