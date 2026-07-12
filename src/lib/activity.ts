import { db } from "@/lib/db";

type ActivityInput = {
  userId: number;
  eventId?: number;
  divisionId?: number;
  action: string;
  targetType?: string;
  targetId?: number;
  detail?: string;
};

/** Fire-and-forget activity trace; never blocks or breaks the main flow. */
export function logActivity(input: ActivityInput): void {
  db.activityLog
    .create({ data: input })
    .catch((e) => console.error("activity log failed:", e));
}
