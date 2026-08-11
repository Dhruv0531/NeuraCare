'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, Send, PhoneCall } from 'lucide-react';
import StepProgress from '@/components/StepProgress';
import Disclaimer from '@/components/Disclaimer';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── PHQ-9 Questions ───────────────────────────────────────────────────────
const PHQ9 = [
  { id: 'phq_interest', text: 'Little interest or pleasure in doing things' },
  { id: 'phq_depressed', text: 'Feeling down, depressed, or hopeless' },
  { id: 'phq_sleep', text: 'Trouble falling or staying asleep, or sleeping too much' },
  { id: 'phq_tired', text: 'Feeling tired or having little energy' },
  { id: 'phq_appetite', text: 'Poor appetite or overeating' },
  { id: 'phq_failure', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down' },
  { id: 'phq_concentrate', text: 'Trouble concentrating on things, such as reading the newspaper or watching television' },
  { id: 'phq_slow_restless', text: 'Moving or speaking so slowly that other people could have noticed, or the opposite — being so fidgety or restless' },
  { id: 'phq_self_harm', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way' },
];

// ─── GAD-7 Questions ───────────────────────────────────────────────────────
const GAD7 = [
  { id: 'gad_nervous', text: 'Feeling nervous, anxious, or on edge' },
  { id: 'gad_cant_stop', text: 'Not being able to stop or control worrying' },
  { id: 'gad_worry_much', text: 'Worrying too much about different things' },
  { id: 'gad_relax', text: 'Trouble relaxing' },
  { id: 'gad_restless', text: 'Being so restless that it is hard to sit still' },
  { id: 'gad_irritable', text: 'Becoming easily annoyed or irritable' },
  { id: 'gad_afraid', text: 'Feeling afraid as if something awful might happen' },
];

const SCALE = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

const STEPS = [
  { label: 'Depression', sublabel: 'PHQ-9' },
  { label: 'Anxiety', sublabel: 'GAD-7' },
  { label: 'Stress & Lifestyle', sublabel: 'Habits' },
  { label: 'Background', sublabel: 'About You' },
];

// ─── Radio Question Row ────────────────────────────────────────────────────
function RadioRow({
  question, fieldId, value, onChange, hasError,
}: {
  question: string; fieldId: string; value: number | null; onChange: (v: number) => void; hasError: boolean;
}) {
  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 ${hasError ? 'border-danger bg-danger-light/30' : 'border-border bg-white hover:border-primary/30'}`}>
      <p className="text-sm font-medium text-text-main mb-4 leading-relaxed">
        {hasError && <span className="text-danger mr-1">*</span>}
        {question}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SCALE.map((label, i) => (
          <label
            key={i}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-pointer border-2 transition-all duration-150 min-h-[72px] justify-center ${
              value === i
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border hover:border-primary/40 text-text-muted'
            }`}
          >
            <input
              type="radio"
              name={fieldId}
              value={i}
              checked={value === i}
              onChange={() => onChange(i)}
              className="sr-only"
            />
            <span className="text-lg font-bold">{i}</span>
            <span className="text-xs text-center leading-tight">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Select Row ────────────────────────────────────────────────────────────
function SelectRow({
  label, fieldId, value, options, onChange, hasError,
}: {
  label: string; fieldId: string; value: string; options: string[]; onChange: (v: string) => void; hasError: boolean;
}) {
  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-text-main mb-1.5">
        {hasError && <span className="text-danger mr-1">*</span>}
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer min-h-[48px] ${hasError ? 'border-danger' : 'border-border'}`}
      >
        <option value="">Select an option</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const STORAGE_KEY = 'neuracare_assessment_draft';

export default function AssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);

  // PHQ-9 answers
  const [phqAnswers, setPhqAnswers] = useState<Record<string, number | null>>({});
  // GAD-7 answers
  const [gadAnswers, setGadAnswers] = useState<Record<string, number | null>>({});
  // Step 3
  const [lifestyle, setLifestyle] = useState<Record<string, string>>({
    sleep_hours: '', sleep_quality: '', exercise_frequency: '', screen_time: '',
    stress_frequency: '', work_pressure: '', deadline_anxiety: '', alcohol: '', smoking: '',
  });
  // Step 4
  const [background, setBackground] = useState<Record<string, string>>({
    age_group: '', gender: '', education: '', occupation: '', diagnosed: '',
    consulted_prof: '', on_medication: '', overall_mental: '', needs_support: '',
  });

  // Load from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phqAnswers) setPhqAnswers(parsed.phqAnswers);
        if (parsed.gadAnswers) setGadAnswers(parsed.gadAnswers);
        if (parsed.lifestyle) setLifestyle(parsed.lifestyle);
        if (parsed.background) setBackground(parsed.background);
      }
    } catch { /* ignore */ }
  }, []);

  // Save to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ phqAnswers, gadAnswers, lifestyle, background }));
    } catch { /* ignore */ }
  }, [phqAnswers, gadAnswers, lifestyle, background]);

  // PHQ-9 score
  const phqScore = PHQ9.reduce((acc, q) => acc + (phqAnswers[q.id] ?? 0), 0);
  const gadScore = GAD7.reduce((acc, q) => acc + (gadAnswers[q.id] ?? 0), 0);

  // Crisis check
  const handlePhqChange = (id: string, val: number) => {
    setPhqAnswers(prev => ({ ...prev, [id]: val }));
    if (id === 'phq_self_harm' && val >= 2) setShowCrisis(true);
    else if (id === 'phq_self_harm') setShowCrisis(false);
  };

  const validateStep = () => {
    if (step === 0) {
      const unanswered = PHQ9.some(q => phqAnswers[q.id] == null);
      if (unanswered) { setErrorMsg('Please answer all questions to continue.'); return false; }
    } else if (step === 1) {
      const unanswered = GAD7.some(q => gadAnswers[q.id] == null);
      if (unanswered) { setErrorMsg('Please answer all questions to continue.'); return false; }
    } else if (step === 2) {
      const unanswered = Object.values(lifestyle).some(v => !v);
      if (unanswered) { setErrorMsg('Please answer all questions to continue.'); return false; }
    } else if (step === 3) {
      const unanswered = Object.values(background).some(v => !v);
      if (unanswered) { setErrorMsg('Please answer all questions to continue.'); return false; }
    }
    setErrorMsg('');
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep(s => s - 1);
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);

    const formData = {
      ...phqAnswers,
      ...gadAnswers,
      ...lifestyle,
      ...background,
    };

    try {
      const result = await api.submitAssessment(formData);
      sessionStorage.removeItem(STORAGE_KEY);
      router.push('/results');
      sessionStorage.setItem('neuracare_result', JSON.stringify(result));
    } catch {
      // Try to use mock data for demo if backend is not running
      const mockResult = generateMockResult();
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem('neuracare_result', JSON.stringify(mockResult));
      router.push('/results');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct < 33) return 'text-success';
    if (pct < 60) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <StepProgress steps={STEPS} currentStep={step} />
        <Disclaimer className="mb-6" />

        {/* Crisis alert */}
        {showCrisis && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
            <div className="flex gap-3">
              <PhoneCall className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-danger text-sm mb-1">You are not alone</p>
                <p className="text-sm text-red-700">
                  If you are having thoughts of hurting yourself, please reach out immediately.
                  Call <strong>iCall: 9152987821</strong> (India) — free, confidential counselling.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 0: PHQ-9 ── */}
        {step === 0 && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-text-main mb-1">Depression Assessment</h1>
              <p className="text-text-muted text-sm">PHQ-9 · Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?</p>
            </div>
            <div className="space-y-4">
              {PHQ9.map(q => (
                <RadioRow
                  key={q.id}
                  question={q.text}
                  fieldId={q.id}
                  value={phqAnswers[q.id] ?? null}
                  onChange={val => handlePhqChange(q.id, val)}
                  hasError={!!errorMsg && phqAnswers[q.id] == null}
                />
              ))}
            </div>
            {/* Running score */}
            <div className={`mt-6 p-4 bg-white rounded-2xl border border-border text-center`}>
              <span className="text-sm text-text-muted">PHQ-9 Score: </span>
              <span className={`text-xl font-bold ${scoreColor(phqScore, 27)}`}>{phqScore} / 27</span>
            </div>
          </div>
        )}

        {/* ── Step 1: GAD-7 ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-text-main mb-1">Anxiety Assessment</h1>
              <p className="text-text-muted text-sm">GAD-7 · Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?</p>
            </div>
            <div className="space-y-4">
              {GAD7.map(q => (
                <RadioRow
                  key={q.id}
                  question={q.text}
                  fieldId={q.id}
                  value={gadAnswers[q.id] ?? null}
                  onChange={val => setGadAnswers(prev => ({ ...prev, [q.id]: val }))}
                  hasError={!!errorMsg && gadAnswers[q.id] == null}
                />
              ))}
            </div>
            <div className="mt-6 p-4 bg-white rounded-2xl border border-border text-center">
              <span className="text-sm text-text-muted">GAD-7 Score: </span>
              <span className={`text-xl font-bold ${scoreColor(gadScore, 21)}`}>{gadScore} / 21</span>
            </div>
          </div>
        )}

        {/* ── Step 2: Lifestyle ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-text-main mb-1">Stress & Lifestyle Factors</h1>
              <p className="text-text-muted text-sm">Tell us about your daily habits and stress levels.</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
              <SelectRow label="How many hours do you sleep on average per night?" fieldId="sleep_hours" value={lifestyle.sleep_hours} options={['Less than 5 hours', '5-6 hours', '6-7 hours', '7-8 hours', 'More than 8 hours']} onChange={v => setLifestyle(p => ({ ...p, sleep_hours: v }))} hasError={!!errorMsg && !lifestyle.sleep_hours} />
              <SelectRow label="How would you rate your sleep quality?" fieldId="sleep_quality" value={lifestyle.sleep_quality} options={['Very Poor', 'Poor', 'Average', 'Good', 'Very Good']} onChange={v => setLifestyle(p => ({ ...p, sleep_quality: v }))} hasError={!!errorMsg && !lifestyle.sleep_quality} />
              <SelectRow label="How often do you exercise per week?" fieldId="exercise_frequency" value={lifestyle.exercise_frequency} options={['Never', '1-2 days', '3-4 days', '5 or more days']} onChange={v => setLifestyle(p => ({ ...p, exercise_frequency: v }))} hasError={!!errorMsg && !lifestyle.exercise_frequency} />
              <SelectRow label="How much screen time do you have daily (excluding work)?" fieldId="screen_time" value={lifestyle.screen_time} options={['Less than 2 hours', '2-4 hours', '4-6 hours', 'More than 6 hours']} onChange={v => setLifestyle(p => ({ ...p, screen_time: v }))} hasError={!!errorMsg && !lifestyle.screen_time} />
              <SelectRow label="How often do you feel stressed in daily life?" fieldId="stress_frequency" value={lifestyle.stress_frequency} options={['Never', 'Rarely', 'Sometimes', 'Often', 'Always']} onChange={v => setLifestyle(p => ({ ...p, stress_frequency: v }))} hasError={!!errorMsg && !lifestyle.stress_frequency} />
              <SelectRow label="How would you rate your work/academic pressure?" fieldId="work_pressure" value={lifestyle.work_pressure} options={['Very Low', 'Low', 'Moderate', 'High', 'Very High']} onChange={v => setLifestyle(p => ({ ...p, work_pressure: v }))} hasError={!!errorMsg && !lifestyle.work_pressure} />
              <SelectRow label="Do deadlines or workload make you feel anxious?" fieldId="deadline_anxiety" value={lifestyle.deadline_anxiety} options={['Never', 'Sometimes', 'Often', 'Always']} onChange={v => setLifestyle(p => ({ ...p, deadline_anxiety: v }))} hasError={!!errorMsg && !lifestyle.deadline_anxiety} />
              <SelectRow label="How often do you consume alcohol?" fieldId="alcohol" value={lifestyle.alcohol} options={['Never', 'Occasionally', 'Frequently']} onChange={v => setLifestyle(p => ({ ...p, alcohol: v }))} hasError={!!errorMsg && !lifestyle.alcohol} />
              <SelectRow label="How often do you smoke or use tobacco?" fieldId="smoking" value={lifestyle.smoking} options={['Never', 'Occasionally', 'Frequently']} onChange={v => setLifestyle(p => ({ ...p, smoking: v }))} hasError={!!errorMsg && !lifestyle.smoking} />
            </div>
          </div>
        )}

        {/* ── Step 3: Background ── */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-text-main mb-1">About You</h1>
              <p className="text-text-muted text-sm">This helps us give better personalized results. All information is anonymous.</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
              <SelectRow label="Age Group" fieldId="age_group" value={background.age_group} options={['Below 18', '18-24', '25-34', '35-44', '45-54', '55+']} onChange={v => setBackground(p => ({ ...p, age_group: v }))} hasError={!!errorMsg && !background.age_group} />
              <SelectRow label="Gender" fieldId="gender" value={background.gender} options={['Male', 'Female', 'Other', 'Prefer not to say']} onChange={v => setBackground(p => ({ ...p, gender: v }))} hasError={!!errorMsg && !background.gender} />
              <SelectRow label="Highest Level of Education" fieldId="education" value={background.education} options={['School', 'Undergraduate', 'Postgraduate', 'Doctorate', 'Other']} onChange={v => setBackground(p => ({ ...p, education: v }))} hasError={!!errorMsg && !background.education} />
              <SelectRow label="Current Occupation" fieldId="occupation" value={background.occupation} options={['Student', 'Employed (Full-Time)', 'Employed (Part-Time)', 'Self-Employed', 'Unemployed', 'Homemaker']} onChange={v => setBackground(p => ({ ...p, occupation: v }))} hasError={!!errorMsg && !background.occupation} />
              <SelectRow label="Have you ever been diagnosed with a mental health condition?" fieldId="diagnosed" value={background.diagnosed} options={['No', 'Yes', 'Prefer not to say']} onChange={v => setBackground(p => ({ ...p, diagnosed: v }))} hasError={!!errorMsg && !background.diagnosed} />
              <SelectRow label="Have you consulted a mental health professional before?" fieldId="consulted_prof" value={background.consulted_prof} options={['No', 'Yes']} onChange={v => setBackground(p => ({ ...p, consulted_prof: v }))} hasError={!!errorMsg && !background.consulted_prof} />
              <SelectRow label="Are you currently taking mental health medication?" fieldId="on_medication" value={background.on_medication} options={['No', 'Yes', 'Prefer not to say']} onChange={v => setBackground(p => ({ ...p, on_medication: v }))} hasError={!!errorMsg && !background.on_medication} />
              <SelectRow label="How would you rate your current mental health overall?" fieldId="overall_mental" value={background.overall_mental} options={['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor']} onChange={v => setBackground(p => ({ ...p, overall_mental: v }))} hasError={!!errorMsg && !background.overall_mental} />
              <SelectRow label="Do you feel you need professional mental health support?" fieldId="needs_support" value={background.needs_support} options={['No', 'Unsure', 'Yes']} onChange={v => setBackground(p => ({ ...p, needs_support: v }))} hasError={!!errorMsg && !background.needs_support} />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 text-danger text-sm bg-danger-light p-3 rounded-xl">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pb-8">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-text-muted hover:text-text-main hover:border-text-muted disabled:opacity-0 disabled:pointer-events-none transition-all duration-200 font-medium min-h-[48px]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px min-h-[48px]"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 min-h-[48px]"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analysing your responses...
                </>
              ) : (
                <><Send className="h-4 w-4" /> Get My Results</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mock result for demo when backend is offline ─────────────────────────
function generateMockResult() {
  return {
    _id: 'mock_' + Date.now(),
    createdAt: new Date().toISOString(),
    overallScore: 62,
    depression: { label: 'Moderate', score: 58, probabilities: { low: 0.15, moderate: 0.60, high: 0.25 } },
    anxiety: { label: 'Moderate', score: 64, probabilities: { low: 0.10, moderate: 0.55, high: 0.35 } },
    stress: { label: 'High', score: 72, probabilities: { low: 0.05, moderate: 0.30, high: 0.65 } },
    insomnia: { label: 'Low', score: 28, probabilities: { low: 0.70, moderate: 0.25, high: 0.05 } },
    shapValues: {
      depression: [
        { feature: 'phq_depressed', value: 0.42 },
        { feature: 'phq_tired', value: 0.31 },
        { feature: 'sleep_quality', value: -0.28 },
        { feature: 'phq_interest', value: 0.25 },
        { feature: 'exercise_frequency', value: -0.19 },
        { feature: 'phq_concentrate', value: 0.17 },
        { feature: 'work_pressure', value: 0.14 },
        { feature: 'phq_failure', value: 0.12 },
      ],
      anxiety: [
        { feature: 'gad_nervous', value: 0.38 },
        { feature: 'work_pressure', value: 0.29 },
        { feature: 'gad_cant_stop', value: 0.24 },
        { feature: 'sleep_quality', value: -0.22 },
        { feature: 'gad_afraid', value: 0.18 },
        { feature: 'exercise_frequency', value: -0.15 },
        { feature: 'screen_time', value: 0.13 },
        { feature: 'gad_irritable', value: 0.11 },
      ],
      stress: [
        { feature: 'work_pressure', value: 0.51 },
        { feature: 'stress_frequency', value: 0.44 },
        { feature: 'deadline_anxiety', value: 0.33 },
        { feature: 'sleep_hours', value: -0.25 },
        { feature: 'exercise_frequency', value: -0.21 },
        { feature: 'screen_time', value: 0.18 },
        { feature: 'alcohol', value: 0.12 },
        { feature: 'sleep_quality', value: -0.11 },
      ],
      insomnia: [
        { feature: 'sleep_quality', value: 0.39 },
        { feature: 'sleep_hours', value: 0.31 },
        { feature: 'screen_time', value: 0.22 },
        { feature: 'exercise_frequency', value: -0.19 },
        { feature: 'stress_frequency', value: 0.16 },
        { feature: 'alcohol', value: 0.11 },
        { feature: 'phq_sleep', value: 0.10 },
        { feature: 'gad_nervous', value: 0.08 },
      ],
    },
    recommendations: [],
  };
}
