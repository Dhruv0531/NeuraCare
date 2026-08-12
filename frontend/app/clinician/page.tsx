'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, AlertTriangle, CheckCircle, TrendingUp, Search } from 'lucide-react';
import { api, Patient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import RiskBadge from '@/components/RiskBadge';
import { SkeletonCard } from '@/components/LoadingSpinner';

const CONDITIONS = ['depression', 'anxiety', 'stress', 'insomnia'] as const;
const PAGE_SIZE = 10;

export default function ClinicianPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');
  const [sortBy, setSortBy] = useState('Newest First');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role !== 'clinician') router.push('/assessment');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (user?.role !== 'clinician') return;
    api.getCohort()
      .then(setPatients)
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = patients
    .filter(p => {
      const matchSearch = search === '' ||
        p.patientId.toLowerCase().includes(search.toLowerCase());
      const highRisk = CONDITIONS.some(c => p[c].label === 'High');
      const modRisk = CONDITIONS.some(c => p[c].label === 'Moderate');
      const matchRisk = filterRisk === 'All' ||
        (filterRisk === 'High Only' && highRisk) ||
        (filterRisk === 'Moderate Only' && modRisk);
      return matchSearch && matchRisk;
    })
    .sort((a, b) =>
      sortBy === 'Newest First'
        ? new Date(b.lastAssessment).getTime() - new Date(a.lastAssessment).getTime()
        : b.overallScore - a.overallScore
    );

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const totalHigh = patients.filter(p => CONDITIONS.some(c => p[c].label === 'High')).length;
  const totalMod = patients.filter(p => CONDITIONS.some(c => p[c].label === 'Moderate') && !CONDITIONS.some(c => p[c].label === 'High')).length;
  const totalLow = patients.length - totalHigh - totalMod;

  const stats = [
    { label: 'Total Patients', value: patients.length, icon: Users, color: 'bg-primary-light text-primary' },
    { label: 'High Risk', value: totalHigh, icon: AlertTriangle, color: 'bg-danger-light text-danger' },
    { label: 'Moderate Risk', value: totalMod, icon: TrendingUp, color: 'bg-warning-light text-warning' },
    { label: 'Low Risk', value: totalLow, icon: CheckCircle, color: 'bg-success-light text-success' },
  ];

  if (isLoading || loading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 space-y-6"><SkeletonCard /><SkeletonCard /></div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main">Clinician Dashboard</h1>
          <p className="text-text-muted mt-1">Patient Mental Health Risk Overview</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-card rounded-2xl border border-border shadow-card p-5">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.color} mb-3`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-text-main">{s.value}</div>
              <div className="text-sm text-text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-4 mb-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by Patient ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-background"
            />
          </div>
          <select value={filterRisk} onChange={e => { setFilterRisk(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary bg-background cursor-pointer">
            <option>All Risk Levels</option>
            <option>High Only</option>
            <option>Moderate Only</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary bg-background cursor-pointer">
            <option>Newest First</option>
            <option>Highest Risk First</option>
          </select>
        </div>

        {/* Patient Table */}
        <div className="bg-card rounded-3xl border border-border shadow-card overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background border-b border-border">
                  {['Patient ID', 'Age Group', 'Last Assessment', 'Depression', 'Anxiety', 'Stress', 'Insomnia', 'Overall Score', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-text-muted">No patients found</td></tr>
                ) : paged.map(p => {
                  const hasHigh = CONDITIONS.some(c => p[c].label === 'High');
                  const allLow = CONDITIONS.every(c => p[c].label === 'Low');
                  const rowBg = hasHigh ? 'bg-red-50/60' : allLow ? 'bg-green-50/60' : '';

                  return (
                    <tr key={p._id} className={`hover:bg-background transition-colors ${rowBg}`}>
                      <td className="px-4 py-4 font-mono text-xs text-text-muted">{p.patientId}</td>
                      <td className="px-4 py-4 text-text-main">{p.ageGroup}</td>
                      <td className="px-4 py-4 text-text-muted whitespace-nowrap">
                        {new Date(p.lastAssessment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      {CONDITIONS.map(c => (
                        <td key={c} className="px-4 py-4"><RiskBadge label={p[c].label} size="sm" /></td>
                      ))}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${p.overallScore}%`,
                              backgroundColor: p.overallScore < 33 ? '#10B981' : p.overallScore < 66 ? '#F59E0B' : '#EF4444',
                            }} />
                          </div>
                          <span className="text-xs font-bold text-text-muted">{p.overallScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <a href={`/results/${p._id}`} className="text-primary font-semibold text-xs hover:underline">View Report</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-text-muted pb-8">
            <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} patients</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40 transition-colors">Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
