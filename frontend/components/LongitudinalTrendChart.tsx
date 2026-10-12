'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, Activity, Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import { Assessment } from '@/lib/api';

interface LongitudinalTrendChartProps {
  history: Assessment[];
  title?: string;
  subtitle?: string;
}

export default function LongitudinalTrendChart({
  history,
  title = 'Longitudinal Mental Health Recovery Trend',
  subtitle = 'Tracks risk scores and symptom trajectory across assessments stored in MongoDB'
}: LongitudinalTrendChartProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'overall' | 'depression' | 'anxiety' | 'sleep'>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!history || history.length === 0) {
    return null;
  }

  // Sort chronological (oldest to newest)
  const sortedHistory = [...history].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  const chartData = sortedHistory.map((item, idx) => {
    const dateObj = new Date(item.createdAt || Date.now());
    const dateLabel = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    // Subscale risk calculations (0-100 scale)
    const depProb = item.depression?.probabilities;
    const depScore = depProb
      ? Math.round((depProb.moderate || 0) * 50 + (depProb.high || 0) * 100)
      : (item.depression?.label === 'High' ? 85 : item.depression?.label === 'Moderate' ? 50 : 20);

    const anxProb = item.anxiety?.probabilities;
    const anxScore = anxProb
      ? Math.round((anxProb.moderate || 0) * 50 + (anxProb.high || 0) * 100)
      : (item.anxiety?.label === 'High' ? 85 : item.anxiety?.label === 'Moderate' ? 50 : 20);

    const strProb = item.stress?.probabilities;
    const strScore = strProb
      ? Math.round((strProb.moderate || 0) * 50 + (strProb.high || 0) * 100)
      : (item.stress?.label === 'High' ? 85 : item.stress?.label === 'Moderate' ? 50 : 20);

    const rawSleep = item.sleep?.score ?? item.insomnia?.score ?? 0;
    const sleepScore = Math.min(100, Math.round((rawSleep / 28) * 100));

    const overall = item.overallScore ?? Math.round((depScore * 0.35) + (anxScore * 0.30) + (strScore * 0.20) + (sleepScore * 0.15));

    return {
      index: idx + 1,
      date: dateLabel,
      fullDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      overall,
      depression: depScore,
      anxiety: anxScore,
      stress: strScore,
      sleep: sleepScore,
    };
  });

  // Calculate trajectory stats
  const firstScore = chartData[0]?.overall || 50;
  const latestScore = chartData[chartData.length - 1]?.overall || 50;
  const delta = latestScore - firstScore;

  let trendStatus = 'Stable';
  let TrendIcon = Minus;
  let trendColor = 'text-slate-600 bg-slate-100';

  if (delta <= -5) {
    trendStatus = `Improving (${Math.abs(delta)}% Risk Reduction)`;
    TrendIcon = TrendingDown;
    trendColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200';
  } else if (delta >= 5) {
    trendStatus = `Elevated Risk (+${delta}%)`;
    TrendIcon = TrendingUp;
    trendColor = 'text-rose-700 bg-rose-50 border border-rose-200';
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-border shadow-lg text-xs space-y-1.5 min-w-[180px]">
          <p className="font-bold text-text-main border-b border-border/60 pb-1 flex items-center justify-between">
            <span>Assessment #{dataPoint.index}</span>
            <span className="text-text-muted font-normal">{dataPoint.fullDate}</span>
          </p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-0.5">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                {entry.name}:
              </span>
              <strong className="text-text-main font-bold">{entry.value}%</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="h-4 w-4" />
            <span>Longitudinal Analytics</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-main">{title}</h2>
          <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>
        </div>

        {/* Trajectory Badge */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{trendStatus}</span>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs text-text-muted block">Assessments</span>
            <strong className="text-sm font-bold text-text-main">{chartData.length} Completed</strong>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-text-muted mr-1">Display:</span>
        {[
          { key: 'all', label: 'All Dimensions' },
          { key: 'overall', label: 'Overall Composite' },
          { key: 'depression', label: 'Depression' },
          { key: 'anxiety', label: 'Anxiety' },
          { key: 'sleep', label: 'Sleep Disruption' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedMetric(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              selectedMetric === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-text-muted hover:text-text-main'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[320px] sm:h-[360px] pt-2">
        {!mounted ? (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-2" />
            Rendering Trend Chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
              />

              {/* Dynamic Lines based on filter */}
              {(selectedMetric === 'all' || selectedMetric === 'overall') && (
                <Line
                  type="monotone"
                  dataKey="overall"
                  name="Overall Risk"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 6 }}
                />
              )}

              {(selectedMetric === 'all' || selectedMetric === 'depression') && (
                <Line
                  type="monotone"
                  dataKey="depression"
                  name="Depression"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray={selectedMetric === 'depression' ? '' : '3 3'}
                  dot={{ r: 3, fill: '#f43f5e' }}
                />
              )}

              {(selectedMetric === 'all' || selectedMetric === 'anxiety') && (
                <Line
                  type="monotone"
                  dataKey="anxiety"
                  name="Anxiety"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray={selectedMetric === 'anxiety' ? '' : '3 3'}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              )}

              {selectedMetric === 'all' && (
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
              )}

              {(selectedMetric === 'all' || selectedMetric === 'sleep') && (
                <Line
                  type="monotone"
                  dataKey="sleep"
                  name="Sleep Disruption"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray={selectedMetric === 'sleep' ? '' : '2 2'}
                  dot={{ r: 3, fill: '#8b5cf6' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Insight footer */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>
            {chartData.length >= 2
              ? `Displaying trajectory across ${chartData.length} clinical evaluations. Scores dynamically calibrated via Multimodal Fusion.`
              : 'Complete additional assessments over time to build a robust longitudinal trajectory curve.'}
          </span>
        </div>
        <span className="font-semibold text-text-main">
          Latest Score: {latestScore}%
        </span>
      </div>
    </div>
  );
}
