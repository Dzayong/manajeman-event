import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { ChangePasswordForm } from "./change-password-form";
import { RulesGate } from "./rules-gate";

export const metadata = { title: "Selamat datang — Sistem Kepanitiaan HMIF" };

export default async function OnboardingPage() {
  const session = await requireSession();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { mustResetPassword: true, name: true },
  });
  if (!user) redirect("/login");

  if (user.mustResetPassword) {
    return (
      <OnboardingShell
        step={1}
        title={`Halo, ${user.name}`}
        subtitle="Demi keamanan, ganti password sementaramu terlebih dahulu."
      >
        <ChangePasswordForm />
      </OnboardingShell>
    );
  }

  // Find the first event whose current rules the user hasn't acknowledged
  const memberships = await db.membership.findMany({
    where: { userId: session.userId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          rulesContent: true,
          rulesVersion: true,
        },
      },
    },
  });

  for (const membership of memberships) {
    const { event } = membership;
    if (!event.rulesContent) continue;
    const ack = await db.ruleAcknowledgment.findUnique({
      where: {
        eventId_userId_rulesVersion: {
          eventId: event.id,
          userId: session.userId,
          rulesVersion: event.rulesVersion,
        },
      },
    });
    if (!ack) {
      return (
        <OnboardingShell
          step={2}
          title={`Tata tertib ${event.name}`}
          subtitle="Baca dan setujui aturan kepanitiaan sebelum masuk workspace."
        >
          <RulesGate eventId={event.id} rulesContent={event.rulesContent} />
        </OnboardingShell>
      );
    }
  }

  redirect("/dashboard");
}

function OnboardingShell({
  step,
  title,
  subtitle,
  children,
}: {
  step: 1 | 2;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">
          Langkah {step} dari 2
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
