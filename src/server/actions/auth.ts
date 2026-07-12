"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Username atau password salah." };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
  });

  redirect(user.mustResetPassword ? "/onboarding" : "/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
