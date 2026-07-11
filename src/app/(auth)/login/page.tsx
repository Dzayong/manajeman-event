import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk — Sistem Kepanitiaan HMIF" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Sistem Kepanitiaan HMIF
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Workspace internal panitia event
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
