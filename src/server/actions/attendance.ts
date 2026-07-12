"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { SessionMode } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { getEventAccess, canOperateEvent } from "@/lib/permissions";

async function authorizeOperator(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access || !canOperateEvent(access)) {
    return { error: "Kamu tidak punya akses mengelola presensi." as const };
  }
  return { session };
}

const sessionSchema = z.object({
  title: z.string().trim().min(1, "Nama sesi wajib diisi").max(200),
  mode: z.enum(["QR_SELF", "SCAN_STRICT"]),
});

export async function createAttendanceSession(
  eventId: number,
  input: { title: string; mode: SessionMode },
): Promise<{ id?: number; error?: string }> {
  const auth = await authorizeOperator(eventId);
  if ("error" in auth) return { error: auth.error };
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const attendanceSession = await db.attendanceSession.create({
    data: {
      eventId,
      title: parsed.data.title,
      mode: parsed.data.mode,
      secret: randomBytes(24).toString("hex"),
      openedById: auth.session.userId,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "attendance.open_session",
    targetType: "attendance_session",
    targetId: attendanceSession.id,
    detail: attendanceSession.title,
  });
  revalidatePath(`/events/${eventId}/workspace`);
  return { id: attendanceSession.id };
}

export async function closeAttendanceSession(
  sessionId: number,
): Promise<{ error?: string }> {
  const attendanceSession = await db.attendanceSession.findUnique({
    where: { id: sessionId },
  });
  if (!attendanceSession) return { error: "Sesi tidak ditemukan." };
  const auth = await authorizeOperator(attendanceSession.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.attendanceSession.update({
    where: { id: sessionId },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  logActivity({
    userId: auth.session.userId,
    eventId: attendanceSession.eventId,
    action: "attendance.close_session",
    detail: attendanceSession.title,
  });
  revalidatePath(`/events/${attendanceSession.eventId}/workspace`);
  revalidatePath(
    `/events/${attendanceSession.eventId}/attendance/${sessionId}`,
  );
  return {};
}

/** Organizer marks someone manually — always recorded with who did it. */
export async function markManualAttendance(
  sessionId: number,
  userId: number,
): Promise<{ error?: string }> {
  const attendanceSession = await db.attendanceSession.findUnique({
    where: { id: sessionId },
  });
  if (!attendanceSession) return { error: "Sesi tidak ditemukan." };
  if (attendanceSession.status === "CLOSED")
    return { error: "Sesi sudah ditutup." };
  const auth = await authorizeOperator(attendanceSession.eventId);
  if ("error" in auth) return { error: auth.error };

  const membership = await db.membership.findUnique({
    where: {
      userId_eventId: { userId, eventId: attendanceSession.eventId },
    },
  });
  if (!membership) return { error: "Orang ini bukan panitia event ini." };

  try {
    await db.attendance.create({
      data: {
        sessionId,
        userId,
        method: "MANUAL",
        markedById: auth.session.userId,
      },
    });
  } catch {
    return { error: "Sudah tercatat hadir di sesi ini." };
  }

  logActivity({
    userId: auth.session.userId,
    eventId: attendanceSession.eventId,
    action: "attendance.manual_mark",
    targetType: "user",
    targetId: userId,
  });
  revalidatePath(
    `/events/${attendanceSession.eventId}/attendance/${sessionId}`,
  );
  return {};
}

export type CheckInResult =
  | { ok: true; sessionTitle: string; eventName: string }
  | { ok: false; reason: string };

/** Member self check-in from a scanned one-time token (QR_SELF mode). */
export async function checkInWithToken(token: string): Promise<CheckInResult> {
  const session = await requireSession();

  const record = await db.attendanceToken.findUnique({
    where: { token },
    include: {
      session: { include: { event: { select: { id: true, name: true } } } },
    },
  });
  if (!record) return { ok: false, reason: "QR tidak dikenali." };
  if (record.usedAt)
    return { ok: false, reason: "QR ini sudah dipakai — scan QR terbaru di layar." };
  if (record.expiresAt < new Date())
    return { ok: false, reason: "QR kedaluwarsa — scan QR terbaru di layar." };
  if (record.session.status === "CLOSED")
    return { ok: false, reason: "Sesi presensi sudah ditutup." };

  const membership = await db.membership.findUnique({
    where: {
      userId_eventId: {
        userId: session.userId,
        eventId: record.session.eventId,
      },
    },
  });
  if (!membership && session.role !== "PENGURUS")
    return { ok: false, reason: "Kamu bukan panitia event ini." };

  const existing = await db.attendance.findUnique({
    where: {
      sessionId_userId: {
        sessionId: record.sessionId,
        userId: session.userId,
      },
    },
  });
  if (existing)
    return { ok: false, reason: "Kamu sudah tercatat hadir di sesi ini." };

  await db.$transaction([
    db.attendanceToken.update({
      where: { id: record.id },
      data: { usedAt: new Date(), usedById: session.userId },
    }),
    db.attendance.create({
      data: {
        sessionId: record.sessionId,
        userId: session.userId,
        method: "QR",
      },
    }),
  ]);

  logActivity({
    userId: session.userId,
    eventId: record.session.eventId,
    action: "attendance.checkin",
    targetType: "attendance_session",
    targetId: record.sessionId,
    detail: record.session.title,
  });
  // No revalidatePath here: this runs during render of /attend/[token],
  // and the organizer screen already refreshes itself on every token poll.
  return {
    ok: true,
    sessionTitle: record.session.title,
    eventName: record.session.event.name,
  };
}

export async function goToSession(eventId: number, sessionId: number) {
  redirect(`/events/${eventId}/attendance/${sessionId}`);
}
