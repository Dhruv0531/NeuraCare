'use client';

import Link from 'next/link';
import {
  Brain, Cpu, FileText, ClipboardList,
  Moon, Wind, Zap, ArrowRight, Shield, Users, Award,
  AlertTriangle, Sparkles, HelpCircle, Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';

const conditions = [
  {
    name: 'Depression',
    questionnaire: 'PHQ-9 / DASS',
    icon: Brain,
    description: 'Screening for persistent sadness, loss of interest, and low mood',
    color: 'bg-primary-light',
    iconColor: 'text-primary',
    border: 'border-primary/10',
  },
  {
    name: 'Anxiety',
    questionnaire: 'GAD-7 / DASS',
    icon: Wind,
    description: 'Assessment of excessive worry, nervousness, and tension',
    color: 'bg-secondary-light',
    iconColor: 'text-secondary',
    border: 'border-secondary/10',
  },
  {
    name: 'Stress',
    questionnaire: 'DASS-21',
    icon: Zap,
    description: 'Evaluation of daily stress, overwhelm, and nervous energy',
    color: 'bg-warning-light',
    iconColor: 'text-warning',
    border: 'border-warning/10',
  },
  {
    name: 'Insomnia',
    questionnaire: 'ISI Index',
    icon: Moon,
    description: 'Measurement of sleep quality, disturbances, and daily impact',
    color: 'bg-purple-50',
    iconColor: 'text-purple-500',
    border: 'border-purple-100',
  },
  {
    name: 'Emotional Language',
    questionnaire: 'GoEmotions NLP',
    icon: Sparkles,
    // description: 'DistilBERT multi-label sentiment analysis across 28 emotion categories',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-100',
  },
];

const steps = [
  {
    num: '01',
    icon: ClipboardList,
    title: 'Screening & Sleep Questionnaire',
    desc: 'Answer structured evidence-based questionnaires covering depression, anxiety, stress, and insomnia.',
    color: 'bg-primary-light text-primary',
  },
  {
    num: '02',
    icon: Cpu,
    title: 'Dual XGBoost & DistilBERT Engine',
    desc: 'XGBoost ML models evaluate risk features while our fine-tuned Hugging Face GoEmotions DistilBERT NLP analyzes optional text entries.',
    color: 'bg-secondary-light text-secondary',
  },
  {
    num: '03',
    icon: FileText,
    title: 'Explainable Insights & PDF Report',
    desc: 'Receive SHAP feature impact cards, emotional language indicators, personalized recommendations, and downloadable clinical PDF export.',
    color: 'bg-success-light text-success',
  },
];

const stats = [
  { value: '38,775+', label: 'Training Dataset Responses', icon: Users },
  { value: '28', label: 'GoEmotions NLP Categories', icon: Sparkles },
  { value: '98.7%', label: 'XGBoost Screening Accuracy', icon: Award },
  { value: '4+', label: 'Integrated AI & ML Models', icon: Shield },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background pt-16 pb-24">
        {/* Animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl animate-blob" />
          <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-secondary/8 blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-purple-200/30 blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Multimodal AI & NLP · Free · Anonymous
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-text-main tracking-tight leading-tight mb-5">
                Understand Your{' '}
                <span className="text-primary">Mental Health</span>{' '}
                Risk
              </h1>
              <p className="text-lg text-text-muted leading-relaxed mb-8 max-w-md">
                A free, anonymous AI screening platform combining trained XGBoost Machine Learning models, Hugging Face GoEmotions DistilBERT NLP text analysis, SHAP explainability, and ISI sleep index.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
                >
                  Start Free Assessment
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/clinician"
                  className="inline-flex items-center gap-2 border border-primary text-primary font-semibold px-6 py-3.5 rounded-xl hover:bg-primary-light transition-all duration-200"
                >
                  <Activity className="h-4 w-4" /> Clinician Portal
                </Link>
              </div>
            </div>

            {/* Right — 5 condition mini-cards */}
            <div className="grid grid-cols-2 gap-4">
              {conditions.map((c, i) => (
                <div key={c.name}
                  style={{ animationDelay: `${i * 100}ms` }}
                  className={`rounded-2xl p-5 ${c.color} border ${c.border} hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 animate-fade-in ${i === 4 ? 'col-span-2' : ''}`}
                >
                  <c.icon className={`h-6 w-6 ${c.iconColor} mb-2`} />
                  <h3 className="font-bold text-text-main text-sm">{c.name}</h3>
                  <span className="text-xs font-semibold text-text-muted block">{c.questionnaire}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer Banner ────────────────────────────────── */}
      <section className="bg-amber-50 border-y border-amber-200 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Disclaimer:</strong> NeuraCare is a screening tool only and does not provide medical diagnosis.
              If you are in crisis, please contact a qualified mental health professional immediately.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-text-main mb-3">How It Works</h2>
            <p className="text-text-muted text-lg max-w-xl mx-auto">
              Three simple steps to understand your mental health risk profile
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="bg-background rounded-2xl p-8 border border-border hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${step.color} mb-5 group-hover:scale-110 transition-transform`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-text-muted mb-2 tracking-widest">STEP {step.num}</div>
                <h3 className="text-lg font-bold text-text-main mb-2">{step.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Multimodal Feature Grid ───────────────────────────── */}
      <section id="about" className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-text-main mb-3">Multimodal Mental Health Assessment</h2>
            <p className="text-text-muted text-lg max-w-xl mx-auto">
              Integrating evidence-based screening items, PyTorch GoEmotions NLP, and SHAP explainability
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {conditions.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`rounded-2xl p-6 ${c.color} border ${c.border} hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.color} mb-4`}>
                  <c.icon className={`h-6 w-6 ${c.iconColor}`} />
                </div>
                <h3 className="font-bold text-text-main text-lg mb-1">{c.name}</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">{c.description}</p>
                <span className={`text-xs font-bold ${c.iconColor} uppercase tracking-wide`}>
                  {c.questionnaire}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="py-16 bg-primary">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <s.icon className="h-7 w-7 text-white/60 mx-auto mb-3" />
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-white/70 text-xs font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-text-main mb-4">
              Ready to take the first step?
            </h2>
            <p className="text-text-muted mb-8 text-lg">
              Free, anonymous, and takes less than 5 minutes.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
            >
              Start Free Assessment
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-text-main">NeuraCare</span>
              </div>
              <p className="text-sm text-text-muted">Multimodal mental health AI, made accessible</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-text-muted">
              <Link href="/history" className="hover:text-text-main transition-colors">History</Link>
              <Link href="/clinician" className="hover:text-text-main transition-colors">Clinician Portal</Link>
              <a href="#" className="hover:text-text-main transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-text-main transition-colors">Disclaimer</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center text-xs text-text-muted space-y-1">
            <p>NeuraCare provides AI-assisted screening and does not provide medical diagnosis or treatment.</p>
            <p>© 2026 NeuraCare, VESIT Mumbai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
