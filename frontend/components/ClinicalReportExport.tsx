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

  const depScore = (() => {
    if (assessment.depression?.probabilities) {
      const { moderate = 0, high = 0 } = assessment.depression.probabilities;
      return Math.min(100, Math.max(0, Math.round(moderate * 50 + high * 100)));
    }
    return depLevel === 'High' ? 85 : depLevel === 'Moderate' ? 50 : 20;
  })();

  const anxScore = (() => {
    if (assessment.anxiety?.probabilities) {
      const { moderate = 0, high = 0 } = assessment.anxiety.probabilities;
      return Math.min(100, Math.max(0, Math.round(moderate * 50 + high * 100)));
    }
    return anxLevel === 'High' ? 85 : anxLevel === 'Moderate' ? 50 : 20;
  })();

  const strScore = (() => {
    if (assessment.stress?.probabilities) {
      const { moderate = 0, high = 0 } = assessment.stress.probabilities;
      return Math.min(100, Math.max(0, Math.round(moderate * 50 + high * 100)));
    }
    return strLevel === 'High' ? 85 : strLevel === 'Moderate' ? 50 : 20;
  })();

  const rawSleep = assessment.sleep?.score ?? assessment.insomnia?.score ?? 0;
  const sleepScorePct = Math.min(100, Math.max(0, Math.round((rawSleep / 28) * 100)));
  const sleepRiskLabel = rawSleep >= 15 ? 'High' : rawSleep >= 8 ? 'Moderate' : 'Low';

  const domainScores = [
    { label: 'Depression Severity', score: depScore, riskLevel: depLevel, category: 'Mood & Affect' },
    { label: 'Anxiety Severity', score: anxScore, riskLevel: anxLevel, category: 'Autonomic & Apprehension' },
    { label: 'Stress Index', score: strScore, riskLevel: strLevel, category: 'Nervous Strain & Irritability' },
    { label: 'Sleep Disturbance', score: sleepScorePct, riskLevel: sleepRiskLabel, category: 'Sleep Continuity & Rest' },
  ];

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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const totalPdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (totalPdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, totalPdfHeight);
      } else {
        let heightLeft = totalPdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
          heightLeft -= pageHeight;
        }
      }

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
        style={{ display: 'none', width: '800px', padding: '32px 36px', background: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            <p style={{ margin: 0 }}><strong>Assessment Protocol:</strong> Comprehensive Multimodal Evaluation</p>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>Overall Clinical Triage Risk</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: overallRisk === 'High' ? '#dc2626' : overallRisk === 'Moderate' ? '#d97706' : '#16a34a', marginTop: '2px' }}>
              {overallRisk.toUpperCase()} RISK
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Synthesized from validated psychometric responses, sleep health indices, and qualitative affective language signals.
            </p>
          </div>
          <div style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 18px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Composite Risk Index</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7' }}>
              {assessment.overallScore ?? 50}<span style={{ fontSize: '14px', color: '#94a3b8' }}>/100</span>
            </div>
          </div>
        </div>

        {/* 1. Multimodal Subscales Table */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
            1. Multimodal Subscale Analysis
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px 10px', fontWeight: '700', color: '#475569' }}>Domain / Subscale</th>
                <th style={{ padding: '8px 10px', fontWeight: '700', color: '#475569' }}>Evaluation Level</th>
                <th style={{ padding: '8px 10px', fontWeight: '700', color: '#475569' }}>Confidence Probabilities</th>
                <th style={{ padding: '8px 10px', fontWeight: '700', color: '#475569' }}>Clinical Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', fontWeight: '600' }}>Depression Assessment</td>
                <td style={{ padding: '8px 10px', fontWeight: '700', color: depLevel === 'High' ? '#dc2626' : depLevel === 'Moderate' ? '#d97706' : '#16a34a' }}>{depLevel}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>
                  Low: {Math.round((assessment.depression?.probabilities?.low || 0)*100)}% | Mod: {Math.round((assessment.depression?.probabilities?.moderate || 0)*100)}% | High: {Math.round((assessment.depression?.probabilities?.high || 0)*100)}%
                </td>
                <td style={{ padding: '8px 10px', color: '#475569' }}>{depLevel === 'High' ? 'Significant depressive symptoms present' : depLevel === 'Moderate' ? 'Mild to moderate affective disturbance' : 'Normal affective range'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', fontWeight: '600' }}>Anxiety Assessment</td>
                <td style={{ padding: '8px 10px', fontWeight: '700', color: anxLevel === 'High' ? '#dc2626' : anxLevel === 'Moderate' ? '#d97706' : '#16a34a' }}>{anxLevel}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>
                  Low: {Math.round((assessment.anxiety?.probabilities?.low || 0)*100)}% | Mod: {Math.round((assessment.anxiety?.probabilities?.moderate || 0)*100)}% | High: {Math.round((assessment.anxiety?.probabilities?.high || 0)*100)}%
                </td>
                <td style={{ padding: '8px 10px', color: '#475569' }}>{anxLevel === 'High' ? 'Acute autonomic or generalized anxiety' : anxLevel === 'Moderate' ? 'Elevated situational apprehension' : 'Minimal tension or anxiety'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', fontWeight: '600' }}>Stress & Tension Index</td>
                <td style={{ padding: '8px 10px', fontWeight: '700', color: strLevel === 'High' ? '#dc2626' : strLevel === 'Moderate' ? '#d97706' : '#16a34a' }}>{strLevel}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>
                  Low: {Math.round((assessment.stress?.probabilities?.low || 0)*100)}% | Mod: {Math.round((assessment.stress?.probabilities?.moderate || 0)*100)}% | High: {Math.round((assessment.stress?.probabilities?.high || 0)*100)}%
                </td>
                <td style={{ padding: '8px 10px', color: '#475569' }}>{strLevel === 'High' ? 'Severe nervous tension & irritability' : strLevel === 'Moderate' ? 'Moderate physiological stress load' : 'Adequate stress coping reserve'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', fontWeight: '600' }}>Sleep Quality & Insomnia Index</td>
                <td style={{ padding: '8px 10px', fontWeight: '700' }}>{sleepScore}/28</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>{assessment.sleep?.level || assessment.insomnia?.label || 'Normal'}</td>
                <td style={{ padding: '8px 10px', color: '#475569' }}>{sleepCategory}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Clinical Domain Risk & Severity Profile (Bar Graph) */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
              2. Clinical Domain Risk & Severity Profile (Comparative Graph)
            </h2>
            <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: '#64748b' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }}></span>
                Low (&lt;35%)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }}></span>
                Moderate (35-64%)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444', display: 'inline-block' }}></span>
                Elevated (&ge;65%)
              </span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {domainScores.map((domain, idx) => {
                const barColor = domain.score >= 65 ? '#dc2626' : domain.score >= 35 ? '#d97706' : '#16a34a';
                const badgeBg = domain.score >= 65 ? '#fee2e2' : domain.score >= 35 ? '#fef3c7' : '#dcfce7';
                const badgeText = domain.score >= 65 ? '#991b1b' : domain.score >= 35 ? '#92400e' : '#166534';

                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '11px' }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{domain.label}</span>
                        <span style={{ color: '#94a3b8', marginLeft: '6px', fontSize: '10px' }}>({domain.category})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: barColor }}>{domain.score}%</span>
                        <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: badgeBg, color: badgeText, textTransform: 'uppercase' }}>
                          {domain.riskLevel}
                        </span>
                      </div>
                    </div>
                    {/* Bar Track */}
                    <div style={{ width: '100%', height: '13px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                      {/* Vertical Cutoff Guide Markers */}
                      <div style={{ position: 'absolute', left: '35%', top: 0, bottom: 0, width: '1px', background: 'rgba(100,116,139,0.3)', zIndex: 1 }} />
                      <div style={{ position: 'absolute', left: '65%', top: 0, bottom: 0, width: '1px', background: 'rgba(100,116,139,0.3)', zIndex: 1 }} />
                      {/* Filled Bar */}
                      <div
                        style={{
                          width: `${Math.max(4, Math.min(100, domain.score))}%`,
                          height: '100%',
                          background: domain.score >= 65
                            ? 'linear-gradient(90deg, #f87171, #dc2626)'
                            : domain.score >= 35
                            ? 'linear-gradient(90deg, #fbbf24, #d97706)'
                            : 'linear-gradient(90deg, #34d399, #059669)',
                          borderRadius: '6px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scale Axis */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1', fontSize: '9px', color: '#94a3b8' }}>
              <span>0% (Minimal Risk)</span>
              <span style={{ marginLeft: '6%' }}>35% (Mild Threshold)</span>
              <span style={{ marginRight: '6%' }}>65% (Clinical Cutoff)</span>
              <span>100% (Severe)</span>
            </div>
          </div>
        </div>

        {/* 3. Emotional & Affective Indicators */}
        {emotions.length > 0 && (
          <div style={{ marginBottom: '18px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '12.5px', fontWeight: '700', margin: 0, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                3. Natural Language Affective & Emotional Signals
              </h3>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Detected Sentiment Intensities</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              {emotions.slice(0, 6).map((e, i) => {
                const pct = Math.round(e.score * 100);
                return (
                  <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: '600', color: '#0f172a' }}>{e.label}</span>
                      <span style={{ fontWeight: '700', color: '#0284c7' }}>{pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: '#e0f2fe', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(4, Math.min(100, pct))}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #0284c7)', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Primary Clinical Risk Drivers & Key Contributing Factors */}
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
            {emotions.length > 0 ? '4.' : '3.'} Primary Clinical Risk Drivers & Key Symptoms
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {(assessment.depression?.shap_explanation || []).slice(0, 4).map((factor: any, i: number) => {
              const impactNum = typeof factor.impact === 'number' ? factor.impact : parseFloat(factor.impact || '0');
              const isPositive = impactNum >= 0;
              return (
                <div key={i} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                    <strong style={{ color: '#0f172a' }}>{factor.description || factor.feature}</strong>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: isPositive ? '#dc2626' : '#16a34a', whiteSpace: 'nowrap' }}>
                      {isPositive ? `+${impactNum.toFixed(2)}` : impactNum.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    {isPositive ? 'Risk-elevating symptom factor' : 'Protective / stabilizing factor'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Recommended Clinical Action Plan */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
            {emotions.length > 0 ? '5.' : '4.'} Recommended Clinical Action Plan
          </h2>
          <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px' }}>
            {(assessment.recommendations || []).slice(0, 4).map((rec, i) => (
              <p key={i} style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#78350f', lineHeight: '1.4' }}>
                • {rec}
              </p>
            ))}
          </div>
        </div>

        {/* Disclaimer & Doctor Signature */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '14px', marginTop: '14px', fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
