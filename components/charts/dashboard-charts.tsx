"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = { background: "#111", border: "1px solid #242424", borderRadius: 12, fontSize: 12 };

export function WeeklyEvolutionChart({ data }: { data: Array<{ week: string; leads: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 12, right: 4, left: -24, bottom: 0 }}>
        <defs><linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2F7DFF" stopOpacity={0.35} /><stop offset="100%" stopColor="#2F7DFF" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="#1b1b1b" vertical={false} />
        <XAxis dataKey="week" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#aaa" }} itemStyle={{ color: "#73A7FF" }} />
        <Area type="monotone" dataKey="leads" name="Leads" stroke="#2F7DFF" strokeWidth={2} fill="url(#leadsGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FunnelCommercialChart({ data }: { data: Array<{ name: string; value: number; fill: string }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <FunnelChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Funnel dataKey="value" data={data} isAnimationActive>
          {data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
          <LabelList position="right" fill="#aaa" stroke="none" dataKey="name" fontSize={10} />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

export function UserPerformanceChart({ data }: { data: Array<{ name: string; leads: number; fechados: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="#1b1b1b" horizontal={false} />
        <XAxis type="number" stroke="#555" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={74} stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="leads" name="Leads" fill="#2F7DFF" radius={[0, 5, 5, 0]} />
        <Bar dataKey="fechados" name="Fechados" fill="#73A7FF" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
