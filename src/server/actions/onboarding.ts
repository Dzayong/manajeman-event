"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { hashPassword, verifyPassword } from "@/lib/password";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password sementara wajib diisi"),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error?: string };

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireSession();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "Akun tidak ditemukan." };

  const ok = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!ok) return { error: "Password sementara salah." };

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustResetPassword: false,
    },
  });

  logActivity({ userId: user.id, action: "user.change_password" });
  redirect("/onboarding");
}

export async function acknowledgeRules(eventId: number): Promise<void> {
  const session = await requireSession();
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/onboarding");

  await db.ruleAcknowledgment.upsert({
    where: {
      eventId_userId_rulesVersion: {
        eventId,
        userId: session.userId,
        rulesVersion: event.rulesVersion,
      },
    },
    update: {},
    create: {
      eventId,
      userId: session.userId,
      rulesVersion: event.rulesVersion,
    },
  });

  logActivity({
    userId: session.userId,
    eventId,
    action: "rules.acknowledge",
    detail: `v${event.rulesVersion}`,
  });
  redirect("/onboarding");
}
