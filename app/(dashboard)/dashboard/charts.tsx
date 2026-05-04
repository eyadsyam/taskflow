"use client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">توزيع الحالات</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.name} fill={COLORS[d.name as TaskStatus]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {data.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[d.name as TaskStatus] }} />
                {d.label} ({d.value})
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">المهام خلال آخر 30 يوم</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" stroke="currentColor" fontSize={11} />
              <YAxis stroke="currentColor" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
