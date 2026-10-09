'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, HelpCircle, Sparkles, Moon, Lightbulb, CheckCircle2, BarChart2 } from 'lucide-react';
import Disclaimer from '@/components/Disclaimer';
import RiskBadge from '@/components/RiskBadge';
import RadarChartComponent from '@/components/RadarChartComponent';
import { Assessment, EmotionData, SleepData, ShapExplanation } from '@/lib/api';

const CONDITIONS = [
  { key: 'depression', label: 'Depression', questionnaire: 'PHQ-9 / DASS' },
  { key: 'anxiety', label: 'Anxiety', questionnaire: 'GAD-7 / DASS' },
  { key: 'stress', label: 'Stress', questionnaire: 'DASS-21' },
] as const;

const DEFAULT_CLINICAL_RECOMMENDATIONS = {
  Low: [
    "Practice 10-15 minutes of daily mindfulness meditation to maintain emotional stability.",
    "Maintain a consistent sleep schedule (7-8 hours per night) and limit blue light exposure before bedtime.",
    "Engage in moderate physical exercise (such as 30 minutes of brisk walking) at least 4 days a week.",
    "Keep a daily gratitude journal to foster positive cognitive framing."
  ],
  Moderate: [
    "Implement box breathing exercises (4 seconds in, 4 hold, 4 out, 4 hold) during moments of heightened tension.",
    "Schedule structured 15-minute 'worry windows' to prevent persistent rumination throughout the day.",
    "Establish bedtime sleep hygiene rituals and avoid caffeine or heavy meals after 6 PM.",
    "Reach out to a trusted friend, counselor, or support group to share your current feelings."
  ],
  High: [
    "Consult a licensed mental health professional or clinical psychologist for a comprehensive evaluation.",
    "Practice grounded sensory exercises (the 5-4-3-2-1 technique) to reduce acute anxiety and autonomic panic.",
    "Break daily activities into small, low-pressure steps to reduce feelings of executive overload.",
    "Ensure immediate access to helpline support networks and avoid isolating yourself during difficult moments."
  ]
};

const getRiskLabel = (obj: any): 'Low' | 'Moderate' | 'High' => {
  if (!obj) return 'Low';
  if (obj.probabilities) {
    const { low = 0, moderate = 0, high = 0 } = obj.probabilities;
    if (high >= moderate && high >= low && high > 0) return 'High';
    if (moderate >= low && moderate > 0) return 'Moderate';
    if (low > 0) return 'Low';
  }
  const l = obj.label || obj.level;
  if (l === 'High' || l === 'Moderate' || l === 'Low') return l;
  return 'Low';
};

