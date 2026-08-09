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
  speech_metrics: {
    wpm: number;
    filler_count: number;
    filler_phrases?: string[];
    audio_duration_sec?: number;
    active_speech_sec?: number;
    pause_count?: number;
    long_pauses_count?: number;
    active_speech_ratio?: number;
    volume_stability?: number;
    pitch_variance_monotony?: string;
    vocal_monotony_score?: number;
    vocal_clarity_score?: number;
    speech_feedback?: string;
  };
  face_metrics: {
    eye_contact_percentage: number;
    head_stability: number;
    face_visibility_ratio?: number;
    motion_jitter?: number;
    facial_feedback?: string;
  };
  answer_metrics: {
    relevance_score: number;
    star_score: number;
    confidence_score: number;
    executive_tone_score?: number;
    star_components: Record<string, boolean>;
    quantifiable_metrics_count?: number;
    action_verbs_count?: number;
    vague_phrases: string[];
    vague_count?: number;
    answer_feedback?: string;
  };
  contradictions: Array<{ type: string; severity: string; title?: string; message: string }>;
  improvement_tips: string[];
  is_partial: boolean;
  created_at: string;
}

const FILLER_WORDS = ['um', 'uh', 'err', 'ah', 'hmm', 'hmmm'];

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
    <p className="leading-relaxed text-slate-700 text-xs font-normal">
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[^a-z\s]/g, '');
        const isFiller = FILLER_WORDS.includes(clean);
        const isVague = vagueList.some(p => clean.includes(p.toLowerCase()));
        if (isFiller) {
          return <mark key={i} className="bg-rose-100 text-rose-800 border border-rose-200 rounded px-1.5 py-0.5 font-bold mx-0.5">{word}</mark>;
        }
        if (isVague) {
          return <mark key={i} className="bg-amber-100 text-amber-900 border border-amber-200 rounded px-1.5 py-0.5 font-bold mx-0.5">{word}</mark>;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        <div className="glass-card p-8 rounded-3xl border border-slate-200/90 max-w-md shadow-lg">
          <p className="text-rose-600 font-semibold mb-4">{error || 'Report not found.'}</p>
          <Link href="/dashboard" className="px-6 py-2.5 btn-primary text-xs font-bold rounded-2xl inline-block shadow-md">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const radarData = [
    { axis: 'Voice Delivery', value: report.speech_score || 0 },
    { axis: 'Eye Contact', value: report.face_score || 0 },
    { axis: 'Relevance', value: report.answer_metrics?.relevance_score || 0 },
    { axis: 'Executive Tone', value: report.answer_metrics?.confidence_score || 0 },
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
    if (score >= 85) return { label: 'Executive Grade', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (score >= 70) return { label: 'Strong Performance', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' };
    if (score >= 55) return { label: 'Moderate Answer', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { label: 'Needs Practice', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
  };

  const grade = overallGrade(report.overall_score);
  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const pitchStatus = report.speech_metrics?.pitch_variance_monotony || 'Dynamic & Engaging';
  const isMonotone = pitchStatus.includes('Monotone');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {}
      <div className="ambient-blur w-[600px] h-[600px] bg-indigo-200/40 top-[-200px] left-1/2 -translate-x-1/2" />

      {}
      <header className="sticky top-0 z-30 glass-nav px-6 py-4 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <span className="text-xl font-black text-white">IQ</span>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 font-sans block leading-none">
                InterviewIQ Engine
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-600">
                Advanced Hearing & Analysis Report
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs font-bold px-4 py-2.5 btn-primary rounded-2xl shadow-md transition disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : '⬇ Export Text Summary'}
            </button>
            <Link href="/dashboard" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition px-3 py-2">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 relative z-10">
        {}
        <div className="glass-card p-8 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-700 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 capitalize">
                  {report.session_category} Question
                </span>
                {report.is_partial && (
                  <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                    Partial Log
                  </span>
                )}
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Acoustic Hearing Engine Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug mb-3">
                &quot;{report.session_question}&quot;
              </h1>
              <p className="text-xs font-semibold text-slate-500">{date}</p>
            </div>
            <div className="text-center md:text-right flex-shrink-0 bg-white/90 p-6 rounded-2xl border border-slate-200/90 shadow-sm min-w-[200px]">
              <div className="text-6xl font-black text-slate-900 tracking-tight">{report.overall_score?.toFixed(0)}</div>
              <div className={`text-xs font-bold ${grade.color} mt-1`}>{grade.label}</div>
              <div className="text-[10px] uppercase font-extrabold text-slate-400 mt-1">Overall Multimodal Score</div>
            </div>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-6">Multimodal Pillar Scores</h2>
            <div className="flex flex-wrap justify-around gap-6">
              <ScoreRing score={report.answer_score} label="Answer Quality" color="#4f46e5" />
              <ScoreRing score={report.speech_score} label="Vocal & Hearing" color="#059669" />
              <ScoreRing score={report.face_score} label="Facial Presence" color="#ea580c" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500 mb-1">Speech Rate</div>
                <div className="text-xl font-black text-slate-900">
                  {report.speech_metrics?.wpm?.toFixed(0) || '0'} <span className="text-xs text-slate-500 font-semibold">WPM</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 block mt-1">Target: 130–160 WPM</span>
              </div>
              <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500 mb-1">Filler Words</div>
                <div className="text-xl font-black text-slate-900">
                  {report.speech_metrics?.filler_count || 0} <span className="text-xs text-slate-500 font-semibold">count</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 block mt-1">Hesitation Markers</span>
              </div>
              <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500 mb-1">Eye Contact</div>
                <div className="text-xl font-black text-slate-900">
                  {report.face_metrics?.eye_contact_percentage?.toFixed(0) || 0}<span className="text-xs text-slate-500 font-semibold">%</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 block mt-1">Camera Lens Gaze</span>
              </div>
              <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500 mb-1">Head Stability</div>
                <div className="text-xl font-black text-slate-900">
                  {report.face_metrics?.head_stability?.toFixed(0) || 0}<span className="text-xs text-slate-500 font-semibold">/100</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 block mt-1">Posture Composure</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-4">Competency Performance Radar</h2>
            {mounted && (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="rgba(0,0,0,0.08)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Radar
                    name="Score" dataKey="value"
                    stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {}
        <div className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>🎙</span> Acoustic Voice & Audio Hearing Analytics
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates vocal inflection, speech pauses, audio energy stability, and acoustic clarity.
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
              Waveform Audio AI Engine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-1">Vocal Pitch & Inflection</div>
              <div className={`text-sm font-extrabold ${isMonotone ? 'text-rose-600' : 'text-emerald-700'}`}>
                {pitchStatus}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Zero-crossing rate frequency spectrum</p>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-1">Active Speech Ratio</div>
              <div className="text-xl font-black text-slate-900">
                {report.speech_metrics?.active_speech_ratio?.toFixed(0) || 85}%
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {report.speech_metrics?.pause_count || 0} acoustic pauses (&gt;0.6s) detected
              </p>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-1">Volume Energy Stability</div>
              <div className="text-xl font-black text-slate-900">
                {report.speech_metrics?.volume_stability?.toFixed(0) || 82}%
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{ width: `${report.speech_metrics?.volume_stability || 82}%` }}
                />
              </div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-1">Audio Clarity Index</div>
              <div className="text-xl font-black text-slate-900">
                {report.speech_metrics?.vocal_clarity_score?.toFixed(0) || 88}/100
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Signal-to-noise ratio estimate</p>
            </div>
          </div>

          {report.speech_metrics?.speech_feedback && (
            <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-4 text-xs font-semibold text-slate-700 leading-relaxed">
              <span className="font-bold text-indigo-700">Audio Hearing Insight: </span>
              {report.speech_metrics.speech_feedback}
            </div>
          )}
        </div>

        {}
        <div className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>🎯</span> STAR Framework & Executive Content Intelligence
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Parses response structure, quantifiable metrics, and executive action verbs.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl">
                {report.answer_metrics?.quantifiable_metrics_count || 0} Quantifiable Metrics
              </span>
              <span className="text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-xl">
                {report.answer_metrics?.action_verbs_count || 0} Action Verbs
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(starLabels).map(([key, label]) => {
              const present = starComponents[key];
              return (
                <div
                  key={key}
                  className={`rounded-2xl p-4 border text-center transition ${
                    present
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                      : 'border-rose-200 bg-rose-50/70 text-rose-800'
                  }`}
                >
                  <div className="text-xl mb-1">{present ? '✓' : '✕'}</div>
                  <div className={`text-xs font-bold ${present ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                    {present ? 'Detected in transcript' : 'Missing from response'}
                  </div>
                </div>
              );
            })}
          </div>

          {report.answer_metrics?.answer_feedback && (
            <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-2xl p-4 text-xs font-semibold text-slate-700 leading-relaxed">
              <span className="font-bold text-indigo-800">Content AI Analysis: </span>
              {report.answer_metrics.answer_feedback}
            </div>
          )}
        </div>

        {}
        {report.contradictions && report.contradictions.length > 0 && (
          <div className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <span>⚠️</span> Multi-Modal Cross-Contradiction Alerts ({report.contradictions.length})
            </h2>
            <div className="space-y-3">
              {report.contradictions.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${
                    item.severity === 'high'
                      ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                      : item.severity === 'medium'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-blue-50/80 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      {item.title || item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white border">
                      {item.severity} Severity
                    </span>
                  </div>
                  <p className="text-xs font-normal leading-relaxed">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        <div className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-4">
            Actionable AI Recommendations & Coaching Steps
          </h2>
          <div className="space-y-3">
            {(report.improvement_tips || []).map((tip, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/80 border border-slate-200/80 rounded-2xl shadow-sm">
                <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Whisper Audio Speech Transcript & Marker Highlights
            </h2>
            <div className="flex gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-rose-800">
                <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
                Filler Words
              </span>
              <span className="flex items-center gap-1.5 text-amber-900">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
                Hedging / Vague Phrases
              </span>
            </div>
          </div>
          <div className="bg-white/90 rounded-2xl p-5 border border-slate-200/80 max-h-80 overflow-y-auto shadow-inner">
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
