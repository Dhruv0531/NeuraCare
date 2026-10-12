'use client';

import { useState, useRef } from 'react';
import { FileDown, Printer, Shield, CheckCircle2, Moon, Brain, Sparkles, AlertCircle } from 'lucide-react';
import { Assessment } from '@/lib/api';
import toast from 'react-hot-toast';

interface ClinicalReportExportProps {
  assessment: Assessment;
  userName?: string;
}

export default function ClinicalReportExport({ assessment, userName = 'Assessment Patient' }: ClinicalReportExportProps) {
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const depLevel = getRiskLabel(assessment.depression);
  const anxLevel = getRiskLabel(assessment.anxiety);
  const strLevel = getRiskLabel(assessment.stress);
  const levels = [depLevel, anxLevel, strLevel];
  const overallRisk = levels.includes('High') ? 'High' : (levels.includes('Moderate') ? 'Moderate' : 'Low');

  const sleepScore = assessment.sleep?.score ?? assessment.insomnia?.score ?? 0;
  const sleepCategory = assessment.sleep?.category ?? 'No clinically significant insomnia';
  const emotions = assessment.emotion?.emotions || [];

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    const toastId = toast.loading('Generating Clinical PDF Report...');

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Clone or unhide report element for clean render
      const element = reportRef.current;
      element.style.display = 'block';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`NeuraCare-Clinical-Report-${timestamp}.pdf`);

      toast.success('Clinical PDF Report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('PDF Generation failed:', err);
      toast.error('Failed to generate PDF. You can also print the page.', { id: toastId });
    } finally {
      if (reportRef.current) reportRef.current.style.display = 'none';
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleDownloadPdf}
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 min-h-[48px] disabled:opacity-60"
        >
          {generating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Download Clinical PDF Report
            </>
          )}
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 border border-border bg-white hover:bg-slate-50 text-text-main font-semibold px-4 py-3.5 rounded-xl transition-all duration-200 min-h-[48px]"
        >
          <Printer className="h-4 w-4 text-text-muted" />
          Print Report
        </button>
      </div>

      {/* Hidden printable DOM element for high-res PDF generation */}
      <div
        ref={reportRef}
        style={{ display: 'none', width: '800px', padding: '36px', background: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>N</div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>NeuraCare Health</h1>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Multimodal Clinical Mental Health Assessment Summary
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
            <p style={{ margin: '0 0 3px 0' }}><strong>Report Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p style={{ margin: '0 0 3px 0' }}><strong>Reference ID:</strong> {assessment._id ? assessment._id.slice(-8).toUpperCase() : 'DEMO-REF'}</p>
            <p style={{ margin: 0 }}><strong>Engine:</strong> XGBoost + GoEmotions Multimodal</p>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>Overall Clinical Triage Risk</span>
            <div style={{ fontSize: '26px', fontWeight: '800', color: overallRisk === 'High' ? '#dc2626' : overallRisk === 'Moderate' ? '#d97706' : '#16a34a', marginTop: '2px' }}>
              {overallRisk.toUpperCase()} RISK
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Triangulated from DASS/PHQ-GAD questionnaires, ISI sleep indices, and GoEmotions text sentiment.
            </p>
          </div>
          <div style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 18px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Composite Risk Index</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7' }}>
              {assessment.overallScore ?? 50}<span style={{ fontSize: '14px', color: '#94a3b8' }}>/100</span>
            </div>
          </div>
        </div>

        {/* Multimodal Subscales Table */}
        <div style={{ marginBottom: '22px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
            1. Multimodal Subscale Analysis
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569' }}>Domain / Subscale</th>
                <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569' }}>Evaluation Level</th>
                <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569' }}>Confidence Probabilities</th>
                <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569' }}>Clinical Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>Depression (PHQ / DASS)</td>
                <td style={{ padding: '10px 12px', fontWeight: '700', color: depLevel === 'High' ? '#dc2626' : depLevel === 'Moderate' ? '#d97706' : '#16a34a' }}>{depLevel}</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>
                  Low: {Math.round((assessment.depression?.probabilities?.low || 0)*100)}% | Mod: {Math.round((assessment.depression?.probabilities?.moderate || 0)*100)}% | High: {Math.round((assessment.depression?.probabilities?.high || 0)*100)}%
                </td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>{depLevel === 'High' ? 'Significant depressive symptoms present' : depLevel === 'Moderate' ? 'Mild to moderate affective disturbance' : 'Normal affective range'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>Anxiety (GAD / DASS)</td>
                <td style={{ padding: '10px 12px', fontWeight: '700', color: anxLevel === 'High' ? '#dc2626' : anxLevel === 'Moderate' ? '#d97706' : '#16a34a' }}>{anxLevel}</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>
                  Low: {Math.round((assessment.anxiety?.probabilities?.low || 0)*100)}% | Mod: {Math.round((assessment.anxiety?.probabilities?.moderate || 0)*100)}% | High: {Math.round((assessment.anxiety?.probabilities?.high || 0)*100)}%
                </td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>{anxLevel === 'High' ? 'Acute autonomic or generalized anxiety' : anxLevel === 'Moderate' ? 'Elevated situational apprehension' : 'Minimal tension or anxiety'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>Stress Index (DASS)</td>
                <td style={{ padding: '10px 12px', fontWeight: '700', color: strLevel === 'High' ? '#dc2626' : strLevel === 'Moderate' ? '#d97706' : '#16a34a' }}>{strLevel}</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>
                  Low: {Math.round((assessment.stress?.probabilities?.low || 0)*100)}% | Mod: {Math.round((assessment.stress?.probabilities?.moderate || 0)*100)}% | High: {Math.round((assessment.stress?.probabilities?.high || 0)*100)}%
                </td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>{strLevel === 'High' ? 'Severe nervous tension & irritability' : strLevel === 'Moderate' ? 'Moderate physiological stress load' : 'Adequate stress coping reserve'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>Sleep Insomnia Index (ISI)</td>
                <td style={{ padding: '10px 12px', fontWeight: '700' }}>{sleepScore}/28</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>{assessment.sleep?.level || assessment.insomnia?.label || 'Normal'}</td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>{sleepCategory}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Emotional Text Analysis (GoEmotions) */}
        {emotions.length > 0 && (
          <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 8px 0', color: '#1e293b' }}>
              Natural Language Affective Signals (GoEmotions NLP)
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {emotions.map((e, i) => (
                <span key={i} style={{ padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                  {e.label} ({Math.round(e.score * 100)}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Explainable AI (Key Symptoms & Factors) */}
        <div style={{ marginBottom: '22px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
            2. Explainable AI (SHAP & Cross-Modal Drivers)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(assessment.depression?.shap_explanation || []).slice(0, 4).map((factor: any, i: number) => (
              <div key={i} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', background: '#ffffff' }}>
                <strong style={{ color: '#0f172a' }}>{factor.description || factor.feature}</strong>
                <div style={{ color: '#64748b', marginTop: '2px' }}>
                  Weight: {typeof factor.impact === 'number' ? (factor.impact > 0 ? `+${factor.impact}` : factor.impact) : factor.impact}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Clinical & Wellness Recommendations */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
            3. AI Recommended Clinical Action Plan
          </h2>
          <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px' }}>
            {(assessment.recommendations || []).slice(0, 4).map((rec, i) => (
              <p key={i} style={{ margin: '0 0 6px 0', fontSize: '11.5px', color: '#78350f', lineHeight: '1.4' }}>
                • {rec}
              </p>
            ))}
          </div>
        </div>

        {/* Disclaimer & Doctor Signature */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '16px', marginTop: '16px', fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ maxWidth: '65%' }}>
            <p style={{ margin: '0 0 4px 0' }}><strong>CLINICAL DECISION SUPPORT NOTICE:</strong></p>
            <p style={{ margin: 0, lineHeight: '1.3' }}>
              This document is an AI-assisted triage assessment generated by the NeuraCare multimodal system. It does not constitute a formal psychiatric diagnosis and is intended to assist qualified healthcare professionals in clinical evaluation.
            </p>
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid #475569', width: '180px', paddingTop: '6px' }}>
            Clinician Signature & Date
          </div>
        </div>
      </div>
    </div>
  );
}
