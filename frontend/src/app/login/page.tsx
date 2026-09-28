'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, AuthResponse } from '@/lib/api';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

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
    <main className="min-h-screen-dvh flex flex-col justify-between font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-30 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-surface-0/60 z-0 pointer-events-none" />

      <div className="ambient-blob absolute w-[400px] h-[400px] bg-primary-500/20 top-[-100px] left-1/2 -translate-x-1/2" />
      <div className="ambient-blob absolute w-[300px] h-[300px] bg-signal-500/10 bottom-[-50px] right-[-50px]" />

      <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <Logo />
          </div>
          <p className="mt-2 text-xs text-secondary-color font-normal">
            Sign in to access your AI coaching studio
          </p>
        </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-card py-8 px-6 sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-color mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-color mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-glow w-full"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard →'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-secondary-color">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-brand hover:text-primary-300 transition">
              Create an account
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
