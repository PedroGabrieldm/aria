'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface CategoryData {
  name: string
  value: number
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#60A5FA', '#A78BFA', '#FB923C', '#4ADE80']

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return <p className="empty-state">Nenhum dado de categoria disponível.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => fmt(Number(value))}
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
