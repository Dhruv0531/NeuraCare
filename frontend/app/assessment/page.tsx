'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  Brain,
  Shield,
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';
import StepProgress from '@/components/StepProgress';
import Disclaimer from '@/components/Disclaimer';
import { api, SectionAdaptiveAnalysis, AdaptiveFollowupQuestion } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Standard Clinical Instruments ──────────────────────────────────────────
const PHQ9 = [
  { id: 'phq_interest', text: 'Little interest or pleasure in doing things' },
  { id: 'phq_depressed', text: 'Feeling down, depressed, or hopeless' },
  { id: 'phq_sleep', text: 'Trouble falling or staying asleep, or sleeping too much' },
  { id: 'phq_tired', text: 'Feeling tired or having little energy' },
  { id: 'phq_appetite', text: 'Poor appetite or overeating' },
  { id: 'phq_failure', text: 'Feeling bad about yourself — or that you are a failure or have let yourself down' },
  { id: 'phq_concentrate', text: 'Trouble concentrating on things, such as reading or watching television' },
  { id: 'phq_slow_restless', text: 'Moving or speaking so slowly or being fidgety/restless' },
  { id: 'phq_self_harm', text: 'Thoughts that you would be better off dead, or of hurting yourself' },
];

const GAD7 = [
  { id: 'gad_nervous', text: 'Feeling nervous, anxious, or on edge' },
  { id: 'gad_cant_stop', text: 'Not being able to stop or control worrying' },
  { id: 'gad_worry_much', text: 'Worrying too much about different things' },
  { id: 'gad_relax', text: 'Trouble relaxing' },
  { id: 'gad_restless', text: 'Being so restless that it is hard to sit still' },
  { id: 'gad_irritable', text: 'Becoming easily annoyed or irritable' },
  { id: 'gad_afraid', text: 'Feeling afraid as if something awful might happen' },
];

const ISI_QUESTIONS = [
  { id: 'isi_1', text: 'Difficulty falling asleep' },
  { id: 'isi_2', text: 'Difficulty staying asleep' },
  { id: 'isi_3', text: 'Problems waking up too early' },
  { id: 'isi_4', text: 'How satisfied/dissatisfied are you with your current sleep pattern?' },
  { id: 'isi_5', text: 'How noticeable to others do you think your sleep problem is?' },
  { id: 'isi_6', text: 'How worried/distressed are you about your current sleep problem?' },
  { id: 'isi_7', text: 'To what extent do you consider your sleep problem to interfere with your daily functioning?' },
];

const SCALE_4 = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];
const ISI_SCALE = ['None / Very Satisfied', 'Mild / Satisfied', 'Moderate / Neutral', 'Severe / Dissatisfied', 'Very Severe / Very Dissatisfied'];

// 6 Stepped Clinical Stages
const STEPS = [
  { label: 'Depression', sublabel: 'PHQ-9 Screener' },
  { label: 'AI Deep-Dive', sublabel: 'Personalized Probe' },
  { label: 'Anxiety', sublabel: 'GAD-7 Screener' },
  { label: 'AI Deep-Dive', sublabel: 'Personalized Probe' },
  { label: 'Sleep Quality', sublabel: 'ISI Scale' },
  { label: 'Demographics', sublabel: 'Personal Context' },
];

