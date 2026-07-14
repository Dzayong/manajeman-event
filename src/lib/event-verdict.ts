export type VerdictLevel = "good" | "warning" | "danger";

export const VERDICT_STYLE: Record<VerdictLevel, string> = {
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
};

/**
 * A one-line status verdict computed from data we already have — no AI
 * call needed for something rendered on every page view (that would mean
 * a live API request per pageview, which is slow and costs real quota).
 * Real AI calls stay reserved for on-demand actions (the AI panel).
 */
export function computeQuickVerdict(params: {
  overdueCount: number;
  stalledDivisionNames: string[];
}): { level: VerdictLevel; text: string } {
  const { overdueCount, stalledDivisionNames } = params;

  if (overdueCount > 0) {
    return {
      level: "danger",
      text: `${overdueCount} tugas sudah lewat tenggat — perlu ditindaklanjuti segera.`,
    };
  }
  if (stalledDivisionNames.length > 0) {
    return {
      level: "warning",
      text: `Belum ada progress di divisi ${stalledDivisionNames.join(", ")}.`,
    };
  }
  return {
    level: "good",
    text: "Semua divisi on-track, tidak ada tugas yang telat.",
  };
}
