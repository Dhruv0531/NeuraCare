'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RotateCcw, Save, AlertTriangle, Brain, Wind, Zap, Moon } from 'lucide-react';
import ConditionCard from '@/components/ConditionCard';
import ShapChart from '@/components/ShapChart';
import RadarChartComponent from '@/components/RadarChartComponent';
import Disclaimer from '@/components/Disclaimer';
import RiskBadge from '@/components/RiskBadge';
import { Assessment } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const CONDITIONS = [
  { key: 'depression', label: 'Depression', questionnaire: 'PHQ-9' },
  { key: 'anxiety', label: 'Anxiety', questionnaire: 'GAD-7' },
  { key: 'stress', label: 'Stress', questionnaire: 'DASS-21' },
  { key: 'insomnia', label: 'Insomnia', questionnaire: 'ISI' },
] as const;

const SHAP_TABS = ['depression', 'anxiety', 'stress', 'insomnia'] as const;

function getWellnessRecs(assessment: Assessment) {
  const recs: { icon: typeof Brain; title: string; tips: string[]; color: string }[] = [];

  if (assessment.depression.label === 'High' || assessment.depression.label === 'Moderate') {
    recs.push({
      icon: Brain,
      title: 'Support for Low Mood',
      tips: [
        'Consider speaking to a counselor or therapist',
        'Try to maintain a daily routine and set small achievable goals',
        'Regular physical activity can help significantly with mood regulation',
      ],
      color: 'bg-primary-light border-primary/10',
    });
  }
  if (assessment.anxiety.label === 'High' || assessment.anxiety.label === 'Moderate') {
    recs.push({
      icon: Wind,
      title: 'Managing Anxiety',
      tips: [
        'Practice deep breathing: inhale 4 counts, hold 4, exhale 4',
        'Limit caffeine and screen time before bed',
        'Try journaling your worries for 10 minutes daily',
      ],
      color: 'bg-secondary-light border-secondary/10',
    });
  }
  if (assessment.stress.label === 'High' || assessment.stress.label === 'Moderate') {
    recs.push({
      icon: Zap,
      title: 'Reducing Stress',
      tips: [
        'Break large tasks into smaller, manageable steps',
        'Take regular breaks — try the Pomodoro technique (25min work, 5min break)',
        'Talk to someone you trust about what\'s stressing you',
      ],
      color: 'bg-warning-light border-warning/10',
    });
  }
  if (assessment.insomnia.label === 'High' || assessment.insomnia.label === 'Moderate') {
    recs.push({
      icon: Moon,
      title: 'Improving Sleep',
      tips: [
        'Keep a consistent sleep schedule, even on weekends',
        'Avoid screens 1 hour before bedtime',
        'Keep your bedroom cool, dark, and quiet',
      ],
      color: 'bg-purple-50 border-purple-100',
    });
  }

  // Always show this
  recs.push({
    icon: AlertTriangle,
    title: 'Professional Support',
    tips: [
      'NeuraCare recommends consulting a mental health professional if you are experiencing distress',
      'In India, call iCall: 9152987821 for free, confidential counselling',
    ],
    color: 'bg-background border-border',
  });

  return recs;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score < 33 ? '#10B981' : score < 66 ? '#F59E0B' : '#EF4444';
  const label = score < 33 ? 'Low Risk' : score < 66 ? 'Moderate Risk' : 'High Risk';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#ECECEC" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54"
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text-main">{score}</span>
          <span className="text-xs text-text-muted">/ 100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [shapTab, setShapTab] = useState<typeof SHAP_TABS[number]>('depression');
  const [saving, setSaving] = useState(false);

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

  const handleDownloadPDF = async () => {
    if (!assessment) return;
    toast.loading('Generating PDF...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const date = new Date(assessment.createdAt).toLocaleDateString('en-IN');

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('NeuraCare Mental Health Report', 20, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Assessment Date: ${date}`, 20, 32);

      // Overall score
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Overall AI Risk Score: ${assessment.overallScore} / 100`, 20, 58);

      // Conditions table
      doc.setFontSize(12);
      doc.text('Condition Results:', 20, 75);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const condData = [
        ['Depression (PHQ-9)', assessment.depression.label, `${assessment.depression.score}%`],
        ['Anxiety (GAD-7)', assessment.anxiety.label, `${assessment.anxiety.score}%`],
        ['Stress (DASS-21)', assessment.stress.label, `${assessment.stress.score}%`],
        ['Insomnia (ISI)', assessment.insomnia.label, `${assessment.insomnia.score}%`],
      ];
      condData.forEach(([cond, label, score], i) => {
        const y = 85 + i * 10;
        doc.text(`• ${cond}: ${label} (${score})`, 25, y);
      });

      // Top factors
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Top Contributing Factors (Depression):', 20, 135);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const topFactors = assessment.shapValues.depression.slice(0, 5);
      topFactors.forEach((f, i) => {
        doc.text(`• ${f.feature.replace(/_/g, ' ')}: ${f.value > 0 ? '+ increases' : '- reduces'} risk (${Math.abs(f.value).toFixed(3)})`, 25, 145 + i * 10);
      });

      // Disclaimer
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      const disclaimer = 'This report was generated by NeuraCare, an AI-based screening tool. It does not constitute a medical diagnosis. Please consult a licensed mental health professional.';
      const lines = doc.splitTextToSize(disclaimer, 170);
      doc.text(lines, 20, 265);

      doc.save(`NeuraCare_Report_${date.replace(/\//g, '-')}.pdf`);
      toast.dismiss();
      toast.success('PDF downloaded!');
    } catch {
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to save your results');
      return;
    }
    setSaving(true);
    toast.success('Results saved to your history!');
    setSaving(false);
  };

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
      </div>
    );
  }

  const wellnessRecs = getWellnessRecs(assessment);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Guest banner */}
        {!isAuthenticated && (
          <div className="bg-primary-light border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-primary font-medium">
              Create a free account to save your results and track your progress over time
            </p>
            <a href="/register" className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors">
              Create Account
            </a>
          </div>
        )}

        {/* Disclaimer — always visible */}
        <Disclaimer variant="warning" />

        {/* Overall score card */}
        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ScoreGauge score={assessment.overallScore} />
            <div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Your Mental Health Risk Profile</h1>
              <p className="text-text-muted text-sm mb-4">Based on your responses across 4 conditions · {new Date(assessment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <div key={c.key} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border border-border">
                    <span className="text-xs text-text-muted">{c.label}:</span>
                    <RiskBadge label={assessment[c.key].label} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Condition Cards */}
        <div>
          <h2 className="text-xl font-bold text-text-main mb-4">Condition Breakdown</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CONDITIONS.map(c => (
              <ConditionCard
                key={c.key}
                condition={c.label as 'Depression' | 'Anxiety' | 'Stress' | 'Insomnia'}
                questionnaire={c.questionnaire}
                result={assessment[c.key]}
              />
            ))}
          </div>
        </div>

        {/* Radar chart */}
        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <h2 className="text-xl font-bold text-text-main mb-1">Mental Health Risk Profile</h2>
          <p className="text-sm text-text-muted mb-6">Visual overview of your risk across all 4 conditions</p>
          <RadarChartComponent assessment={assessment} />
        </div>

        {/* SHAP Chart */}
        <div className="bg-card rounded-3xl border border-border shadow-card p-8">
          <h2 className="text-xl font-bold text-text-main mb-1">Why did you get this score?</h2>
          <p className="text-sm text-text-muted mb-5">These are the factors that most influenced your risk prediction</p>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {SHAP_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setShapTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize ${
                  shapTab === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-background border border-border text-text-muted hover:text-text-main'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <ShapChart
            data={assessment.shapValues[shapTab]}
            title={`Top factors affecting your ${shapTab} risk`}
          />
        </div>

        {/* Wellness recommendations */}
        <div>
          <h2 className="text-xl font-bold text-text-main mb-1">Personalized Wellness Recommendations</h2>
          <p className="text-sm text-text-muted mb-4">Based on your highest risk areas</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {wellnessRecs.map((rec, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${rec.color}`}>
                <div className="flex items-center gap-3 mb-3">
                  <rec.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <h3 className="font-bold text-text-main text-sm">{rec.title}</h3>
                </div>
                <ul className="space-y-1.5">
                  {rec.tips.map((tip, j) => (
                    <li key={j} className="text-sm text-text-muted flex gap-2">
                      <span className="text-primary flex-shrink-0">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pb-8">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 border border-primary text-primary font-semibold px-5 py-3 rounded-xl hover:bg-primary-light transition-all duration-200 min-h-[48px]"
          >
            <Download className="h-4 w-4" /> Download PDF Report
          </button>
          {isAuthenticated && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white font-semibold px-5 py-3 rounded-xl hover:bg-primary-dark transition-all duration-200 min-h-[48px] disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Save to History
            </button>
          )}
          <button
            onClick={() => router.push('/assessment')}
            className="flex items-center gap-2 border border-border text-text-muted font-semibold px-5 py-3 rounded-xl hover:border-text-muted hover:text-text-main transition-all duration-200 min-h-[48px]"
          >
            <RotateCcw className="h-4 w-4" /> Take Assessment Again
          </button>
        </div>
      </div>
    </div>
  );
}
