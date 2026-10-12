'use client';

import { useState } from 'react';
import { HelpCircle, Sparkles, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { Assessment, ShapExplanation } from '@/lib/api';

interface ShapImpactChartProps {
  assessment: Assessment;
}

const CONDITIONS = [
  { key: 'depression', label: 'Depression', questionnaire: 'PHQ-9 / DASS-42' },
  { key: 'anxiety', label: 'Anxiety', questionnaire: 'GAD-7 / DASS-42' },
  { key: 'stress', label: 'Stress', questionnaire: 'DASS-21 Stress' },
] as const;

export default function ShapImpactChart({ assessment }: ShapImpactChartProps) {
  const [activeTab, setActiveTab] = useState<'depression' | 'anxiety' | 'stress'>('depression');

  const currentCondition = CONDITIONS.find(c => c.key === activeTab) || CONDITIONS[0];
  const res = assessment[activeTab];

  // Extract SHAP items
  const rawShapList: ShapExplanation[] = (res?.shap_explanation && res.shap_explanation.length > 0)
    ? res.shap_explanation
    : ((assessment.shapValues?.[activeTab] || []).map(s => ({
        feature: s.feature,
        description: s.feature,
        value: s.value,
        impact: s.value
      })));

  // Normalize factors and ensure readable labels
  const factors = (rawShapList || []).map((item) => {
    const rawImpact = typeof item.impact === 'number' ? item.impact : parseFloat(item.impact as any) || 0;
    const isZero = item.value === 0 && rawImpact === 0;

    // Categorize source
    let sourceType: 'nlp' | 'sleep' | 'questionnaire' = 'questionnaire';
    if (item.feature.includes('NLP') || (item.description && item.description.includes('Emotional Text'))) {
      sourceType = 'nlp';
    } else if (item.feature.includes('ISI') || (item.description && item.description.includes('Sleep'))) {
      sourceType = 'sleep';
    }

    return {
      feature: item.feature,
      description: item.description || item.feature,
      impact: rawImpact,
      isZero,
      sourceType,
      value: item.value,
    };
  });

  // Calculate maximum absolute impact for percentage scaling
  const maxAbsImpact = Math.max(...factors.map(f => Math.abs(f.impact)), 0.1);

  // Compute positive and negative totals
  const positiveDrivers = factors.filter(f => f.impact > 0);
  const protectiveDrivers = factors.filter(f => f.impact <= 0);

  const totalPositive = positiveDrivers.reduce((acc, f) => acc + f.impact, 0);
  const totalNegative = protectiveDrivers.reduce((acc, f) => acc + Math.abs(f.impact), 0);

  const getSourceBadge = (type: 'nlp' | 'sleep' | 'questionnaire') => {
    switch (type) {
      case 'nlp':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200">GoEmotions NLP</span>;
      case 'sleep':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">Sleep ISI</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">Clinical Scale</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <HelpCircle className="h-4 w-4" />
            <span>Explainable AI (XAI) Attribution</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-main">
            SHAP Mathematical Symptom Contributions
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Deconstructs the exact influence of each self-reported symptom and multimodal cue on the prediction.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Elevates Risk (+)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Protective / Buffer (−)</span>
          </div>
        </div>
      </div>

      {/* Subscale Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {CONDITIONS.map((c) => {
          const isActive = activeTab === c.key;
          const subRes = assessment[c.key];
          const level = subRes?.label || 'Low';
          return (
            <button
              key={c.key}
              onClick={() => setActiveTab(c.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-text-muted hover:text-text-main'
              }`}
            >
              <span>{c.label} Drivers</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-white text-text-muted'
              }`}>
                {level}
              </span>
            </button>
          );
        })}
      </div>

      {/* SHAP Waterfall Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Cumulative Risk Drivers</span>
            <strong className="text-rose-700 font-bold text-sm">+{totalPositive.toFixed(3)} SHAP</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <ArrowDownRight className="h-4 w-4" />
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Protective / Resilience Buffers</span>
            <strong className="text-emerald-700 font-bold text-sm">-{totalNegative.toFixed(3)} SHAP</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Predicted Risk Level</span>
            <strong className="text-text-main font-bold text-sm capitalize">
              {res?.label || 'Low'} Risk ({currentCondition.questionnaire})
            </strong>
          </div>
        </div>
      </div>

      {/* Horizontal Divergent SHAP Bars */}
      <div className="space-y-4 pt-1">
        {factors.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            No SHAP attribution records available for this subscale.
          </p>
        ) : (
          factors.map((factor, index) => {
            const isPositive = factor.impact > 0;
            const absRatio = Math.min(100, Math.round((Math.abs(factor.impact) / maxAbsImpact) * 100));
            const formattedImpact = isPositive
              ? `+${factor.impact.toFixed(3)}`
              : `${factor.impact.toFixed(3)}`;

            return (
              <div
                key={index}
                className="group p-3.5 rounded-2xl border border-border/80 hover:border-primary/40 bg-white hover:bg-slate-50/40 transition-all duration-150 space-y-2"
              >
                {/* Title & Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-text-main text-sm truncate">
                      {factor.description}
                    </span>
                    {getSourceBadge(factor.sourceType)}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] text-text-muted">Impact:</span>
                    <strong
                      className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                        isPositive
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : factor.impact === 0
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {formattedImpact}
                    </strong>
                  </div>
                </div>

                {/* Horizontal Bar Visual */}
                <div className="relative h-6 w-full bg-slate-100/90 rounded-xl overflow-hidden flex items-center p-1 border border-border/50">
                  {/* Centerline (zero baseline) */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />

                  {/* Left Side (Negative / Protective) */}
                  <div className="w-1/2 h-full flex justify-end pr-0.5">
                    {!isPositive && factor.impact !== 0 && (
                      <div
                        className="h-full bg-gradient-to-l from-emerald-500 to-teal-600 rounded-lg transition-all duration-700 flex items-center justify-start pl-2 text-[10px] font-bold text-white shadow-sm"
                        style={{ width: `${absRatio}%` }}
                      >
                        <span className="opacity-90">{factor.impact.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side (Positive / Risk Driver) */}
                  <div className="w-1/2 h-full flex justify-start pl-0.5">
                    {isPositive && (
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-lg transition-all duration-700 flex items-center justify-end pr-2 text-[10px] font-bold text-white shadow-sm"
                        style={{ width: `${absRatio}%` }}
                      >
                        <span className="opacity-90">+{factor.impact.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contextual Annotation */}
                <div className="flex justify-between items-center text-[11px] text-text-muted">
                  <span>
                    {factor.sourceType === 'nlp'
                      ? 'Affective language in journal adjusted classification score'
                      : factor.sourceType === 'sleep'
                      ? 'Sleep impairment index calibrated biological distress load'
                      : `Questionnaire response: ${factor.value !== undefined ? `Rating ${factor.value}/3` : 'Reported'}`}
                  </span>
                  <span className={isPositive ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                    {isPositive ? '▲ Increases Risk' : '▼ Lowers Risk'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clinical Footnote */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-primary-light/50 border border-primary/20 text-xs text-primary-dark">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
        <p className="leading-relaxed">
          <strong>Explainable AI Verification:</strong> SHAP values are derived mathematically via cooperative game theory Shapley values using TreeExplainer. Positive scores (+SHAP) demonstrate which symptoms pushed the patient toward clinical intervention thresholds.
        </p>
      </div>
    </div>
  );
}
