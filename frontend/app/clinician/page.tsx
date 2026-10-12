'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, AlertTriangle, Activity, Sparkles, RefreshCw, ClipboardList } from 'lucide-react';
import RiskBadge from '@/components/RiskBadge';
import { api, ClinicianSummary } from '@/lib/api';

export default function ClinicianDashboard() {
  const [summary, setSummary] = useState<ClinicianSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    api.getClinicianSummary()
      .then(res => {
        setSummary(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-1">Clinician Portal</h1>
            <p className="text-sm text-text-muted">Aggregate Patient Risk Analytics & Clinical Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <ClipboardList className="h-4 w-4" /> Take Assessment
            </Link>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 bg-white border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-primary text-text-main transition-colors shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Metrics
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-wider">
              <Users className="h-4 w-4 text-primary" /> Total Patient Assessments
            </div>
            <div className="text-3xl font-extrabold text-text-main">
              {summary ? summary.total_patients : '--'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-red-500" /> High Risk Screening Cases
            </div>
            <div className="text-3xl font-extrabold text-red-600">
              {summary ? summary.high_risk_cases : '--'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-2">
            <div className="text-text-muted text-xs font-bold uppercase tracking-wider">Risk Level Breakdown</div>
            <div className="flex items-center justify-between text-xs font-semibold pt-1">
              <span className="text-emerald-600">Low: {summary?.risk_distribution?.Low || 0}</span>
              <span className="text-amber-600">Mod: {summary?.risk_distribution?.Moderate || 0}</span>
              <span className="text-red-600">High: {summary?.risk_distribution?.High || 0}</span>
            </div>
          </div>
        </div>

        {/* Patient Activity Table */}
        <div className="bg-white rounded-3xl border border-border shadow-card overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text-main">Recent Patient Submissions</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-text-muted">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-3" />
              Fetching clinical cohort metrics...
            </div>
          ) : !summary || !summary.recent_activity || summary.recent_activity.length === 0 ? (
            <div className="p-12 text-center text-text-muted space-y-3">
              <p>No recent patient activity recorded yet.</p>
              <div>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors"
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Start First Assessment
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-text-muted text-xs uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Patient ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Overall Risk</th>
                    <th className="px-6 py-4">Depression</th>
                    <th className="px-6 py-4">Anxiety</th>
                    <th className="px-6 py-4">Stress</th>
                    <th className="px-6 py-4">Emotional Tone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {summary.recent_activity.map((patient, idx) => (
                    <tr key={idx} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-text-main">{patient.patient_id}</td>
                      <td className="px-6 py-4 text-xs text-text-muted">
                        {new Date(patient.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge label={(patient.overall_risk as 'Low' | 'Moderate' | 'High') || 'Low'} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-text-main">{patient.depression_level}</td>
                      <td className="px-6 py-4 text-text-main">{patient.anxiety_level}</td>
                      <td className="px-6 py-4 text-text-main">{patient.stress_level}</td>
                      <td className="px-6 py-4">
                        {patient.top_emotions && patient.top_emotions.length > 0 ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {patient.top_emotions.map((emo, i) => (
                              <span key={i} className="text-xs bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded-md capitalize">
                                {emo}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
