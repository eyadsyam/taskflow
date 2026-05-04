"use client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { STATUS_LABELS } from "@/lib/utils";
import type { TaskStatus } from "@/lib/database.types";

const COLORS: Record<TaskStatus, string> = {
  pending_client: "#fbbf24",
  in_progress: "#60a5fa",
  done_pending_payment: "#fb923c",
  paid_closed: "#34d399",
};

export function DashboardCharts({
  statusCounts,
  timeline,
}: {
  statusCounts: { name: string; value: number }[];
  timeline: { date: string; value: number }[];
}) {
  const data = statusCounts.map((s) => ({ ...s, label: STATUS_LABELS[s.name as TaskStatus] }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const tooltipStyle = {
    background: "hsl(240 5% 9%)",
    border: "1px solid hsl(240 5% 18%)",
    borderRadius: "6px",
    fontSize: "12px",
    padding: "6px 10px",
    color: "hsl(0 0% 98%)",
  };

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {/* Donut — distribution */}
      <div className="md:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">توزيع الحالات</span>
          <span className="text-[10px] text-muted-foreground tabular">{total} تاسك</span>
        </div>
        <div className="p-5">
          <div className="h-44 relative">
            {/* Center value */}
            <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
              <div className="text-center">
                <div className="text-2xl font-bold tabular leading-none">{total}</div>
                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                  المجموع
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={COLORS[d.name as TaskStatus]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(240 5% 11%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 rounded-sm shrink-0"
                  style={{ background: COLORS[d.name as TaskStatus] }}
                />
                <span className="text-muted-foreground truncate flex-1">{d.label}</span>
                <span className="font-semibold tabular">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Area — timeline */}
      <div className="md:col-span-3 rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">آخر 30 يوم</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            تاسكات / يوم
          </span>
        </div>
        <div className="p-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="limeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(79 86% 60%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(79 86% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(240 5% 14%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(240 5% 50%)"
                  interval="preserveStartEnd"
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(240 5% 50%)"
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "hsl(79 86% 60%)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(79 86% 60%)"
                  strokeWidth={2}
                  fill="url(#limeFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(79 86% 60%)", stroke: "hsl(240 6% 4%)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
