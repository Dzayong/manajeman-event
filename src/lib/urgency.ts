export type Urgency = "normal" | "soon" | "overdue";

/** Same 3-tier color logic used everywhere a deadline is shown: task
 * badges, milestone countdowns — so the color always means the same thing. */
export function getUrgency(
  deadline: Date | string | null,
  isDone: boolean,
): Urgency {
  if (!deadline || isDone) return "normal";
  const date = typeof deadline === "string" ? new Date(deadline) : deadline;
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 3) return "soon";
  return "normal";
}

export const URGENCY_BADGE_CLASS: Record<Urgency, string> = {
  normal: "bg-slate-100 text-slate-600",
  soon: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};