export default function ResultsPage() {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('neuracare_result');
      if (raw) {
        setAssessment(JSON.parse(raw));
      } else {
        router.push('/assessment');
      }
    } catch {
      router.push('/assessment');
    }
  }, [router]);

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
      </div>
    );
  }

  const depLevel = getRiskLabel(assessment.depression);
  const anxLevel = getRiskLabel(assessment.anxiety);
  const strLevel = getRiskLabel(assessment.stress);

  const levels = [depLevel, anxLevel, strLevel];
  const overallRisk = levels.includes('High') ? 'High' : (levels.includes('Moderate') ? 'Moderate' : 'Low');

  const sleepData: SleepData = assessment.sleep || {
    level: (assessment.insomnia?.label as 'Low' | 'Moderate' | 'High') || 'Low',
    score: assessment.insomnia?.score || 0,
    max_score: 28,
    category: 'No clinically significant insomnia'
  };

  // Ensure Sleep Score is properly capped at max 28 (fixes 48/28 bug)
  const rawSleepScore = sleepData.score ?? 0;
  const displaySleepScore = rawSleepScore > 28 ? Math.min(28, Math.round((rawSleepScore / 100) * 28)) : rawSleepScore;

  const emotionData: EmotionData = assessment.emotion || {
    status: 'not_available',
    message: 'No optional journal text was provided for emotion analysis',
    emotions: []
  };

  const recommendations: string[] = (assessment.recommendations && assessment.recommendations.length > 0)
    ? assessment.recommendations
    : DEFAULT_CLINICAL_RECOMMENDATIONS[overallRisk];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Disclaimer — top warning */}
        <Disclaimer variant="warning" />

        {/* Overall Score Header Banner */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-8 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Overall Screening Status</span>
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main">
              {overallRisk.toUpperCase()} RISK
            </h1>
            <RiskBadge label={overallRisk} size="lg" />
          </div>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            Based on structured screening items evaluated by our trained XGBoost Machine Learning models.
          </p>
        </div>

        {/* 3 Subscale Cards */}
        <div>
          <h2 className="text-xl font-bold text-text-main mb-4">Risk Subscale Breakdown</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {CONDITIONS.map(c => {
              const res = assessment[c.key];
              if (!res) return null;
              const subRisk = getRiskLabel(res);
              return (
                <div key={c.key} className="bg-white rounded-2xl border border-border p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-text-main">{c.label}</h3>
                    <RiskBadge label={subRisk} size="sm" />
                  </div>
                  <p className="text-xs text-text-muted">{c.questionnaire}</p>
                  {res.probabilities && (
                    <div className="text-xs text-text-muted pt-2 border-t border-border/60 flex justify-between">
                      <span>Low: {Math.round((res.probabilities.low || 0) * 100)}%</span>
                      <span>Mod: {Math.round((res.probabilities.moderate || 0) * 100)}%</span>
                      <span>High: {Math.round((res.probabilities.high || 0) * 100)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Radar Chart Representation */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <BarChart2 className="h-5 w-5" />
            <h2 className="text-xl font-bold text-text-main">Multi-Axial Risk Profile Graph</h2>
          </div>
          <p className="text-sm text-text-muted">
            Radar visualization comparing risk severity across Depression, Anxiety, Stress, and Insomnia:
          </p>
          <div className="pt-2">
            <RadarChartComponent assessment={assessment} />
          </div>
        </div>

        {/* SHAP Feature Contribution Section */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <HelpCircle className="h-5 w-5" />
            <h2 className="text-xl font-bold text-text-main">Why did the model produce this result?</h2>
          </div>
          <p className="text-sm text-text-muted">
            SHAP (SHapley Additive exPlanations) key contributing factors identified by our XGBoost explainability module:
          </p>

          <div className="space-y-4">
            {CONDITIONS.map(c => {
              const res = assessment[c.key];
              const shapList: ShapExplanation[] = (res?.shap_explanation && res.shap_explanation.length > 0)
                ? res.shap_explanation
                : ((assessment.shapValues?.[c.key] || []).map(s => ({
                    feature: s.feature,
                    description: s.feature,
                    value: s.value,
                    impact: s.value
                  })));

              if (!shapList || shapList.length === 0) return null;

              return (
                <div key={c.key} className="bg-background rounded-2xl p-5 border border-border space-y-3">
                  <h4 className="font-bold text-sm text-primary capitalize">Factors Influencing {c.label}:</h4>
                  <div className="space-y-2">
                    {shapList.map((item, idx) => {
                      const isZeroValue = (item.value === 0 || item.impact === 0);
                      const isPositiveRisk = item.impact > 0 && !isZeroValue;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-white border border-border">
                          <span className="font-medium text-text-main">
                            {item.description || item.feature}
                          </span>
                          <span className={`font-bold px-2.5 py-1 rounded-full ${
                            isPositiveRisk
                              ? 'bg-red-50 text-red-600'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {isZeroValue
                              ? 'Symptom Absent (Lowers Risk)'
                              : isPositiveRisk
                                ? `High Risk Influence (+${item.impact})`
                                : `Protective Factor (${item.impact})`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GoEmotions DistilBERT NLP Section */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-secondary">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-xl font-bold text-text-main">Detected Emotional Language Indicators</h2>
          </div>

          {emotionData.status === 'not_available' || !emotionData.emotions || emotionData.emotions.length === 0 ? (
            <div className="p-4 rounded-2xl bg-background border border-border text-sm text-text-muted">
              ℹ️ {emotionData.message || 'No optional journal text was provided for emotion analysis.'}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {emotionData.emotions.map((item, i) => {
                const pct = Math.round(item.score * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm font-semibold text-text-main capitalize">
                      <span>{item.label}</span>
                      <span className="text-primary">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-background rounded-full overflow-hidden border border-border/50">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Personal Wellness Recommendations (OpenRouter LLM) */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <Lightbulb className="h-5 w-5" />
            <h2 className="text-xl font-bold text-text-main">AI Personalized Wellness Action Plan</h2>
          </div>

          <div className="space-y-3 pt-2">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-950 font-medium leading-relaxed">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sleep Quality Card */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Moon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-text-main">Sleep Quality (Insomnia Severity Index)</h3>
              <p className="text-xs text-text-muted">
                Score: {displaySleepScore} / {sleepData.max_score || 28} • {sleepData.category || 'No clinically significant insomnia'}
              </p>
            </div>
          </div>
          <RiskBadge label={sleepData.level || 'Low'} size="md" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pb-8">
          <button
            onClick={() => router.push('/assessment')}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold px-5 py-3.5 rounded-xl hover:bg-primary-dark transition-all duration-200 min-h-[48px]"
          >
            <RotateCcw className="h-4 w-4" /> Retake Assessment
          </button>
          <button
            onClick={() => router.push('/history')}
            className="flex-1 flex items-center justify-center gap-2 border border-border text-text-main font-semibold px-5 py-3.5 rounded-xl hover:bg-background transition-all duration-200 min-h-[48px]"
          >
            View Assessment History
          </button>
        </div>
      </div>
    </div>
  );
}
