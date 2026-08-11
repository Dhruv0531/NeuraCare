import RiskBadge from './RiskBadge';
import { RiskResult } from '@/lib/api';

interface ConditionCardProps {
  condition: 'Depression' | 'Anxiety' | 'Stress' | 'Insomnia';
  questionnaire: string;
  result: RiskResult;
}

const conditionConfig = {
  Depression: { color: 'indigo', icon: '🧠', description: 'Mood & emotional wellbeing' },
  Anxiety: { color: 'cyan', icon: '💨', description: 'Worry & nervousness levels' },
  Stress: { color: 'orange', icon: '⚡', description: 'Daily stress & pressure' },
  Insomnia: { color: 'purple', icon: '🌙', description: 'Sleep quality & patterns' },
};

const bgColors: Record<string, string> = {
  indigo: 'bg-primary-light',
  cyan: 'bg-secondary-light',
  orange: 'bg-warning-light',
  purple: 'bg-purple-50',
};

const iconBg: Record<string, string> = {
  indigo: 'bg-primary/10',
  cyan: 'bg-secondary/10',
  orange: 'bg-warning/10',
  purple: 'bg-purple-100',
};

export default function ConditionCard({ condition, questionnaire, result }: ConditionCardProps) {
  const cfg = conditionConfig[condition];
  const bgClass = bgColors[cfg.color];
  const iconBgClass = iconBg[cfg.color];

  const barColor =
    result.label === 'Low' ? '#10B981' : result.label === 'Moderate' ? '#F59E0B' : '#EF4444';

  return (
    <div className={`rounded-2xl p-6 ${bgClass} border border-white shadow-card hover:shadow-card-hover transition-all duration-300`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl ${iconBgClass} mb-3`}>
            {cfg.icon}
          </div>
          <h3 className="font-bold text-text-main text-lg">{condition}</h3>
          <p className="text-xs text-text-muted mt-0.5">{questionnaire} · {cfg.description}</p>
        </div>
        <RiskBadge label={result.label} size="md" />
      </div>

      {/* Score bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Risk Score</span>
          <span className="font-semibold" style={{ color: barColor }}>{result.score}%</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${result.score}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Probability breakdown */}
      <div className="mt-3 flex gap-3 text-xs text-text-muted">
        <span>Low: <strong className="text-success">{Math.round(result.probabilities.low * 100)}%</strong></span>
        <span>·</span>
        <span>Mod: <strong className="text-warning">{Math.round(result.probabilities.moderate * 100)}%</strong></span>
        <span>·</span>
        <span>High: <strong className="text-danger">{Math.round(result.probabilities.high * 100)}%</strong></span>
      </div>
    </div>
  );
}
