import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePengurus(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "PENGURUS") redirect("/dashboard");
  return session;
}
