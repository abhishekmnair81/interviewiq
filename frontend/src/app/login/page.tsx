'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, AuthResponse } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch<AuthResponse>('/users/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900 font-sans relative overflow-hidden">
      {}
      <div className="ambient-blur w-[400px] h-[400px] bg-indigo-200/50 top-[-100px] left-1/2 -translate-x-1/2" />
      <div className="ambient-blur w-[300px] h-[300px] bg-emerald-200/40 bottom-[-50px] right-[-50px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 shadow-md shadow-indigo-600/20 mb-4">
          <span className="text-xl font-black text-white">IQ</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Welcome to Interview<span className="text-indigo-600">IQ</span>
        </h1>
        <p className="mt-2 text-xs text-slate-600 font-normal">
          Sign in to access your AI coaching studio
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-card py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/90 shadow-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-xs outline-none transition shadow-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-xs outline-none transition shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 btn-primary font-black rounded-2xl text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard →'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
