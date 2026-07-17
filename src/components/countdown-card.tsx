"use client";

import { AlertTriangle, Calendar, Clock, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Milestone {
  id: number;
  title: string;
  dueDate: string | null;
  isDone: boolean;
}

interface CountdownCardProps {
  startDate: string | null;
  eventName: string;
  milestones: Milestone[];
}

export function CountdownCard({
  startDate,
  eventName,
  milestones,
}: CountdownCardProps) {
  const now = new Date();

  // 1. Gather all candidates
  const candidates: { name: string; date: Date; type: "event" | "milestone" }[] = [];

  if (startDate) {
    candidates.push({
      name: `Hari-H ${eventName}`,
      date: new Date(startDate),
      type: "event",
    });
  }

  milestones.forEach((m) => {
    if (!m.isDone && m.dueDate) {
      candidates.push({
        name: `Milestone: ${m.title}`,
        date: new Date(m.dueDate),
        type: "milestone",
      });
    }
  });

  if (candidates.length === 0) {
    return (
      <Card className="overflow-hidden border-slate-100 bg-slate-50/30">
        <CardContent className="flex items-center gap-3 p-4 text-slate-500">
          <Calendar className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Tidak ada agenda terdekat</span>
        </CardContent>
      </Card>
    );
  }

  // 2. Map and calculate daysLeft
  const mapped = candidates.map((c) => {
    // Zero out times for date-only comparison to avoid mid-day inaccuracies
    const targetDate = new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate());
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = targetDate.getTime() - currentDate.getTime();
    const daysLeft = Math.ceil(diffTime / 86_400_000);

    return { ...c, daysLeft };
  });

  // 3. Find active target
  // - Prefer future/today dates (daysLeft >= 0) sorted ascending (closest first)
  // - If none, prefer past dates (daysLeft < 0) sorted descending (closest overdue first)
  const future = mapped.filter((c) => c.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft);
  const past = mapped.filter((c) => c.daysLeft < 0).sort((a, b) => b.daysLeft - a.daysLeft);

  const activeTarget = future.length > 0 ? future[0] : past[0];

  const daysLeft = activeTarget.daysLeft;
  const isOverdue = daysLeft < 0;

  // Determine urgency tier (normal, soon, overdue) -- same 0-7-day "soon"
  // window as the task deadline badges (lib/urgency.ts), so the same color
  // always means the same thing across the app. Red is reserved for dates
  // that have actually passed, never for "getting close."
  let urgency: "normal" | "soon" | "overdue" = "normal";
  if (isOverdue) {
    urgency = "overdue";
  } else if (daysLeft <= 7) {
    urgency = "soon";
  }

  // Styling maps based on sisa hari
  const cardStyles = {
    overdue: "border-red-200 bg-red-50/40 text-red-900",
    soon: "border-amber-200 bg-amber-50/40 text-amber-900",
    normal: "border-slate-200 bg-slate-50/40 text-slate-800",
  };

  const badgeStyles = {
    overdue: "bg-red-100 text-red-700 border border-red-200",
    soon: "bg-amber-100 text-amber-700 border border-amber-200",
    normal: "bg-slate-100 text-slate-600 border border-slate-200",
  };

  const iconColor = {
    overdue: "text-red-600",
    soon: "text-amber-600",
    normal: "text-slate-500",
  };

  const pulseEffect = (urgency === "overdue" || (daysLeft >= 0 && daysLeft <= 3)) ? (
    <span className="absolute -top-1 -right-1 flex h-3 w-3">
      <span className={cn(
        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
        urgency === "overdue" ? "bg-red-400" : "bg-amber-400"
      )}></span>
      <span className={cn(
        "relative inline-flex rounded-full h-3 w-3",
        urgency === "overdue" ? "bg-red-500" : "bg-amber-500"
      )}></span>
    </span>
  ) : null;

  // Formatted text
  let countdownText = "";
  if (isOverdue) {
    countdownText = `Lewat ${Math.abs(daysLeft)} hari`;
  } else if (daysLeft === 0) {
    countdownText = "Hari ini!";
  } else if (daysLeft === 1) {
    countdownText = "Besok!";
  } else {
    countdownText = `${daysLeft} hari lagi`;
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-md border",
        cardStyles[urgency]
      )}
    >
      {pulseEffect}
      <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 shadow-sm",
              iconColor[urgency],
            )}
          >
            {isOverdue ? (
              <AlertTriangle className="h-5 w-5" />
            ) : daysLeft <= 3 ? (
              <Flame className="h-5 w-5 animate-bounce" style={{ animationDuration: "2s" }} />
            ) : daysLeft <= 7 ? (
              <Clock className="h-5 w-5" />
            ) : (
              <Calendar className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {activeTarget.type === "event" ? "Tenggat Utama" : "Tenggat Terdekat"}
            </h4>
            <p className="text-sm font-bold truncate mt-0.5 text-slate-900">
              {activeTarget.name}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Target: {activeTarget.date.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "self-start rounded-full px-3 py-1.5 text-xs font-extrabold whitespace-nowrap sm:self-center",
            badgeStyles[urgency],
          )}
        >
          {countdownText}
        </div>
      </CardContent>
    </Card>
  );
}
