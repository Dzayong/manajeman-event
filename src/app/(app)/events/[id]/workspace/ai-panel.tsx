"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Mail, Sparkles } from "lucide-react";
import type { ReportType } from "@prisma/client";
import { generateReport } from "@/server/actions/reports";
import {
  triggerDeadlineReminders,
  triggerWeeklyRecaps,
} from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportRow = { id: number; type: ReportType; createdAt: string };

export function AiPanel({
  eventId,
  canManage,
  isPengurus,
  reports,
}: {
  eventId: number;
  canManage: boolean;
  isPengurus: boolean;
  reports: ReportRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function handleGenerate(type: ReportType) {
    setBusy(type);
    try {
      const result = await generateReport(eventId, type);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        type === "LPJ_DRAFT" ? "Draft LPJ siap" : "Ringkasan progress siap",
      );
      router.push(`/events/${eventId}/reports/${result.reportId}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(kind: "reminder" | "recap") {
    setBusy(kind);
    try {
      const result =
        kind === "reminder"
          ? await triggerDeadlineReminders()
          : await triggerWeeklyRecaps();
      if (result.error) toast.error(result.error);
      else
        toast.success(
          `${result.sent} email ${kind === "reminder" ? "reminder" : "rekap"} diproses`,
        );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          AI &amp; laporan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {canManage && (
          <>
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={busy !== null}
              onClick={() => handleGenerate("PROGRESS_SUMMARY")}
            >
              {busy === "PROGRESS_SUMMARY" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {busy === "PROGRESS_SUMMARY"
                ? "Merangkum progress…"
                : "Rangkum progress (AI)"}
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={busy !== null}
              onClick={() => handleGenerate("LPJ_DRAFT")}
            >
              {busy === "LPJ_DRAFT" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              {busy === "LPJ_DRAFT" ? "Menyusun LPJ…" : "Generate draft LPJ (AI)"}
            </Button>
          </>
        )}

        {isPengurus && (
          <>
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={busy !== null}
              onClick={() => handleEmail("reminder")}
            >
              {busy === "reminder" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Kirim reminder deadline H-1
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={busy !== null}
              onClick={() => handleEmail("recap")}
            >
              {busy === "recap" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Kirim rekap mingguan ke ketua
            </Button>
          </>
        )}

        {reports.length > 0 && (
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Riwayat laporan
            </p>
            <div className="space-y-1">
              {reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/events/${eventId}/reports/${r.id}`}
                  className="block rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {r.type === "LPJ_DRAFT" ? "Draft LPJ" : "Ringkasan progress"}{" "}
                  <span className="text-xs text-slate-400">
                    ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
