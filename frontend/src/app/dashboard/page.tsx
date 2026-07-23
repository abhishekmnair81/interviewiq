'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, UserProfile } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiFetch<UserProfile>('/users/profile/');
        setProfile(data);
      } catch (err) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await apiFetch('/users/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      } catch (err) {
        // ignore logout API failures
      }
    }
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          InterviewIQ
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-400">{profile?.full_name || profile?.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-10 px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white mb-2">
              Welcome back, {profile?.full_name || 'Candidate'}!
            </h2>
            <p className="text-slate-400">
              Multimodal AI Interview Coaching Dashboard — Speech, Facial & Quality Analysis
            </p>
          </div>
          <Link
            href="/record"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition"
          >
            🎙️ New Practice Session
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <div className="text-blue-400 text-sm font-semibold mb-1">Speech Analysis</div>
            <div className="text-2xl font-bold">Whisper + Librosa</div>
            <p className="text-xs text-slate-400 mt-2">Pacing, pitch & filler words detection</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <div className="text-purple-400 text-sm font-semibold mb-1">Facial Analysis</div>
            <div className="text-2xl font-bold">MediaPipe + DeepFace</div>
            <p className="text-xs text-slate-400 mt-2">Eye contact, confidence & expression score</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <div className="text-indigo-400 text-sm font-semibold mb-1">Answer Quality</div>
            <div className="text-2xl font-bold">BERT + Sentence-Transformers</div>
            <p className="text-xs text-slate-400 mt-2">STAR framework compliance & clarity score</p>
          </div>
        </div>
      </main>
    </div>
  );
}
