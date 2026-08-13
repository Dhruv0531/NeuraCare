'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, Send, MessageSquare, Moon, Brain, Shield } from 'lucide-react';
import StepProgress from '@/components/StepProgress';
import Disclaimer from '@/components/Disclaimer';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── DASS-42 / PHQ-9 Questions ──────────────────────────────────────────────
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

const STEPS = [
  { label: 'Screening', sublabel: 'PHQ & GAD' },
  { label: 'Sleep Assessment', sublabel: 'ISI Index' },
  { label: 'Demographics', sublabel: 'About You' },
  { label: 'Optional Journal', sublabel: 'GoEmotions NLP' },
];

function RadioRow({
  question, fieldId, value, onChange, hasError, scale = SCALE_4
}: {
  question: string; fieldId: string; value: number | null; onChange: (v: number) => void; hasError: boolean; scale?: string[];
}) {
  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 ${hasError ? 'border-red-300 bg-red-50/40' : 'border-border bg-white hover:border-primary/30'}`}>
      <p className="text-sm font-medium text-text-main mb-4 leading-relaxed">
        {hasError && <span className="text-red-500 mr-1">*</span>}
        {question}
      </p>
      <div className={`grid gap-2 ${scale.length === 5 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {scale.map((label, i) => (
          <label
            key={i}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl cursor-pointer border-2 transition-all duration-150 min-h-[64px] justify-center ${
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
            <span className="text-base font-bold">{i}</span>
            <span className="text-[11px] text-center leading-tight">{label}</span>
          </label>
        ))}
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

const STORAGE_KEY = 'neuracare_assessment_draft';

export default function AssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [phqAnswers, setPhqAnswers] = useState<Record<string, number | null>>({});
  const [gadAnswers, setGadAnswers] = useState<Record<string, number | null>>({});
  const [isiAnswers, setIsiAnswers] = useState<Record<string, number | null>>({});
  const [journalText, setJournalText] = useState('');
  const [demographics, setDemographics] = useState<Record<string, string>>({
    age: '18-24', gender: 'Prefer not to say', education: 'Undergraduate',
    urban: 'Urban', married: 'Single', familysize: '3',
  });

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
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ phqAnswers, gadAnswers, isiAnswers, demographics, journalText }));
    } catch { /* ignore */ }
  }, [phqAnswers, gadAnswers, isiAnswers, demographics, journalText]);

  const validateStep = () => {
    if (step === 0) {
      const phqUn = PHQ9.some(q => phqAnswers[q.id] == null);
      const gadUn = GAD7.some(q => gadAnswers[q.id] == null);
      if (phqUn || gadUn) { setErrorMsg('Please answer all PHQ-9 & GAD-7 questions.'); return false; }
    } else if (step === 1) {
      const isiUn = ISI_QUESTIONS.some(q => isiAnswers[q.id] == null);
      if (isiUn) { setErrorMsg('Please answer all Sleep ISI questions.'); return false; }
    } else if (step === 2) {
      const demoUn = Object.values(demographics).some(v => !v);
      if (demoUn) { setErrorMsg('Please select all demographic fields.'); return false; }
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

    const sleep_answers = ISI_QUESTIONS.map(q => isiAnswers[q.id] ?? 0);

    const formData = {
      ...phqAnswers,
      ...gadAnswers,
      ...demographics,
      sleep_answers,
      text: journalText.trim(),
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

        {/* ── Step 0: PHQ-9 & GAD-7 ── */}
        {step === 0 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Mental Health Risk Screening</h1>
              <p className="text-text-muted text-sm">Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-primary text-base">Depression Subscale (PHQ-9)</h3>
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

            <div className="space-y-4 pt-4">
              <h3 className="font-bold text-secondary text-base">Anxiety Subscale (GAD-7)</h3>
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

        {/* ── Step 1: Sleep ISI Index ── */}
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Insomnia Severity Index (ISI)</h1>
              <p className="text-text-muted text-sm">Evaluate your sleep quality, disturbances, and daily impact.</p>
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

        {/* ── Step 2: Demographics ── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Demographics & Background</h1>
              <p className="text-text-muted text-sm">Required demographic indicators evaluated by the XGBoost ML model.</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
              <SelectRow label="Age Group" fieldId="age" value={demographics.age} options={['Below 18', '18-24', '25-34', '35-44', '45-54', '55+']} onChange={v => setDemographics(p => ({ ...p, age: v }))} hasError={!!errorMsg && !demographics.age} />
              <SelectRow label="Gender" fieldId="gender" value={demographics.gender} options={['Male', 'Female', 'Other', 'Prefer not to say']} onChange={v => setDemographics(p => ({ ...p, gender: v }))} hasError={!!errorMsg && !demographics.gender} />
              <SelectRow label="Highest Level of Education" fieldId="education" value={demographics.education} options={['School', 'Undergraduate', 'Postgraduate', 'Doctorate', 'Other']} onChange={v => setDemographics(p => ({ ...p, education: v }))} hasError={!!errorMsg && !demographics.education} />
              <SelectRow label="Living Area" fieldId="urban" value={demographics.urban} options={['Urban', 'Rural', 'Suburban']} onChange={v => setDemographics(p => ({ ...p, urban: v }))} hasError={!!errorMsg && !demographics.urban} />
              <SelectRow label="Marital Status" fieldId="married" value={demographics.married} options={['Single', 'Married', 'Divorced', 'Widowed']} onChange={v => setDemographics(p => ({ ...p, married: v }))} hasError={!!errorMsg && !demographics.married} />
              <SelectRow label="Family Size" fieldId="familysize" value={demographics.familysize} options={['1', '2', '3', '4', '5+']} onChange={v => setDemographics(p => ({ ...p, familysize: v }))} hasError={!!errorMsg && !demographics.familysize} />
            </div>
          </div>
        )}

        {/* ── Step 3: GoEmotions Optional Text ── */}
        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-main mb-1">Optional Journal Entry (GoEmotions NLP)</h1>
              <p className="text-text-muted text-sm">
                Describe how you feel today in your own words. Our Hugging Face GoEmotions DistilBERT NLP model will analyze emotional indicators in real time.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
              <label className="block text-sm font-semibold text-text-main">
                How have you been feeling mentally or emotionally recently? (Optional)
              </label>
              <textarea
                value={journalText}
                onChange={e => setJournalText(e.target.value.slice(0, 1000))}
                rows={5}
                placeholder="Example: I have been feeling quite anxious about my upcoming exams and finding it difficult to stay focused or rest peacefully..."
                className="w-full p-4 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
              />
              <div className="flex justify-between items-center text-xs text-text-muted">
                <span>GoEmotions DistilBERT analysis will detect emotional tone</span>
                <span className={journalText.length >= 950 ? 'text-red-500 font-bold' : ''}>
                  {journalText.length} / 1000 characters
                </span>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
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
                  Running AI & NLP Analysis...
                </>
              ) : (
                <><Send className="h-4 w-4" /> Complete & Get AI Results</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
