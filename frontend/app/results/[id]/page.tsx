'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Assessment } from '@/lib/api';
import ConditionCard from '@/components/ConditionCard';
import ShapChart from '@/components/ShapChart';
import RadarChartComponent from '@/components/RadarChartComponent';
import Disclaimer from '@/components/Disclaimer';
import RiskBadge from '@/components/RiskBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

const CONDITIONS = [
  { key: 'depression', label: 'Depression', questionnaire: 'PHQ-9' },
  { key: 'anxiety', label: 'Anxiety', questionnaire: 'GAD-7' },
  { key: 'stress', label: 'Stress', questionnaire: 'DASS-21' },
  { key: 'insomnia', label: 'Insomnia', questionnaire: 'ISI' },
] as const;

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shapTab, setShapTab] = useState<'depression' | 'anxiety' | 'stress' | 'insomnia'>('depression');

  useEffect(() => {
    api.getAssessment(id)
      .then(setAssessment)
      .catch(() => setError('Assessment not found or you do not have access.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><LoadingSpinner text="Loading assessment..." /></div>;
  if (error || !assessment) return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
      <p className="text-text-muted">{error}</p>
      <button onClick={() => router.push('/history')} className="text-primary font-semibold hover:underline">Back to History</button>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => router.push('/history')} className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to History
        </button>

        <Disclaimer variant="warning" />

        {/* Immediate Deterministic Crisis Intervention Banner */}
        {(assessment.crisis_flag || assessment.crisis_guidance?.alert) && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-red-950 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <h2 className="text-lg font-bold text-red-900">
                Immediate Crisis Support & Resources
              </h2>
            </div>
            <p className="text-sm font-medium text-red-800 leading-relaxed">
              {assessment.crisis_guidance?.message || 'Your responses indicate thoughts of self-harm or severe emotional distress. Confidential, free help is available right now 24/7.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {(assessment.crisis_guidance?.resources || [
                { name: 'Suicide & Crisis Lifeline (US)', contact: 'Call or text 988', web: 'https://988lifeline.org' },
                { name: 'Crisis Text Line', contact: 'Text HOME to 741741', web: 'https://www.crisistextline.org' },
                { name: 'Tele-MANAS (India)', contact: 'Toll-Free 14416 / 1800-891-4416', web: 'https://telemanas.mohfw.gov.in' },
                { name: 'International Helplines', contact: 'Find local confidential support', web: 'https://findahelpline.com' }
              ]).map((r: any, idx: number) => (
                <div key={idx} className="bg-white/80 border border-red-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-red-900">{r.name}</div>
                  <div className="text-red-700 font-semibold">{r.contact}</div>
                  {r.web && (
                    <a href={r.web} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                      {r.web.replace('https://', '')}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h1 className="text-2xl font-bold text-text-main">Assessment Results</h1>
            {assessment.scoringMode === 'ml_multimodal' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                AI Multimodal Engine (XGBoost + DistilBERT + ISI)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Standard Clinical Scoring (Validated Rule-Engine)
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm mb-4">
            {new Date(assessment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <div key={c.key} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border border-border">
                <span className="text-xs text-text-muted">{c.label}:</span>
                <RiskBadge label={assessment[c.key].label} size="sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {CONDITIONS.map(c => (
            <ConditionCard key={c.key} condition={c.label as 'Depression' | 'Anxiety' | 'Stress' | 'Insomnia'} questionnaire={c.questionnaire} result={assessment[c.key]} />
          ))}
        </div>

        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <h2 className="text-xl font-bold text-text-main mb-6">Risk Profile</h2>
          <RadarChartComponent assessment={assessment} />
        </div>

        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <h2 className="text-xl font-bold text-text-main mb-4">Key Factors</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {(['depression', 'anxiety', 'stress', 'insomnia'] as const).map(tab => (
              <button key={tab} onClick={() => setShapTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize ${shapTab === tab ? 'bg-primary text-white' : 'bg-background border border-border text-text-muted hover:text-text-main'}`}>
                {tab}
              </button>
            ))}
          </div>
          <ShapChart data={assessment.shapValues?.[shapTab] || (assessment[shapTab]?.shap_explanation || []).map((s: any) => ({ feature: s.description || s.feature, value: s.impact ?? s.value }))} />
        </div>
      </div>
    </div>
  );
}
