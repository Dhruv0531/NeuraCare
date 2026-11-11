'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  AlertTriangle,
  Activity,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Stethoscope,
  Search,
  X,
  FileText,
  Clock,
  HeartPulse,
  Brain,
  AlertCircle
} from 'lucide-react';
import RiskBadge from '@/components/RiskBadge';
import ClinicalReportExport from '@/components/ClinicalReportExport';
import { useAuth } from '@/contexts/AuthContext';
import { api, ClinicianSummary, ClinicianPatient, Assessment } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ClinicianDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<ClinicianSummary | null>(null);
  const [patients, setPatients] = useState<ClinicianPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'crisis' | 'high' | 'moderate'>('all');

  // Selected patient for Clinical Chart modal
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<{
    patient: any;
    assessmentCount: number;
    history: Assessment[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getClinicianSummary().catch(() => null),
      api.getClinicianPatients().catch(() => [])
    ])
      .then(([sumRes, patRes]) => {
        if (sumRes) setSummary(sumRes);
        if (Array.isArray(patRes)) setPatients(patRes);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load clinician data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/clinician');
      return;
    }
    if (!isLoading && user && user.role !== 'clinician') {
      // Non-clinician user trying to access
      return;
    }
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Open detailed patient modal
  const handleOpenPatient = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setDetailLoading(true);
    try {
      const data = await api.getClinicianPatientDetail(patientId);
      setPatientDetail(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch patient chart');
      setSelectedPatientId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Patient Connect Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Filtered patients based on search and triage tab
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patientId.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'crisis') return p.isCrisis;
      if (activeTab === 'high') return p.overallRisk === 'High';
      if (activeTab === 'moderate') return p.overallRisk === 'Moderate';
      return true;
    });
  }, [patients, searchQuery, activeTab]);

  // If still checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
      </div>
    );
  }

  // If user is authenticated as standard patient ('user')
  if (user && user.role !== 'clinician') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-background">
        <div className="max-w-md w-full bg-white rounded-3xl border border-border shadow-card p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-text-main">Clinician Portal Access Restricted</h1>
          <p className="text-sm text-text-muted leading-relaxed">
            Your current account is registered as an <strong>Individual / Patient</strong>. The Clinician Portal is reserved exclusively for licensed mental health practitioners and counselors.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/assessment"
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all"
            >
              Take Personal Assessment
            </Link>
            <Link
              href="/profile"
              className="border border-border hover:border-primary text-text-main font-semibold py-3 px-4 rounded-xl text-sm transition-all"
            >
              Go to My Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const clinicianCode = summary?.clinician?.clinicianCode || (user as any)?.clinicianCode || 'NOT_ASSIGNED';
  const crisisCount = patients.filter(p => p.isCrisis).length;
  const highRiskCount = patients.filter(p => p.overallRisk === 'High').length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Clinician Header & Connect Code Banner ── */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider">
                <Stethoscope className="h-3.5 w-3.5" /> Verified Clinician Suite
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main">
                {summary?.clinician?.name || user?.name || 'Mental Health Provider'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted pt-0.5">
                <span>{summary?.clinician?.specialty || (user as any)?.specialty || 'Clinical Psychology'}</span>
                <span>•</span>
                <span>{summary?.clinician?.affiliation || (user as any)?.affiliation || 'Clinical Practice'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> License: {summary?.clinician?.licenseNumber || (user as any)?.licenseNumber || 'Verified'}
                </span>
              </div>
            </div>

            {/* Connect Code Card */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 sm:p-5 w-full lg:w-auto min-w-[300px]">
              <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Your Patient Connect Code
              </div>
              <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5 rounded-xl border border-primary/20 shadow-sm">
                <span className="font-mono text-lg font-bold tracking-widest text-text-main">
                  {clinicianCode}
                </span>
                <button
                  onClick={() => handleCopyCode(clinicianCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-text-muted mt-2 leading-tight">
                Share with patients during intake so their assessments link directly to your portal.
              </p>
            </div>
          </div>
        </div>

        {/* ── Metric Triage Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-wider">
              <Users className="h-4 w-4 text-primary" /> Linked Patients
            </div>
            <div className="text-3xl font-extrabold text-text-main">
              {loading ? '--' : patients.length}
            </div>
            <p className="text-xs text-text-muted">Under active clinical care</p>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> High-Risk Profiles
            </div>
            <div className="text-3xl font-extrabold text-amber-600">
              {loading ? '--' : highRiskCount}
            </div>
            <p className="text-xs text-text-muted">Require clinical monitoring</p>
          </div>

          <div className={`rounded-2xl border p-5 shadow-sm space-y-1 ${crisisCount > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-border'}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
              <HeartPulse className="h-4 w-4" /> 🚨 Crisis Triage Alerts
            </div>
            <div className="text-3xl font-extrabold text-red-600">
              {loading ? '--' : crisisCount}
            </div>
            <p className="text-xs text-red-700 font-medium">
              {crisisCount > 0 ? 'Self-harm signals flagged' : 'No acute crisis signals'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-2">
            <div className="text-text-muted text-xs font-bold uppercase tracking-wider">Cohort Risk Split</div>
            <div className="flex items-center justify-between text-xs font-semibold pt-1">
              <span className="text-emerald-600">Low: {summary?.risk_distribution?.Low || 0}</span>
              <span className="text-amber-600">Mod: {summary?.risk_distribution?.Moderate || 0}</span>
              <span className="text-red-600">High: {summary?.risk_distribution?.High || 0}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div style={{ width: `${((summary?.risk_distribution?.Low || 0) / Math.max(1, patients.length)) * 100}%` }} className="bg-emerald-500 h-full" />
              <div style={{ width: `${((summary?.risk_distribution?.Moderate || 0) / Math.max(1, patients.length)) * 100}%` }} className="bg-amber-500 h-full" />
              <div style={{ width: `${((summary?.risk_distribution?.High || 0) / Math.max(1, patients.length)) * 100}%` }} className="bg-red-500 h-full" />
            </div>
          </div>
        </div>

        {/* ── Patient Roster & Triage Table ── */}
        <div className="bg-white rounded-3xl border border-border shadow-card overflow-hidden">
          {/* Table Header & Controls */}
          <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Assigned Patient Roster
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Monitoring only patients who linked to your clinician code: <strong>{clinicianCode}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search patient name or ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border text-xs outline-none focus:border-primary bg-background focus:bg-white transition-colors"
                />
              </div>

              <button
                onClick={loadData}
                className="p-2.5 rounded-xl border border-border hover:border-primary text-text-muted hover:text-text-main transition-colors"
                title="Refresh metrics"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Triage Tabs */}
          <div className="flex border-b border-border px-6 gap-2 bg-slate-50/50 overflow-x-auto">
            {[
              { id: 'all', label: `All Patients (${patients.length})` },
              { id: 'crisis', label: `🚨 Crisis Priority (${crisisCount})` },
              { id: 'high', label: `High Risk (${highRiskCount})` },
              { id: 'moderate', label: 'Moderate Risk' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-main'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="p-16 text-center text-text-muted">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-3" />
              Loading verified patient roster...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-16 text-center text-text-muted space-y-3">
              <Users className="h-10 w-10 text-slate-300 mx-auto" />
              <div className="font-semibold text-text-main text-base">No patients found in this view</div>
              <p className="text-xs max-w-md mx-auto leading-relaxed">
                {patients.length === 0
                  ? `You haven't linked any patients yet. Instruct your patients to enter your Connect Code "${clinicianCode}" at sign-up or on their profile page.`
                  : 'No patients match your current filter or search criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background/80 text-text-muted text-[11px] uppercase font-bold tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5">Patient</th>
                    <th className="px-6 py-3.5">Risk Status</th>
                    <th className="px-6 py-3.5">Depression</th>
                    <th className="px-6 py-3.5">Anxiety</th>
                    <th className="px-6 py-3.5">Sleep Quality</th>
                    <th className="px-6 py-3.5">Last Screened</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPatients.map(patient => (
                    <tr
                      key={patient._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        patient.isCrisis ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Patient Name & ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-text-main flex items-center gap-2">
                              {patient.name}
                              {patient.isCrisis && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 animate-pulse">
                                  🚨 CRISIS ALERT
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-text-muted">{patient.patientId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Overall Risk */}
                      <td className="px-6 py-4">
                        <RiskBadge label={patient.overallRisk} size="sm" />
                      </td>

                      {/* Depression Level */}
                      <td className="px-6 py-4 text-xs font-medium text-text-main">
                        {patient.latestAssessment?.depression?.level || patient.latestAssessment?.depression?.label || 'Low'}
                      </td>

                      {/* Anxiety Level */}
                      <td className="px-6 py-4 text-xs font-medium text-text-main">
                        {patient.latestAssessment?.anxiety?.level || patient.latestAssessment?.anxiety?.label || 'Low'}
                      </td>

                      {/* Sleep */}
                      <td className="px-6 py-4 text-xs text-text-muted">
                        {patient.latestAssessment?.sleep?.score != null
                          ? `${patient.latestAssessment.sleep.score}/28 (${patient.latestAssessment.sleep.level})`
                          : '--'}
                      </td>

                      {/* Last Assessment Date */}
                      <td className="px-6 py-4 text-xs text-text-muted">
                        {patient.lastAssessmentDate
                          ? new Date(patient.lastAssessmentDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'No assessments'}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenPatient(patient._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary text-primary hover:text-white text-xs font-semibold transition-all shadow-sm"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Chart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Patient Clinical Chart Modal ── */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-white">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">
                    Clinical Chart: {patientDetail?.patient?.name || 'Patient'}
                  </h3>
                  <p className="text-xs text-text-muted font-mono">
                    ID: {patientDetail?.patient?.patientId} • Email: {patientDetail?.patient?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedPatientId(null); setPatientDetail(null); }}
                className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {detailLoading ? (
                <div className="p-16 text-center text-text-muted">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-3" />
                  Loading longitudinal history...
                </div>
              ) : !patientDetail || patientDetail.history.length === 0 ? (
                <div className="p-12 text-center text-text-muted">
                  No completed assessments on file for this patient.
                </div>
              ) : (
                <>
                  {/* Latest Assessment Highlights */}
                  {(() => {
                    const latest = patientDetail.history[0];
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted">
                            Latest Multi-Modal Evaluation ({new Date(latest.createdAt).toLocaleDateString('en-IN')})
                          </h4>
                          <ClinicalReportExport assessment={latest} userName={patientDetail.patient.name} />
                        </div>

                        {/* Crisis Alert if present */}
                        {latest.crisis_flag && (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900 text-xs font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <span>🚨 Patient indicated acute distress or self-harm thoughts on item 9. Prioritize clinical outreach.</span>
                          </div>
                        )}

                        {/* Subscale Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-slate-50 border border-border p-3.5 rounded-xl space-y-1">
                            <span className="text-[11px] text-text-muted font-bold uppercase">Depression</span>
                            <div className="text-lg font-extrabold text-text-main">
                              {latest.depression?.level || 'Low'}
                            </div>
                            <span className="text-[10px] text-text-muted block">PHQ-9 Screener</span>
                          </div>
                          <div className="bg-slate-50 border border-border p-3.5 rounded-xl space-y-1">
                            <span className="text-[11px] text-text-muted font-bold uppercase">Anxiety</span>
                            <div className="text-lg font-extrabold text-text-main">
                              {latest.anxiety?.level || 'Low'}
                            </div>
                            <span className="text-[10px] text-text-muted block">GAD-7 Screener</span>
                          </div>
                          <div className="bg-slate-50 border border-border p-3.5 rounded-xl space-y-1">
                            <span className="text-[11px] text-text-muted font-bold uppercase">Stress</span>
                            <div className="text-lg font-extrabold text-text-main">
                              {latest.stress?.level || 'Low'}
                            </div>
                            <span className="text-[10px] text-text-muted block">DASS Tension</span>
                          </div>
                          <div className="bg-slate-50 border border-border p-3.5 rounded-xl space-y-1">
                            <span className="text-[11px] text-text-muted font-bold uppercase">Sleep Insomnia</span>
                            <div className="text-lg font-extrabold text-text-main">
                              {latest.sleep?.score ?? 0}/28
                            </div>
                            <span className="text-[10px] text-text-muted block">{latest.sleep?.level || 'Normal'}</span>
                          </div>
                        </div>

                        {/* AI Stepped Adaptive Insights (if available) */}
                        {((latest.formData as any)?.adaptive_insights) && (
                          <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-transparent border border-border rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                              <Sparkles className="h-4 w-4" /> AI Adaptive Follow-Up Probes & Inquiries
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3 text-xs">
                              {/* Depression follow-up */}
                              {(latest.formData as any)?.adaptive_insights?.phq_analysis && (
                                <div className="bg-white p-3 rounded-xl border border-border/80 space-y-1.5">
                                  <div className="font-bold text-primary">
                                    Pattern: {(latest.formData as any)?.adaptive_insights?.phq_analysis?.dominant_cluster}
                                  </div>
                                  <p className="text-text-muted text-[11px]">
                                    {(latest.formData as any)?.adaptive_insights?.phq_analysis?.ai_clinical_observation}
                                  </p>
                                </div>
                              )}
                              {/* Anxiety follow-up */}
                              {(latest.formData as any)?.adaptive_insights?.gad_analysis && (
                                <div className="bg-white p-3 rounded-xl border border-border/80 space-y-1.5">
                                  <div className="font-bold text-secondary">
                                    Pattern: {(latest.formData as any)?.adaptive_insights?.gad_analysis?.dominant_cluster}
                                  </div>
                                  <p className="text-text-muted text-[11px]">
                                    {(latest.formData as any)?.adaptive_insights?.gad_analysis?.ai_clinical_observation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Longitudinal History List */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> Assessment Timeline ({patientDetail.history.length} records)
                    </h4>
                    <div className="space-y-2">
                      {patientDetail.history.map((hist, i) => (
                        <div
                          key={hist._id || i}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-text-muted">#{patientDetail.history.length - i}</span>
                            <div>
                              <div className="font-semibold text-text-main">
                                {new Date(hist.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-[11px] text-text-muted">
                                Score: {hist.overallScore}/100 • Sleep: {hist.sleep?.score ?? 0}/28
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <RiskBadge
                              label={(hist.depression?.level || hist.anxiety?.level || 'Low') as any}
                              size="sm"
                            />
                            {hist.crisis_flag && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                Crisis Flag
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end bg-slate-50/50">
              <button
                onClick={() => { setSelectedPatientId(null); setPatientDetail(null); }}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-text-main font-semibold text-xs transition-colors"
              >
                Close Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
