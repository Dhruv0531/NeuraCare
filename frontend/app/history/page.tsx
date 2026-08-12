'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Eye } from 'lucide-react';
import { api, Assessment } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import TrendChart from '@/components/TrendChart';
import RiskBadge from '@/components/RiskBadge';
import { SkeletonCard } from '@/components/LoadingSpinner';

const CONDITIONS = ['depression', 'anxiety', 'stress', 'insomnia'] as const;

export default function HistoryPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.getHistory()
      .then(data => setAssessments(data))
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (isLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main">Your Assessment History</h1>
          <p className="text-text-muted mt-1">Track your mental health over time</p>
        </div>

        {assessments.length === 0 ? (
          /* Empty state */
          <div className="bg-card rounded-3xl border border-border shadow-card p-16 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text-main mb-2">No assessments yet</h2>
            <p className="text-text-muted mb-6 max-w-sm">Take your first assessment to start tracking your mental health journey over time.</p>
            <Link href="/assessment" className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25">
              Take Assessment Now
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Trend chart */}
            {assessments.length > 1 ? (
              <div className="bg-card rounded-3xl border border-border shadow-card p-8">
                <h2 className="text-xl font-bold text-text-main mb-1">Risk Score Trend</h2>
                <p className="text-sm text-text-muted mb-6">How your mental health risk has changed over time</p>
                <TrendChart assessments={assessments} />
              </div>
            ) : (
              <div className="bg-primary-light border border-primary/20 rounded-2xl p-4 text-sm text-primary">
                Complete more assessments to see your trend over time.
              </div>
            )}

            {/* Table */}
            <div className="bg-card rounded-3xl border border-border shadow-card overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-text-main">Past Assessments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Depression</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Anxiety</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Stress</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Insomnia</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Overall</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...assessments].reverse().map(a => {
                      const hasHigh = CONDITIONS.some(c => a[c].label === 'High');
                      const allLow = CONDITIONS.every(c => a[c].label === 'Low');
                      const rowBg = hasHigh ? 'bg-red-50/50' : allLow ? 'bg-green-50/50' : 'bg-white';

                      return (
                        <tr key={a._id} className={`hover:bg-background transition-colors ${rowBg}`}>
                          <td className="px-6 py-4 font-medium text-text-main whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          {CONDITIONS.map(c => (
                            <td key={c} className="px-4 py-4">
                              <RiskBadge label={a[c].label} size="sm" />
                            </td>
                          ))}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 bg-border rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${a.overallScore}%`,
                                    backgroundColor: a.overallScore < 33 ? '#10B981' : a.overallScore < 66 ? '#F59E0B' : '#EF4444',
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-text-muted">{a.overallScore}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/results/${a._id}`}
                              className="inline-flex items-center gap-1.5 text-primary font-semibold text-xs hover:underline"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Report
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pb-8">
              <Link href="/assessment" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25">
                <ClipboardList className="h-4 w-4" /> Take New Assessment
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
