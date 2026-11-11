'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Eye, EyeOff, ArrowRight, Stethoscope, User, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    licenseNumber: '',
    specialty: 'Clinical Psychology',
    affiliation: '',
    referralCode: '',
  });
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

    if (form.role === 'clinician') {
      if (!form.licenseNumber.trim()) e.licenseNumber = 'Medical license or registration ID is required';
      if (!form.affiliation.trim()) e.affiliation = 'Practice or clinic affiliation is required';
    }

    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res: any = await api.register(form);
      if (form.role === 'clinician' && res.clinicianCode) {
        toast.success(`Clinician account verified! Your Connect Code is ${res.clinicianCode}. Please log in.`);
      } else {
        toast.success('Account created! Please log in.');
      }
      router.push('/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-lg">
        <div className="bg-card rounded-3xl shadow-glass border border-border p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-text-main">NeuraCare</span>
          </div>

          <h1 className="text-2xl font-bold text-text-main mb-1">Create your account</h1>
          <p className="text-text-muted text-sm mb-6">Join NeuraCare for multi-modal clinical mental health analytics</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Account Role Selector */}
            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">Registering as</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-center ${
                    form.role === 'user'
                      ? 'border-primary bg-primary-light text-primary font-semibold shadow-sm'
                      : 'border-border text-text-muted hover:border-primary/40 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={form.role === 'user'}
                    onChange={() => setForm({ ...form, role: 'user' })}
                    className="sr-only"
                  />
                  <User className="h-5 w-5 mb-1 text-primary" />
                  <span className="text-sm font-bold">Individual / Patient</span>
                  <span className="text-[11px] text-text-muted mt-0.5">Self-tracking & assessments</span>
                </label>

                <label
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-center ${
                    form.role === 'clinician'
                      ? 'border-secondary bg-secondary/10 text-secondary font-semibold shadow-sm'
                      : 'border-border text-text-muted hover:border-secondary/40 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="clinician"
                    checked={form.role === 'clinician'}
                    onChange={() => setForm({ ...form, role: 'clinician' })}
                    className="sr-only"
                  />
                  <Stethoscope className="h-5 w-5 mb-1 text-secondary" />
                  <span className="text-sm font-bold">Clinician / Provider</span>
                  <span className="text-[11px] text-text-muted mt-0.5">Patient cohort monitoring</span>
                </label>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1" htmlFor="name">
                {form.role === 'clinician' ? 'Full Name & Title (e.g., Dr. Jane Doe)' : 'Full Name'}
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-200 outline-none bg-background focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 ${errors.name ? 'border-danger' : 'border-border'}`}
                placeholder={form.role === 'clinician' ? 'Dr. Sarah Connor' : 'Your full name'}
              />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1" htmlFor="reg-email">
                {form.role === 'clinician' ? 'Professional / Hospital Email' : 'Email Address'}
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-200 outline-none bg-background focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 ${errors.email ? 'border-danger' : 'border-border'}`}
                placeholder="you@institution.com"
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm transition-all duration-200 outline-none bg-background focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 ${errors.password ? 'border-danger' : 'border-border'}`}
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

            {/* Clinician Specific Credentials */}
            {form.role === 'clinician' && (
              <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-secondary uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" /> Professional Credentials
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">
                    Medical License or Registration ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.licenseNumber}
                    onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder="e.g. RCI-CR-2024-892 or NPI-104928"
                    className={`w-full px-3 py-2 rounded-xl border text-sm bg-white outline-none focus:border-secondary ${errors.licenseNumber ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors.licenseNumber && <p className="mt-1 text-xs text-danger">{errors.licenseNumber}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">Clinical Specialty</label>
                    <select
                      value={form.specialty}
                      onChange={e => setForm({ ...form, specialty: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white outline-none focus:border-secondary cursor-pointer"
                    >
                      <option value="Clinical Psychology">Clinical Psychology</option>
                      <option value="Psychiatry">Psychiatry</option>
                      <option value="Psychotherapy">Psychotherapy</option>
                      <option value="Counseling Psychology">Counseling Psychology</option>
                      <option value="Sleep & Behavioral Medicine">Sleep & Behavioral Medicine</option>
                      <option value="General Practice">General Practice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">
                      Hospital or Clinic Affiliation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.affiliation}
                      onChange={e => setForm({ ...form, affiliation: e.target.value })}
                      placeholder="e.g. City Hospital / Private Practice"
                      className={`w-full px-3 py-2 rounded-xl border text-xs bg-white outline-none focus:border-secondary ${errors.affiliation ? 'border-red-400' : 'border-border'}`}
                    />
                    {errors.affiliation && <p className="mt-1 text-xs text-danger">{errors.affiliation}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Individual Patient Referral Connect Code (Optional) */}
            {form.role === 'user' && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-1.5 animate-fade-in">
                <label className="block text-xs font-bold text-primary uppercase tracking-wider">
                  Doctor or Clinic Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={form.referralCode}
                  onChange={e => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. DR-SHARMA-409"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white uppercase font-mono tracking-wider outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-muted">
                  If your psychologist, doctor, or clinic gave you a Connect Code, enter it to link your assessments directly to their portal.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="register-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 min-h-[48px] mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account...
                </span>
              ) : (
                <>
                  {form.role === 'clinician' ? 'Register Verified Clinician' : 'Create Patient Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/assessment" className="text-xs text-text-muted hover:text-text-main underline transition-colors">
              Or continue as guest (results won&apos;t be saved)
            </Link>
          </div>

          <p className="mt-4 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
