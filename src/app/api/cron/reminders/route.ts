import { NextRequest, NextResponse } from "next/server";
import { sendDeadlineReminders } from "@/lib/notifications";

/** Vercel Cron: daily H-1 deadline reminders (see vercel.json). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sent = await sendDeadlineReminders();
  return NextResponse.json({ sent });
}
