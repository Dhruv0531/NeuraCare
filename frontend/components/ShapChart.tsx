'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { ShapFeature } from '@/lib/api';
import { humanLabel } from '@/lib/auth';

interface ShapChartProps {
  data: ShapFeature[];
  title?: string;
}

export default function ShapChart({ data, title }: ShapChartProps) {
  const sorted = [...data]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 8)
    .map(d => ({ ...d, label: humanLabel(d.feature) }));

  return (
    <div className="w-full">
      {title && <p className="text-sm font-semibold text-text-muted mb-4">{title}</p>}
      <div className="flex gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-400 inline-block" />
          Increases risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-400 inline-block" />
          Reduces risk
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 140, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
            width={135}
          />
          <Tooltip
            formatter={(value: any) => [Number(value ?? 0).toFixed(3), 'SHAP Value']}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #ECECEC',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontSize: 13,
            }}
          />
          <ReferenceLine x={0} stroke="#E5E7EB" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? '#F87171' : '#34D399'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
