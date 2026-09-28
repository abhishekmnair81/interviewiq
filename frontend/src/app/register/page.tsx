'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, AuthResponse } from '@/lib/api';

import { Terminal, Database, Folder, Shield, Settings, Bot, Building2, Wrench, Zap, FlaskConical, Radio, Dna, PieChart, Megaphone, Users, Stethoscope, Scale, BookOpen, PenTool, LineChart } from 'lucide-react';

const PROFESSIONAL_FIELDS = [
  { value: 'Software Engineer',      label: 'Software Engineer',       icon: <Terminal size={20}/> },
  { value: 'Data Scientist',         label: 'Data Scientist',          icon: <Database size={20}/> },
  { value: 'Product Manager',        label: 'Product Manager',         icon: <Folder size={20}/> },
  { value: 'Cybersecurity Analyst',  label: 'Cybersecurity',           icon: <Shield size={20}/> },
  { value: 'DevOps Engineer',        label: 'DevOps Engineer',         icon: <Settings size={20}/> },
  { value: 'AI/ML Engineer',         label: 'AI / ML Engineer',        icon: <Bot size={20}/> },
  { value: 'Civil Engineer',         label: 'Civil Engineer',          icon: <Building2 size={20}/> },
  { value: 'Mechanical Engineer',    label: 'Mechanical Engineer',     icon: <Wrench size={20}/> },
  { value: 'Electrical Engineer',    label: 'Electrical Engineer',     icon: <Zap size={20}/> },
  { value: 'Chemical Engineer',      label: 'Chemical Engineer',       icon: <FlaskConical size={20}/> },
  { value: 'Electronics Engineer',   label: 'Electronics Engineer',    icon: <Radio size={20}/> },
  { value: 'Biomedical Engineer',    label: 'Biomedical Engineer',     icon: <Dna size={20}/> },
  { value: 'Finance & Accounting',   label: 'Finance & Accounting',    icon: <PieChart size={20}/> },
  { value: 'Marketing & Sales',      label: 'Marketing & Sales',       icon: <Megaphone size={20}/> },
  { value: 'Human Resources',        label: 'Human Resources',         icon: <Users size={20}/> },
  { value: 'Healthcare / Medicine',  label: 'Healthcare',              icon: <Stethoscope size={20}/> },
  { value: 'Law / Legal',            label: 'Law / Legal',             icon: <Scale size={20}/> },
  { value: 'Education / Teaching',   label: 'Education',               icon: <BookOpen size={20}/> },
  { value: 'Architecture & Design',  label: 'Architecture & Design',   icon: <PenTool size={20}/> },
  { value: 'Business Management',    label: 'Business Management',     icon: <LineChart size={20}/> },
];

type Step = 'details' | 'field';

import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

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

  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = calculateStrength(password);
  const strengthColors = ['bg-error-500', 'bg-error-400', 'bg-warning-400', 'bg-accent-400', 'bg-signal-400'];

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
    <main className="min-h-screen-dvh flex flex-col justify-between py-10 px-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-noise opacity-30 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-surface-0/60 z-0 pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="ambient-blob top-[-20%] left-[10%] w-[500px] h-[500px] bg-primary-600/20" />
        <div className="ambient-blob bottom-[-10%] right-[5%] w-[400px] h-[400px] bg-primary-400/20" />
        <div className="ambient-blob top-[40%] left-[50%] w-[300px] h-[300px] bg-signal-500/10" />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="relative z-10 w-full max-w-4xl mx-auto">

          <div className="text-center mb-8 flex flex-col items-center">
            <div className="mb-4">
              <Logo />
            </div>
            <p className="mt-2 text-sm text-secondary-color">AI-powered interview coaching tailored to your career</p>
          </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          {(['details', 'field'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
                ${step === s ? 'bg-primary-500 text-white shadow-glow-primary scale-110'
                  : i < (['details','field'] as Step[]).indexOf(step) ? 'bg-accent-500 text-white shadow-glow-accent' : 'bg-surface-2 text-muted-color'}`}>
                {i < (['details','field'] as Step[]).indexOf(step) ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-semibold ${step === s ? 'text-primary-color' : 'text-muted-color'}`}>
                {s === 'details' ? 'Your Details' : 'Your Field'}
              </span>
              {i < 1 && <div className={`w-12 h-px ${step === 'field' ? 'bg-primary-500' : 'bg-surface-border'} transition-all duration-500`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-error-500/10 border border-error-500/30 text-error-400 text-xs font-semibold text-center max-w-md mx-auto">
            ⚠️ {error}
          </div>
        )}

        {step === 'details' && (
          <div className="max-w-md mx-auto glass-card p-8 shadow-xl">
            <h2 className="text-lg font-bold text-primary-color mb-6">Create your account</h2>
            <form className="space-y-5" onSubmit={handleDetailsNext}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-color mb-2">Full Name</label>
                <input
                  type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className="input-base"
                  placeholder="Alex Mercer"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-color mb-2">Email Address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-color mb-2">Password</label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="input-base mb-2"
                  placeholder="Min 8 chars with a number"
                />
                {password.length > 0 && (
                  <div className="flex gap-1 h-1.5 mt-2">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`flex-1 rounded-full ${i < strength ? strengthColors[strength] : 'bg-surface-border-strong'} transition-colors`} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-color mb-2">Confirm Password</label>
                <input
                  type="password" required value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                  className="input-base"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit"
                className="btn btn-glow w-full mt-2">
                Continue →
              </button>
            </form>
            <div className="mt-6 text-center text-xs text-secondary-color">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-brand hover:text-primary-300 transition">Sign in</Link>
            </div>
          </div>
        )}

        {step === 'field' && (
          <div className="glass-card p-8 shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-primary-color">What&apos;s your professional field?</h2>
              <p className="text-secondary-color text-sm mt-2">
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
                      ? 'border-primary-500 bg-primary-500/10 shadow-glow-primary scale-105'
                      : 'border-surface-strong bg-surface-2 hover:border-primary-400 hover:bg-surface-3 hover:scale-105'
                    }`}
                >
                  {selectedField === f.value && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✓</div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-surface-1 flex items-center justify-center text-primary-color border border-surface-border shadow-sm group-hover:text-primary-400 transition-colors">
                    {f.icon}
                  </div>
                  <span className={`text-[11px] font-semibold text-center leading-tight transition-colors
                    ${selectedField === f.value ? 'text-primary-400' : 'text-secondary-color group-hover:text-primary-color'}`}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 max-w-sm mx-auto">
              <button
                onClick={() => setStep('details')}
                className="flex-1 py-3 border border-surface-strong hover:border-primary-400 text-secondary-color hover:text-primary-color font-semibold rounded-2xl text-sm transition-all duration-200">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedField || loading}
                className="flex-[2] btn btn-glow py-3 w-full disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-2xl text-sm transition-all duration-200">
                {loading ? 'Creating Account...' : selectedField ? `Join as ${selectedField.split(' ')[0]} →` : 'Select a Field First'}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
