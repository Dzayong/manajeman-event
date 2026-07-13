"use server";

import { revalidatePath } from "next/cache";
import type { ReportType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { getEventAccess } from "@/lib/permissions";
import { summarizeProgress, draftLpj, reviseReport } from "@/lib/ai";
import { buildEventContext } from "@/lib/report-context";

async function authorizeManage(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access || !access.canManageEvent) {
    return { error: "Hanya Pengurus, Ketua, atau Sekretaris." as const };
  }
  return { session };
}

export async function generateReport(
  eventId: number,
  type: ReportType,
): Promise<{ reportId?: number; error?: string }> {
  const auth = await authorizeManage(eventId);
  if ("error" in auth) return { error: auth.error };

  const context = await buildEventContext(eventId, {
    includeFinance: type === "LPJ_DRAFT",
  });
  if (!context) return { error: "Event tidak ditemukan." };

  let content: string;
  try {
    content =
      type === "LPJ_DRAFT"
        ? await draftLpj(context)
        : await summarizeProgress(context);
  } catch (e) {
    console.error("AI report failed:", e);
    return { error: "AI gagal membuat laporan — coba lagi." };
  }

  const report = await db.report.create({
    data: { eventId, type, content, createdById: auth.session.userId },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: type === "LPJ_DRAFT" ? "report.lpj" : "report.summary",
    targetType: "report",
    targetId: report.id,
  });
  revalidatePath(`/events/${eventId}/workspace`);
  return { reportId: report.id };
}

export async function updateReport(
  reportId: number,
  content: string,
): Promise<{ error?: string }> {
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Laporan tidak ditemukan." };
  const auth = await authorizeManage(report.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.report.update({
    where: { id: reportId },
    data: { content },
  });
  logActivity({
    userId: auth.session.userId,
    eventId: report.eventId,
    action: "report.edit",
    targetType: "report",
    targetId: reportId,
  });
  revalidatePath(`/events/${report.eventId}/reports/${reportId}`);
  return {};
}

/** Chat-driven revision: user gives an instruction, AI rewrites the whole
 * document and replies with a short confirmation. Chat history itself is
 * kept client-side only — the document (the artifact that matters for the
 * LPJ) is persisted on every turn. */
export async function reviseReportViaChat(
  reportId: number,
  instruction: string,
): Promise<{ reply?: string; content?: string; error?: string }> {
  const trimmed = instruction.trim();
  if (!trimmed) return { error: "Tulis instruksi dulu." };

  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Laporan tidak ditemukan." };
  const auth = await authorizeManage(report.eventId);
  if ("error" in auth) return { error: auth.error };

  let result;
  try {
    result = await reviseReport({
      type: report.type,
      currentContent: report.content,
      instruction: trimmed,
    });
  } catch (e) {
    console.error("revise report failed:", e);
    return { error: "AI gagal merevisi — coba lagi." };
  }

  await db.report.update({
    where: { id: reportId },
    data: { content: result.revisedContent },
  });

  logActivity({
    userId: auth.session.userId,
    eventId: report.eventId,
    action: "report.chat_revise",
    targetType: "report",
    targetId: reportId,
    detail: trimmed.slice(0, 100),
  });
  revalidatePath(`/events/${report.eventId}/reports/${reportId}`);
  return { reply: result.reply, content: result.revisedContent };
}
