'use client';

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Assessment } from '@/lib/api';

interface RadarChartComponentProps {
  assessment: Assessment;
}

export default function RadarChartComponent({ assessment }: RadarChartComponentProps) {
  const data = [
    { condition: 'Depression', score: assessment.depression.score },
    { condition: 'Anxiety', score: assessment.anxiety.score },
    { condition: 'Stress', score: assessment.stress.score },
    { condition: 'Insomnia', score: assessment.insomnia.score },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#E5E7EB" />
        <PolarAngleAxis
          dataKey="condition"
          tick={{ fontSize: 13, fontWeight: 600, fill: '#374151' }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          tickCount={4}
        />
        <Radar
          name="Risk Score"
          dataKey="score"
          stroke="#4F46E5"
          fill="#4F46E5"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: any) => [`${value ?? 0}%`, 'Risk Score']}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #ECECEC',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            fontSize: 13,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
