'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brain, Menu, X, LogOut, User, LayoutDashboard, ClipboardList, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
    setMobileOpen(false);
  };

  const isActive = (href: string) => pathname === href;

  const linkCls = (href: string) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive(href) ? 'text-primary' : 'text-text-muted hover:text-text-main'
    }`;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-primary/30 transition-shadow">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-text-main tracking-tight">NeuraCare</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {!isAuthenticated ? (
              <>
                <Link href="/" className={linkCls('/')}>Home</Link>
                <Link href="/history" className={linkCls('/history')}>History</Link>
                <Link href="/clinician" className={linkCls('/clinician')}>Clinician Portal</Link>
                <Link href="/login" className={linkCls('/login')}>Login</Link>
                <Link
                  href="/assessment"
                  className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px"
                >
                  Take Assessment
                </Link>
              </>
            ) : user?.role === 'clinician' ? (
              <>
                <Link href="/clinician" className={linkCls('/clinician')}>
                  <span className="flex items-center gap-1.5"><LayoutDashboard className="h-4 w-4" /> Clinician Portal</span>
                </Link>
                <Link href="/history" className={linkCls('/history')}>
                  <span className="flex items-center gap-1.5"><History className="h-4 w-4" /> History</span>
                </Link>
                <Link href="/profile" className={linkCls('/profile')}>
                  <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> Profile</span>
                </Link>
                <Link
                  href="/assessment"
                  className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px"
                >
                  <span className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Take Assessment</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-danger transition-colors">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/history" className={linkCls('/history')}>
                  <span className="flex items-center gap-1.5"><History className="h-4 w-4" /> History</span>
                </Link>
                <Link href="/profile" className={linkCls('/profile')}>
                  <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> Profile</span>
                </Link>
                <Link
                  href="/assessment"
                  className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px"
                >
                  <span className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Take Assessment</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-danger transition-colors">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile slide-in sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg">NeuraCare</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              {!isAuthenticated ? (
                <>
                  <MobileLink href="/" label="Home" onClick={() => setMobileOpen(false)} />
                  <MobileLink href="/login" label="Login" onClick={() => setMobileOpen(false)} />
                  <MobileLink href="/register" label="Register" onClick={() => setMobileOpen(false)} />
                  <div className="pt-4">
                    <Link
                      href="/assessment"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full bg-primary text-white text-center font-semibold py-3 rounded-xl"
                    >
                      Take Assessment
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {user?.role === 'clinician' ? (
                    <>
                      <MobileLink href="/clinician" label="Clinician Portal" onClick={() => setMobileOpen(false)} />
                      <MobileLink href="/history" label="History" onClick={() => setMobileOpen(false)} />
                      <div className="pt-2">
                        <Link
                          href="/assessment"
                          onClick={() => setMobileOpen(false)}
                          className="block w-full bg-primary text-white text-center font-semibold py-2.5 rounded-xl text-sm"
                        >
                          Take Assessment
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <MobileLink href="/assessment" label="Take Assessment" onClick={() => setMobileOpen(false)} />
                      <MobileLink href="/history" label="My History" onClick={() => setMobileOpen(false)} />
                    </>
                  )}
                  <MobileLink href="/profile" label="Profile" onClick={() => setMobileOpen(false)} />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-3 rounded-xl text-danger font-medium hover:bg-danger-light transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>

            {user && (
              <div className="absolute bottom-8 left-6 right-6 p-4 bg-primary-light rounded-2xl">
                <p className="font-semibold text-primary text-sm">{user.name}</p>
                <p className="text-xs text-text-muted">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MobileLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-3 rounded-xl text-text-main font-medium hover:bg-gray-50 transition-colors"
    >
      {label}
    </Link>
  );
}
