import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyRecaps } from "@/lib/notifications";

/** Vercel Cron: weekly recap to each Ketua Pelaksana (see vercel.json). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sent = await sendWeeklyRecaps();
  return NextResponse.json({ sent });
}
