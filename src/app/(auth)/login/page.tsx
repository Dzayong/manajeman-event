import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk — Sistem Kepanitiaan HMIF" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 animate-pulse rounded-full bg-red-600/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-15%] left-[-10%] h-80 w-80 rounded-full bg-red-900/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(220,38,38,0.08),transparent_60%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium tracking-wide text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            KABINET METAFORSA
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            Sistem Kepanitiaan{" "}
            <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
              HMIF
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Workspace internal panitia — dari pembentukan sampai laporan
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          Himpunan Mahasiswa Teknik Informatika · UKRI
        </p>
      </div>
    </main>
  );
}
