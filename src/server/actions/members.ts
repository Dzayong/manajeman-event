"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Position } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePengurus } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { hashPassword, generateTemporaryPassword } from "@/lib/password";
import { sendAccountEmail, type EmailStatus } from "@/lib/email";
import { isCorePosition } from "@/lib/positions";

const memberRowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.union([z.literal(""), z.string().trim().email()]).optional(),
  divisionId: z.number().int().nullable(),
  position: z.enum([
    "KETUA_PANITIA",
    "SEKRETARIS",
    "BENDAHARA",
    "SC",
    "KOORDINATOR",
    "STAFF",
  ]),
});

export type MemberRowInput = z.infer<typeof memberRowSchema>;

export type GeneratedAccount = {
  name: string;
  username: string;
  temporaryPassword: string;
  email: string | null;
  position: Position;
  emailStatus: EmailStatus;
  error?: string;
};

function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(".");
  return slug || "panitia";
}

async function uniqueUsername(base: string, taken: Set<string>): Promise<string> {
  const existing = await db.user.findMany({
    where: { username: { startsWith: base } },
    select: { username: true },
  });
  for (const u of existing) taken.add(u.username);

  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let i = 2;
  while (taken.has(`${base}${i}`)) i++;
  const username = `${base}${i}`;
  taken.add(username);
  return username;
}

export async function generateAccounts(
  eventId: number,
  rows: MemberRowInput[],
): Promise<{ accounts?: GeneratedAccount[]; error?: string }> {
  const session = await requirePengurus();

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { divisions: { select: { id: true } } },
  });
  if (!event) return { error: "Event tidak ditemukan." };
  if (rows.length === 0) return { error: "Tidak ada baris untuk diproses." };

  const validDivisionIds = new Set(event.divisions.map((d) => d.id));
  const takenUsernames = new Set<string>();
  const accounts: GeneratedAccount[] = [];

  for (const raw of rows) {
    const parsed = memberRowSchema.safeParse(raw);
    if (!parsed.success) {
      accounts.push({
        name: String(raw.name ?? "(tanpa nama)"),
        username: "-",
        temporaryPassword: "-",
        email: null,
        position: "STAFF",
        emailStatus: "skipped",
        error: parsed.error.issues[0].message,
      });
      continue;
    }
    const row = parsed.data;
    const divisionId =
      isCorePosition(row.position) || !row.divisionId
        ? null
        : validDivisionIds.has(row.divisionId)
          ? row.divisionId
          : null;

    try {
      const username = await uniqueUsername(
        slugifyName(row.name),
        takenUsernames,
      );
      const temporaryPassword = generateTemporaryPassword();
      const email = row.email || null;

      const user = await db.user.create({
        data: {
          name: row.name,
          username,
          email,
          passwordHash: await hashPassword(temporaryPassword),
          role: "PANITIA",
          mustResetPassword: true,
          memberships: {
            create: { eventId, divisionId, position: row.position },
          },
        },
      });

      const emailStatus: EmailStatus = email
        ? await sendAccountEmail({
            to: email,
            name: row.name,
            username,
            temporaryPassword,
            eventName: event.name,
          })
        : "skipped";

      logActivity({
        userId: session.userId,
        eventId,
        divisionId: divisionId ?? undefined,
        action: "member.create",
        targetType: "user",
        targetId: user.id,
        detail: `${row.name} (${row.position})`,
      });

      accounts.push({
        name: row.name,
        username,
        temporaryPassword,
        email,
        position: row.position,
        emailStatus,
      });
    } catch (e) {
      console.error("generate account failed:", e);
      accounts.push({
        name: row.name,
        username: "-",
        temporaryPassword: "-",
        email: row.email || null,
        position: row.position,
        emailStatus: "skipped",
        error: "Gagal membuat akun (kemungkinan email sudah terpakai).",
      });
    }
  }

  revalidatePath(`/events/${eventId}`);
  return { accounts };
}

export async function removeMembership(membershipId: number): Promise<void> {
  const session = await requirePengurus();
  const membership = await db.membership.delete({
    where: { id: membershipId },
    include: { user: { select: { name: true } } },
  });
  logActivity({
    userId: session.userId,
    eventId: membership.eventId,
    action: "member.remove",
    detail: membership.user.name,
  });
  revalidatePath(`/events/${membership.eventId}`);
}
