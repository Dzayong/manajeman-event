import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { checkInWithToken } from "@/server/actions/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Check-in presensi — Sistem Kepanitiaan HMIF" };

export default async function AttendPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await checkInWithToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center pt-8 pb-6 text-center">
          {result.ok ? (
            <>
              <CircleCheck className="h-14 w-14 text-green-600" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">
                Kamu tercatat hadir
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {result.sessionTitle} · {result.eventName}
              </p>
            </>
          ) : (
            <>
              <CircleX className="h-14 w-14 text-red-500" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">
                Check-in gagal
              </h1>
              <p className="mt-1 text-sm text-slate-500">{result.reason}</p>
            </>
          )}
          <Button asChild className="mt-6 w-full">
            <Link href="/dashboard">Ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
