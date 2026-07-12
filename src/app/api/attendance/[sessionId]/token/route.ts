import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getEventAccess, canOperateEvent } from "@/lib/permissions";

const TOKEN_TTL_MS = 20_000;

/**
 * Mint a fresh one-time check-in token for the rotating QR screen.
 * Only event operators may call this; the screen polls it every ~15s.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const id = Number(sessionId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const attendanceSession = await db.attendanceSession.findUnique({
    where: { id },
  });
  if (!attendanceSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (attendanceSession.status === "CLOSED") {
    return NextResponse.json({ error: "Session closed" }, { status: 409 });
  }

  const access = await getEventAccess(session, attendanceSession.eventId);
  if (!access || !canOperateEvent(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = randomBytes(20).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.attendanceToken.create({
    data: { sessionId: id, token, expiresAt },
  });

  // Housekeeping: drop stale unused tokens so the table stays small
  await db.attendanceToken.deleteMany({
    where: {
      sessionId: id,
      usedAt: null,
      expiresAt: { lt: new Date(Date.now() - 60_000) },
    },
  });

  const attendances = await db.attendance.findMany({
    where: { sessionId: id },
    include: { user: { select: { name: true } } },
    orderBy: { checkedInAt: "desc" },
    take: 8,
  });
  const total = await db.attendance.count({ where: { sessionId: id } });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    checkInUrl: `${appUrl}/attend/${token}`,
    expiresInMs: TOKEN_TTL_MS,
    total,
    recent: attendances.map((a) => ({
      name: a.user.name,
      method: a.method,
      at: a.checkedInAt.toISOString(),
    })),
  });
}
