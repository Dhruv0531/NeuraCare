'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Shield, Calendar, ClipboardList, LogOut, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout, isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) setNewName(user.name);
  }, [user]);

  const handleSaveName = async () => {
    if (!newName.trim()) { toast.error('Name cannot be empty'); return; }
    setNameLoading(true);
    try {
      await api.updateProfile({ name: newName.trim() });
      if (user) {
        const token = localStorage.getItem('neuracare_token') || '';
        login(token, { ...user, name: newName.trim() });
      }
      toast.success('Name updated!');
      setEditingName(false);
    } catch {
      toast.error('Failed to update name');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!pwForm.newPassword) errs.newPassword = 'New password is required';
    else if (pwForm.newPassword.length < 8) errs.newPassword = 'Must be at least 8 characters';
    if (pwForm.newPassword !== pwForm.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setPwLoading(true);
    try {
      await api.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch {
      toast.error('Incorrect current password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteAccount();
      logout();
      toast.success('Account deleted');
      router.push('/');
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading || !user) return null;

  const memberSince = new Date(user.id ? parseInt(user.id.substring(0, 8), 16) * 1000 : Date.now())
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Profile</h1>
          <p className="text-text-muted mt-1">Manage your account settings</p>
        </div>

        {/* Profile card */}
        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <div className="flex items-center gap-5 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="text-xl font-bold border border-border rounded-xl px-3 py-1.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={nameLoading} className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-60">
                    <Save className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setEditingName(false); setNewName(user.name); }} className="p-1.5 rounded-lg border border-border hover:bg-background transition-colors">
                    <X className="h-4 w-4 text-text-muted" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-text-main">{user.name}</h2>
                  <button onClick={() => setEditingName(true)} className="text-xs text-primary font-semibold hover:underline">Edit</button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${user.role === 'clinician' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'}`}>
                  {user.role === 'clinician' ? 'Clinician' : 'User'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border">
              <Mail className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Email</p>
                <p className="text-sm font-medium text-text-main">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border">
              <Shield className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Role</p>
                <p className="text-sm font-medium text-text-main capitalize">{user.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border">
              <Calendar className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Member since</p>
                <p className="text-sm font-medium text-text-main">{memberSince}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border">
              <ClipboardList className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Assessments taken</p>
                <p className="text-sm font-medium text-text-main">Loading...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <h2 className="text-xl font-bold text-text-main mb-6">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
            {[
              { id: 'currentPassword', label: 'Current Password', key: 'currentPassword' },
              { id: 'newPassword', label: 'New Password', key: 'newPassword' },
              { id: 'confirm', label: 'Confirm New Password', key: 'confirm' },
            ].map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-text-main mb-1.5" htmlFor={field.id}>{field.label}</label>
                <div className="relative">
                  <input
                    id={field.id}
                    type={showPw ? 'text' : 'password'}
                    value={pwForm[field.key as keyof typeof pwForm]}
                    onChange={e => setPwForm(p => ({ ...p, [field.key]: e.target.value }))}
                    className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none bg-background focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 ${pwErrors[field.key] ? 'border-danger' : 'border-border'}`}
                    placeholder="••••••••"
                  />
                  {field.key === 'currentPassword' && (
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {pwErrors[field.key] && <p className="mt-1 text-xs text-danger">{pwErrors[field.key]}</p>}
              </div>
            ))}
            <button type="submit" disabled={pwLoading}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 min-h-[48px]">
              {pwLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Changing...</> : <><Save className="h-4 w-4" /> Change Password</>}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-card rounded-3xl border border-border shadow-card p-8 space-y-4">
          <h2 className="text-xl font-bold text-text-main">Account Actions</h2>

          <button
            onClick={() => { logout(); router.push('/'); }}
            className="flex items-center gap-2 w-full border border-border text-text-muted font-semibold px-5 py-3 rounded-xl hover:border-text-muted hover:text-text-main transition-all duration-200 min-h-[48px]"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 w-full border border-danger/30 text-danger font-semibold px-5 py-3 rounded-xl hover:bg-danger-light transition-all duration-200 min-h-[48px]"
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </button>
          ) : (
            <div className="p-4 bg-danger-light border border-danger/20 rounded-2xl">
              <p className="text-sm font-semibold text-danger mb-3">
                Are you sure? This action is permanent and cannot be undone. All your data will be deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 bg-danger text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-main transition-colors font-medium min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
