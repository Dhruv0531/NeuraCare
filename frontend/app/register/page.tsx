'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await api.register(form);
      toast.success('Account created! Please log in.');
      router.push('/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-glass border border-border p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-text-main">NeuraCare</span>
          </div>

          <h1 className="text-2xl font-bold text-text-main mb-1">Create your account</h1>
          <p className="text-text-muted text-sm mb-8">Join NeuraCare to track your mental health over time</p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5" htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none bg-background focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 ${errors.name ? 'border-danger' : 'border-border'}`}
                placeholder="Your full name"
              />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5" htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none bg-background focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 ${errors.email ? 'border-danger' : 'border-border'}`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm transition-all duration-200 outline-none bg-background focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 ${errors.password ? 'border-danger' : 'border-border'}`}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: 'user', label: 'Individual / Student' }, { val: 'clinician', label: 'Mental Health Clinician' }].map(opt => (
                  <label
                    key={opt.val}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 text-sm font-medium ${
                      form.role === opt.val
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-border text-text-muted hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.val}
                      checked={form.role === opt.val}
                      onChange={() => setForm({ ...form, role: opt.val })}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              id="register-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 min-h-[48px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account...
                </span>
              ) : (
                <>Create Account <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/assessment" className="text-xs text-text-muted hover:text-text-main underline transition-colors">
              Or continue as guest (results won&apos;t be saved)
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
