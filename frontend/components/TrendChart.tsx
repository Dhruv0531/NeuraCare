'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Assessment } from '@/lib/api';

interface TrendChartProps {
  assessments: Assessment[];
}

export default function TrendChart({ assessments }: TrendChartProps) {
  const data = [...assessments]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(a => ({
      date: new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      Depression: a.depression.score,
      Anxiety: a.anxiety.score,
      Stress: a.stress.score,
      Insomnia: a.insomnia.score,
    }));

  const lines = [
    { key: 'Depression', color: '#4F46E5' },
    { key: 'Anxiety', color: '#06B6D4' },
    { key: 'Stress', color: '#F59E0B' },
    { key: 'Insomnia', color: '#8B5CF6' },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #ECECEC',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            fontSize: 13,
          }}
          formatter={(value: number) => [`${value}%`]}
        />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
        {lines.map(l => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: l.color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
