export const FEATURE_LABELS: Record<string, string> = {
  phq_interest: 'Loss of Interest',
  phq_depressed: 'Depressed Mood',
  phq_sleep: 'Sleep Problems',
  phq_tired: 'Low Energy',
  phq_appetite: 'Appetite Changes',
  phq_failure: 'Feelings of Failure',
  phq_concentrate: 'Concentration Difficulty',
  phq_slow_restless: 'Psychomotor Changes',
  phq_self_harm: 'Self-Harm Thoughts',
  gad_nervous: 'Nervousness',
  gad_cant_stop: 'Uncontrollable Worry',
  gad_worry_much: 'Excessive Worrying',
  gad_relax: 'Difficulty Relaxing',
  gad_restless: 'Restlessness',
  gad_irritable: 'Irritability',
  gad_afraid: 'Fear of Disaster',
  sleep_hours: 'Sleep Duration',
  sleep_quality: 'Sleep Quality',
  exercise_frequency: 'Exercise Frequency',
  screen_time: 'Screen Time',
  stress_frequency: 'Stress Frequency',
  work_pressure: 'Work Pressure',
  alcohol: 'Alcohol Use',
  smoking: 'Smoking',
};

export function humanLabel(key: string): string {
  return FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getRiskColor(label: 'Low' | 'Moderate' | 'High') {
  switch (label) {
    case 'Low': return { text: 'text-success', bg: 'bg-success-light', border: 'border-success' };
    case 'Moderate': return { text: 'text-warning', bg: 'bg-warning-light', border: 'border-warning' };
    case 'High': return { text: 'text-danger', bg: 'bg-danger-light', border: 'border-danger' };
  }
}

export function getScoreColor(score: number) {
  if (score < 33) return '#10B981';
  if (score < 66) return '#F59E0B';
  return '#EF4444';
}
