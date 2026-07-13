"use server";

import { requirePengurus } from "@/lib/authz";
import {
  sendDeadlineReminders,
  sendWeeklyRecaps,
} from "@/lib/notifications";

/** Manual triggers (also run automatically via Vercel Cron). */

export async function triggerDeadlineReminders(): Promise<{
  sent?: number;
  error?: string;
}> {
  await requirePengurus();
  const sent = await sendDeadlineReminders();
  return { sent };
}

export async function triggerWeeklyRecaps(): Promise<{
  sent?: number;
  error?: string;
}> {
  await requirePengurus();
  const sent = await sendWeeklyRecaps();
  return { sent };
}
