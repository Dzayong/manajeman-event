"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProposalStatus } from "@prisma/client";

async function authorizeManage(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  // Note: Since getEventAccess returns readOnly=true when the event is completed (DONE), 
  // users cannot manage the proposal if the event is DONE because we block edits on readOnly.
  if (!access || access.readOnly || (!access.canManageEvent && !access.isPengurus)) {
    return { error: "Hanya Pengurus, Ketua Pelaksana, atau Sekretaris yang dapat mengelola proposal." };
  }
  return { session, access };
}

async function authorizeReview(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access || access.readOnly || !access.isPengurus) {
    return { error: "Hanya Pengurus yang dapat meninjau proposal." };
  }
  return { session, access };
}

const proposalInputSchema = z.object({
  tema: z.string().trim().max(200).optional(),
  latarBelakang: z.string().trim().optional(),
  tujuan: z.string().trim().optional(),
  sasaran: z.string().trim().optional(),
});

export async function getProposal(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access) return null;

  return db.proposal.findUnique({
    where: { eventId },
    include: {
      reviewedBy: { select: { name: true } },
    },
  });
}

export async function saveProposal(
  eventId: number,
  input: z.infer<typeof proposalInputSchema>,
) {
  const auth = await authorizeManage(eventId);
  if ("error" in auth) return { error: auth.error };

  const parsed = proposalInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tema, latarBelakang, tujuan, sasaran } = parsed.data;

  const proposal = await db.proposal.upsert({
    where: { eventId },
    update: {
      tema,
      latarBelakang,
      tujuan,
      sasaran,
    },
    create: {
      eventId,
      tema,
      latarBelakang,
      tujuan,
      sasaran,
      status: "DRAFT",
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "proposal.save",
    targetType: "proposal",
    targetId: proposal.id,
    detail: tema || "Draft proposal",
  });

  revalidatePath(`/events/${eventId}/proposal`);
  return { proposalId: proposal.id };
}

export async function submitProposal(eventId: number) {
  const auth = await authorizeManage(eventId);
  if ("error" in auth) return { error: auth.error };

  const proposal = await db.proposal.findUnique({
    where: { eventId },
  });

  if (!proposal) {
    return { error: "Isi proposal terlebih dahulu sebelum diajukan." };
  }

  if (proposal.status === "SUBMITTED") {
    return { error: "Proposal sudah diajukan dan sedang ditinjau." };
  }

  if (proposal.status === "APPROVED") {
    return { error: "Proposal sudah disetujui." };
  }

  const updated = await db.proposal.update({
    where: { eventId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "proposal.submit",
    targetType: "proposal",
    targetId: updated.id,
    detail: updated.tema || "Pengajuan proposal",
  });

  revalidatePath(`/events/${eventId}/proposal`);
  revalidatePath("/dashboard");
  return { proposalId: updated.id };
}

export async function reviewProposal(
  eventId: number,
  status: "APPROVED" | "REJECTED",
  reviewNote?: string,
) {
  const auth = await authorizeReview(eventId);
  if ("error" in auth) return { error: auth.error };

  const proposal = await db.proposal.findUnique({
    where: { eventId },
  });

  if (!proposal) return { error: "Proposal tidak ditemukan." };

  if (proposal.status !== "SUBMITTED") {
    return { error: "Proposal harus berada dalam status diajukan (SUBMITTED) untuk ditinjau." };
  }

  const updated = await db.proposal.update({
    where: { eventId },
    data: {
      status,
      reviewedById: auth.session.userId,
      reviewNote: reviewNote || null,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: status === "APPROVED" ? "proposal.approve" : "proposal.reject",
    targetType: "proposal",
    targetId: updated.id,
    detail: reviewNote ? `Catatan: ${reviewNote.slice(0, 100)}` : undefined,
  });

  revalidatePath(`/events/${eventId}/proposal`);
  revalidatePath("/dashboard");
  return { proposalId: updated.id };
}
