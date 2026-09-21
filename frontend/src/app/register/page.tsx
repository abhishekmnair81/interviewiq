'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, AuthResponse } from '@/lib/api';

const PROFESSIONAL_FIELDS = [
  { value: 'Software Engineer',      label: 'Software Engineer',       icon: '💻', color: 'from-violet-500 to-indigo-600' },
  { value: 'Data Scientist',         label: 'Data Scientist',          icon: '📊', color: 'from-blue-500 to-cyan-600' },
  { value: 'Product Manager',        label: 'Product Manager',         icon: '🗂️', color: 'from-orange-500 to-amber-600' },
  { value: 'Cybersecurity Analyst',  label: 'Cybersecurity',           icon: '🔐', color: 'from-red-500 to-rose-600' },
  { value: 'DevOps Engineer',        label: 'DevOps Engineer',         icon: '⚙️', color: 'from-slate-500 to-gray-700' },
  { value: 'AI/ML Engineer',         label: 'AI / ML Engineer',        icon: '🤖', color: 'from-purple-500 to-fuchsia-600' },
  { value: 'Civil Engineer',         label: 'Civil Engineer',          icon: '🏗️', color: 'from-yellow-600 to-orange-700' },
  { value: 'Mechanical Engineer',    label: 'Mechanical Engineer',     icon: '🔧', color: 'from-emerald-500 to-teal-600' },
  { value: 'Electrical Engineer',    label: 'Electrical Engineer',     icon: '⚡', color: 'from-yellow-400 to-amber-500' },
  { value: 'Chemical Engineer',      label: 'Chemical Engineer',       icon: '🧪', color: 'from-green-500 to-emerald-700' },
  { value: 'Electronics Engineer',   label: 'Electronics Engineer',    icon: '📡', color: 'from-sky-500 to-blue-700' },
  { value: 'Biomedical Engineer',    label: 'Biomedical Engineer',     icon: '🧬', color: 'from-pink-500 to-rose-700' },
  { value: 'Finance & Accounting',   label: 'Finance & Accounting',    icon: '💹', color: 'from-lime-500 to-green-700' },
  { value: 'Marketing & Sales',      label: 'Marketing & Sales',       icon: '📣', color: 'from-orange-400 to-pink-600' },
  { value: 'Human Resources',        label: 'Human Resources',         icon: '🤝', color: 'from-teal-500 to-cyan-700' },
  { value: 'Healthcare / Medicine',  label: 'Healthcare',              icon: '🏥', color: 'from-red-400 to-pink-500' },
  { value: 'Law / Legal',            label: 'Law / Legal',             icon: '⚖️', color: 'from-stone-500 to-slate-700' },
  { value: 'Education / Teaching',   label: 'Education',               icon: '📚', color: 'from-amber-500 to-yellow-600' },
  { value: 'Architecture & Design',  label: 'Architecture & Design',   icon: '🏛️', color: 'from-indigo-400 to-violet-600' },
  { value: 'Business Management',    label: 'Business Management',     icon: '📈', color: 'from-cyan-500 to-blue-600' },
];

type Step = 'details' | 'field';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) router.push('/dashboard');
  }, [router]);

  const handleDetailsNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/\d/.test(password)) { setError('Password must contain at least one number'); return; }
    setStep('field');
  };

  const handleSubmit = async () => {
    if (!selectedField) { setError('Please select your professional field'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<AuthResponse>('/users/register/', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          password_confirm: passwordConfirm,
          professional_field: selectedField,
        }),
      });
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col justify-center py-10 px-4 relative overflow-hidden">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-cyan-600/8 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <span className="text-2xl font-black text-white">IQ</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Join Interview<span className="text-indigo-400">IQ</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">AI-powered interview coaching tailored to your career</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          {(['details', 'field'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
                ${step === s ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-110'
                  : i < (['details','field'] as Step[]).indexOf(step) ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                {i < (['details','field'] as Step[]).indexOf(step) ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-semibold ${step === s ? 'text-white' : 'text-slate-500'}`}>
                {s === 'details' ? 'Your Details' : 'Your Field'}
              </span>
              {i < 1 && <div className={`w-12 h-px ${step === 'field' ? 'bg-indigo-500' : 'bg-white/10'} transition-all duration-500`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center max-w-md mx-auto">
            ⚠️ {error}
          </div>
        )}

        {step === 'details' && (
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6">Create your account</h2>
            <form className="space-y-5" onSubmit={handleDetailsNext}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
                <input
                  type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/8 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                  placeholder="Alex Mercer"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/8 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Password</label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/8 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                  placeholder="Min 8 chars with a number"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Confirm Password</label>
                <input
                  type="password" required value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-3 bg-white/8 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-500/30 transition-all duration-200 mt-2">
                Continue →
              </button>
            </form>
            <div className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition">Sign in</Link>
            </div>
          </div>
        )}

        {step === 'field' && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-white">What&apos;s your professional field?</h2>
              <p className="text-slate-400 text-sm mt-2">
                Your interviews will be personalised based on your career domain
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
              {PROFESSIONAL_FIELDS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSelectedField(f.value)}
                  className={`relative group flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all duration-200 cursor-pointer
                    ${selectedField === f.value
                      ? 'border-indigo-500/80 bg-indigo-500/15 shadow-lg shadow-indigo-500/20 scale-105'
                      : 'border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/8 hover:scale-102'
                    }`}
                >
                  {selectedField === f.value && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✓</div>
                  )}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-xl shadow-md`}>
                    {f.icon}
                  </div>
                  <span className={`text-[11px] font-semibold text-center leading-tight transition-colors
                    ${selectedField === f.value ? 'text-indigo-300' : 'text-slate-300 group-hover:text-white'}`}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 max-w-sm mx-auto">
              <button
                onClick={() => setStep('details')}
                className="flex-1 py-3 border border-white/15 hover:border-white/25 text-slate-300 hover:text-white font-semibold rounded-2xl text-sm transition-all duration-200">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedField || loading}
                className="flex-[2] py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-500/30 transition-all duration-200">
                {loading ? 'Creating Account...' : selectedField ? `Join as ${selectedField.split(' ')[0]} →` : 'Select a Field First'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
