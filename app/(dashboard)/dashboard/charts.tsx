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
  pending_client: "#f59e0b",
  in_progress: "#3b82f6",
  done_pending_payment: "#f97316",
  paid_closed: "#22c55e",
};

export function DashboardCharts({
  statusCounts,
  timeline,
}: {
  statusCounts: { name: string; value: number }[];
  timeline: { date: string; value: number }[];
}) {
  const data = statusCounts.map((s) => ({ ...s, label: STATUS_LABELS[s.name as TaskStatus] }));

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* Pie chart - narrower */}
      <div className="md:col-span-2 rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">توزيع الحالات</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={COLORS[d.name as TaskStatus]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: "13px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ background: COLORS[d.name as TaskStatus] }}
              />
              <span className="text-muted-foreground truncate">{d.label}</span>
              <span className="font-medium mr-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Area chart - wider */}
      <div className="md:col-span-3 rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">المهام خلال آخر 30 يوم</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="date"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                className="fill-muted-foreground"
                width={30}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(262, 83%, 58%)"
                strokeWidth={2}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