function RadioRow({
  question,
  fieldId,
  value,
  onChange,
  hasError,
  scale = SCALE_4,
  rationale
}: {
  question: string;
  fieldId: string;
  value: number | null;
  onChange: (v: number) => void;
  hasError: boolean;
  scale?: string[];
  rationale?: string;
}) {
  const isFiveScale = scale.length === 5;

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 ${hasError ? 'border-red-300 bg-red-50/40' : 'border-border bg-white hover:border-primary/30'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-text-main leading-relaxed">
          {hasError && <span className="text-red-500 mr-1">*</span>}
          {question}
        </p>
        {rationale && (
          <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
            {rationale}
          </span>
        )}
      </div>
      <div className={`grid gap-2 ${isFiveScale ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {scale.map((label, i) => {
          const isSelected = value === i;
          return (
            <label
              key={i}
              className={`flex items-center justify-center p-3 rounded-xl cursor-pointer border-2 transition-all duration-150 min-h-[48px] select-none text-center ${
                isSelected
                  ? 'border-primary bg-primary-light text-primary font-semibold shadow-sm'
                  : 'border-border hover:border-primary/40 bg-white hover:bg-slate-50/60 text-text-muted hover:text-text-main'
              }`}
            >
              <input
                type="radio"
                name={fieldId}
                value={i}
                checked={isSelected}
                onChange={() => onChange(i)}
                className="sr-only"
              />
              <span className="text-xs sm:text-[13px] leading-snug">{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SelectRow({
  label, fieldId, value, options, onChange, hasError,
}: {
  label: string; fieldId: string; value: string; options: string[]; onChange: (v: string) => void; hasError: boolean;
}) {
  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-text-main mb-1.5">
        {hasError && <span className="text-red-500 mr-1">*</span>}
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer min-h-[48px] ${hasError ? 'border-red-300' : 'border-border'}`}
      >
        <option value="">Select an option</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const STORAGE_KEY = 'neuracare_assessment_stepped_draft';

export default function AssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingSection, setAnalyzingSection] = useState(false);

  // Standard Scales State
  const [phqAnswers, setPhqAnswers] = useState<Record<string, number | null>>({});
  const [gadAnswers, setGadAnswers] = useState<Record<string, number | null>>({});
  const [isiAnswers, setIsiAnswers] = useState<Record<string, number | null>>({});
  const [journalText, setJournalText] = useState('');
  const [demographics, setDemographics] = useState<Record<string, string>>({
    age: '18-24', gender: 'Prefer not to say', education: 'Undergraduate',
    urban: 'Urban', married: 'Single', familysize: '3',
  });

  // Adaptive Stepped State (AI Analysis & Follow-up Questions)
  const [phqAnalysis, setPhqAnalysis] = useState<SectionAdaptiveAnalysis | null>(null);
  const [phqFollowupAnswers, setPhqFollowupAnswers] = useState<Record<string, number | null>>({});

  const [gadAnalysis, setGadAnalysis] = useState<SectionAdaptiveAnalysis | null>(null);
  const [gadFollowupAnswers, setGadFollowupAnswers] = useState<Record<string, number | null>>({});

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phqAnswers) setPhqAnswers(parsed.phqAnswers);
        if (parsed.gadAnswers) setGadAnswers(parsed.gadAnswers);
        if (parsed.isiAnswers) setIsiAnswers(parsed.isiAnswers);
        if (parsed.demographics) setDemographics(parsed.demographics);
        if (parsed.journalText) setJournalText(parsed.journalText);
        if (parsed.phqAnalysis) setPhqAnalysis(parsed.phqAnalysis);
        if (parsed.phqFollowupAnswers) setPhqFollowupAnswers(parsed.phqFollowupAnswers);
        if (parsed.gadAnalysis) setGadAnalysis(parsed.gadAnalysis);
        if (parsed.gadFollowupAnswers) setGadFollowupAnswers(parsed.gadFollowupAnswers);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        phqAnswers,
        gadAnswers,
        isiAnswers,
        demographics,
        journalText,
        phqAnalysis,
        phqFollowupAnswers,
        gadAnalysis,
        gadFollowupAnswers
      }));
    } catch { /* ignore */ }
  }, [phqAnswers, gadAnswers, isiAnswers, demographics, journalText, phqAnalysis, phqFollowupAnswers, gadAnalysis, gadFollowupAnswers]);

  const validateCurrentStep = (): boolean => {
    // Step 0: Standard PHQ-9
    if (step === 0) {
      const unanswered = PHQ9.some(q => phqAnswers[q.id] == null);
      if (unanswered) {
        setErrorMsg('Please answer all 9 PHQ-9 questions to continue.');
        return false;
      }
    }
    // Step 1: Adaptive PHQ Follow-ups
    else if (step === 1 && phqAnalysis) {
      const unanswered = phqAnalysis.followup_questions.some(q => phqFollowupAnswers[q.id] == null);
      if (unanswered) {
        setErrorMsg('Please answer the personalized clinical follow-up questions.');
        return false;
      }
    }
    // Step 2: Standard GAD-7
    else if (step === 2) {
      const unanswered = GAD7.some(q => gadAnswers[q.id] == null);
      if (unanswered) {
        setErrorMsg('Please answer all 7 GAD-7 anxiety questions to continue.');
        return false;
      }
    }
    // Step 3: Adaptive GAD Follow-ups
    else if (step === 3 && gadAnalysis) {
      const unanswered = gadAnalysis.followup_questions.some(q => gadFollowupAnswers[q.id] == null);
      if (unanswered) {
        setErrorMsg('Please answer the personalized anxiety follow-up questions.');
        return false;
      }
    }
    // Step 4: Sleep ISI
    else if (step === 4) {
      const unanswered = ISI_QUESTIONS.some(q => isiAnswers[q.id] == null);
      if (unanswered) {
        setErrorMsg('Please answer all Sleep ISI questions.');
        return false;
      }
    }
    // Step 5: Demographics & Journal
    else if (step === 5) {
      const demoUn = Object.values(demographics).some(v => !v);
      if (demoUn) {
        setErrorMsg('Please complete all demographic fields.');
        return false;
      }
      if (!journalText.trim() || journalText.trim().length < 5) {
        setErrorMsg('Please share a few words about your emotional state in the journal reflection.');
        return false;
      }
    }

    setErrorMsg('');
    return true;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    // Transition from Step 0 (PHQ-9) -> Step 1 (AI Adaptive Deep-Dive)
    if (step === 0) {
      setAnalyzingSection(true);
      try {
        const analysis = await api.getSectionFollowups('phq9', phqAnswers);
        setPhqAnalysis(analysis);
        setStep(1);
      } catch (err) {
        console.error('Failed to analyze PHQ-9:', err);
        setStep(1);
      } finally {
        setAnalyzingSection(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Transition from Step 2 (GAD-7) -> Step 3 (AI Adaptive Deep-Dive)
    if (step === 2) {
      setAnalyzingSection(true);
      try {
        const analysis = await api.getSectionFollowups('gad7', gadAnswers, phqAnalysis);
        setGadAnalysis(analysis);
        setStep(3);
      } catch (err) {
        console.error('Failed to analyze GAD-7:', err);
        setStep(3);
      } finally {
        setAnalyzingSection(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Standard progression for other steps
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep(s => Math.max(0, s - 1));
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setLoading(true);

    const sleep_answers = ISI_QUESTIONS.map(q => isiAnswers[q.id] ?? 0);

    const formData = {
      ...phqAnswers,
      ...gadAnswers,
      ...demographics,
      sleep_answers,
      text: journalText.trim(),
      adaptive_insights: {
        phq_analysis: phqAnalysis,
        phq_followups: phqFollowupAnswers,
        gad_analysis: gadAnalysis,
        gad_followups: gadFollowupAnswers,
      }
    };

    try {
      const result = await api.submitAssessment(formData);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem('neuracare_result', JSON.stringify(result));
      router.push('/results');
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze assessment. Check backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <StepProgress steps={STEPS} currentStep={step} />
        <Disclaimer className="mb-6" />

        {/* ── STEP 0: Standard PHQ-9 Depression Screener ── */}
        {step === 0 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                <Brain className="h-3.5 w-3.5" /> Stage 1: Standardized Depression Screening
              </div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Depression Scale (PHQ-9)</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                Over the <strong>last 2 weeks</strong>, how often have you been bothered by any of the following problems?
              </p>
            </div>

            <div className="space-y-4">
              {PHQ9.map(q => (
                <RadioRow
                  key={q.id}
                  question={q.text}
                  fieldId={q.id}
                  value={phqAnswers[q.id] ?? null}
                  onChange={val => setPhqAnswers(prev => ({ ...prev, [q.id]: val }))}
                  hasError={!!errorMsg && phqAnswers[q.id] == null}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: Adaptive Deep-Dive (Depression) ── */}
        {step === 1 && phqAnalysis && (
          <div className="animate-fade-in space-y-6">
            {/* AI Clinical Observation Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/25 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-primary text-white rounded-xl shadow-sm flex-shrink-0 mt-0.5">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-primary">
                      AI Stepped Analysis • Clinical Pattern Detected
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
                      {phqAnalysis.dominant_cluster}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Score: {phqAnalysis.total_score}/27 ({phqAnalysis.severity})
                    </span>
                  </div>
                  <p className="text-sm text-text-main font-medium leading-relaxed">
                    {phqAnalysis.ai_clinical_observation}
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Based on your responses, our clinical engine generated the following personalized follow-up inquiries to explore functional severity:
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-text-main mb-1">Personalized Follow-Up Inquiries</h2>
              <p className="text-text-muted text-sm">Please answer how these specific symptoms affect your day-to-day life.</p>
            </div>

            <div className="space-y-4">
              {phqAnalysis.followup_questions.map(q => (
                <RadioRow
                  key={q.id}
                  question={q.text}
                  fieldId={q.id}
                  scale={q.scale}
                  rationale={q.target_symptom}
                  value={phqFollowupAnswers[q.id] ?? null}
                  onChange={val => setPhqFollowupAnswers(prev => ({ ...prev, [q.id]: val }))}
                  hasError={!!errorMsg && phqFollowupAnswers[q.id] == null}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Standard GAD-7 Anxiety Screener ── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-semibold mb-2">
                <Activity className="h-3.5 w-3.5" /> Stage 2: Standardized Anxiety Screening
              </div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Generalized Anxiety Scale (GAD-7)</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following problems?
              </p>
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
          </div>
        )}

        {/* ── STEP 3: Adaptive Deep-Dive (Anxiety) ── */}
        {step === 3 && gadAnalysis && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-gradient-to-r from-secondary/10 via-secondary/5 to-transparent border border-secondary/25 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-secondary text-white rounded-xl shadow-sm flex-shrink-0 mt-0.5">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-secondary">
                      AI Stepped Analysis • Anxiety Cluster
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary">
                      {gadAnalysis.dominant_cluster}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Score: {gadAnalysis.total_score}/21 ({gadAnalysis.severity})
                    </span>
                  </div>
                  <p className="text-sm text-text-main font-medium leading-relaxed">
                    {gadAnalysis.ai_clinical_observation}
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Our AI has formulated these targeted inquiries to understand the physiological or cognitive reach of your anxiety:
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-text-main mb-1">Tailored Anxiety Exploration</h2>
              <p className="text-text-muted text-sm">Please rate the frequency or intensity of these specific patterns.</p>
            </div>

            <div className="space-y-4">
              {gadAnalysis.followup_questions.map(q => (
                <RadioRow
                  key={q.id}
                  question={q.text}
                  fieldId={q.id}
                  scale={q.scale}
                  rationale={q.target_symptom}
                  value={gadFollowupAnswers[q.id] ?? null}
                  onChange={val => setGadFollowupAnswers(prev => ({ ...prev, [q.id]: val }))}
                  hasError={!!errorMsg && gadFollowupAnswers[q.id] == null}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 4: Sleep Assessment (ISI) ── */}
        {step === 4 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Insomnia Severity Index (ISI)</h1>
              <p className="text-text-muted text-sm">Evaluate your sleep quality, disturbances, and daily biological impact.</p>
            </div>
            <div className="space-y-4">
              {ISI_QUESTIONS.map(q => (
                <RadioRow
                  key={q.id}
                  question={q.text}
                  fieldId={q.id}
                  scale={ISI_SCALE}
                  value={isiAnswers[q.id] ?? null}
                  onChange={val => setIsiAnswers(prev => ({ ...prev, [q.id]: val }))}
                  hasError={!!errorMsg && isiAnswers[q.id] == null}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Demographics & Journal Reflection ── */}
        {step === 5 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Personal Context & Reflection</h1>
              <p className="text-text-muted text-sm">
                Provide general context and describe how you have been feeling recently to enable multi-modal emotional analysis.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6 space-y-5 shadow-sm">
              <h3 className="font-semibold text-text-main text-sm uppercase tracking-wider text-primary">Demographics (Optional Tuning)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectRow label="Age Group" fieldId="age" value={demographics.age} options={['Below 18', '18-24', '25-34', '35-44', '45-54', '55+']} onChange={v => setDemographics(p => ({ ...p, age: v }))} hasError={!!errorMsg && !demographics.age} />
                <SelectRow label="Gender" fieldId="gender" value={demographics.gender} options={['Male', 'Female', 'Other', 'Prefer not to say']} onChange={v => setDemographics(p => ({ ...p, gender: v }))} hasError={!!errorMsg && !demographics.gender} />
                <SelectRow label="Highest Education" fieldId="education" value={demographics.education} options={['School', 'Undergraduate', 'Postgraduate', 'Doctorate', 'Other']} onChange={v => setDemographics(p => ({ ...p, education: v }))} hasError={!!errorMsg && !demographics.education} />
                <SelectRow label="Living Area" fieldId="urban" value={demographics.urban} options={['Urban', 'Rural', 'Suburban']} onChange={v => setDemographics(p => ({ ...p, urban: v }))} hasError={!!errorMsg && !demographics.urban} />
                <SelectRow label="Marital Status" fieldId="married" value={demographics.married} options={['Single', 'Married', 'Divorced', 'Widowed']} onChange={v => setDemographics(p => ({ ...p, married: v }))} hasError={!!errorMsg && !demographics.married} />
                <SelectRow label="Family Size" fieldId="familysize" value={demographics.familysize} options={['1', '2', '3', '4', '5+']} onChange={v => setDemographics(p => ({ ...p, familysize: v }))} hasError={!!errorMsg && !demographics.familysize} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-text-main">
                  Personal Journal Reflection <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> DistilBERT NLP Analysis
                </span>
              </div>
              <textarea
                value={journalText}
                onChange={e => setJournalText(e.target.value.slice(0, 1000))}
                rows={5}
                placeholder="Share what has been on your mind lately, your current mood, energy levels, or any challenges you are experiencing..."
                className="w-full p-4 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center text-xs text-text-muted">
                <span>Natural expression helps extract affective signals (27 GoEmotions)</span>
                <span className={journalText.length >= 950 ? 'text-red-500 font-bold' : ''}>
                  {journalText.length} / 1000 characters
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pb-8">
          <button
            onClick={handleBack}
            disabled={step === 0 || analyzingSection || loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-text-muted hover:text-text-main hover:border-text-muted disabled:opacity-0 disabled:pointer-events-none transition-all duration-200 font-medium min-h-[48px]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={analyzingSection}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-75 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px min-h-[48px]"
            >
              {analyzingSection ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing Clinical Patterns...
                </>
              ) : (
                <>
                  {step === 0 || step === 2 ? 'Analyze & Continue' : 'Next'} <ChevronRight className="h-4 w-4" />
                </>
              )}
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
                  Running Multi-Modal Prediction...
                </>
              ) : (
                <><Send className="h-4 w-4" /> Complete & View Clinical Report</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
