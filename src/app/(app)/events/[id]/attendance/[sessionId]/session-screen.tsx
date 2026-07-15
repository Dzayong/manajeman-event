"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, Loader2, Lock, QrCode, UserCheck } from "lucide-react";
import type { AttendanceMethod, SessionMode, SessionStatus } from "@prisma/client";
import {
  closeAttendanceSession,
  markManualAttendance,
} from "@/server/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REFRESH_MS = 15_000;

type AttendanceRow = {
  userId: number;
  name: string;
  method: AttendanceMethod;
  markedBy: string | null;
  checkedInAt: string;
};

const METHOD_LABELS: Record<AttendanceMethod, string> = {
  QR: "QR",
  SCAN: "Discan operator",
  MANUAL: "Manual",
};

export function SessionScreen({
  sessionId,
  title,
  mode,
  status,
  attendances,
  absentMembers,
}: {
  sessionId: number;
  title: string;
  mode: SessionMode;
  status: SessionStatus;
  attendances: AttendanceRow[];
  absentMembers: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [manualUserId, setManualUserId] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/${sessionId}/token`, {
        method: "POST",
      });
      if (!res.ok) return;
      const data: { checkInUrl: string; expiresInMs: number; total: number } =
        await res.json();
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(data.checkInUrl, {
        width: 280,
        margin: 1,
      });
      setQrDataUrl(dataUrl);
      setSecondsLeft(Math.floor(data.expiresInMs / 1000));
      router.refresh();
    } catch {
      // network hiccup — next cycle will retry
    }
  }, [sessionId, router]);

  useEffect(() => {
    if (status !== "OPEN" || mode !== "QR_SELF") return;
    const initialRefresh = setTimeout(refreshToken, 0);
    const poll = setInterval(refreshToken, REFRESH_MS);
    timerRef.current = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => {
      clearTimeout(initialRefresh);
      clearInterval(poll);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, mode, refreshToken]);

  function handleManualMark() {
    if (!manualUserId) return;
    startTransition(async () => {
      const result = await markManualAttendance(
        sessionId,
        Number(manualUserId),
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ditandai hadir (tercatat sebagai manual)");
      setManualUserId("");
    });
  }

  function handleClose() {
    startTransition(async () => {
      const result = await closeAttendanceSession(sessionId);
      if (result.error) toast.error(result.error);
      else toast.success("Sesi presensi ditutup");
    });
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <Badge variant={status === "OPEN" ? "default" : "secondary"}>
            {status === "OPEN" ? "Berlangsung" : "Ditutup"}
          </Badge>
        </div>
        {status === "OPEN" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={pending}>
                <Lock className="mr-1 h-4 w-4" />
                Tutup sesi
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tutup sesi presensi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Setelah ditutup, tidak ada lagi check-in yang diterima —
                  termasuk QR yang masih beredar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleClose}>
                  Tutup sesi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {status === "OPEN" && mode === "QR_SELF" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4" />
                Tampilkan layar ini ke panitia
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-8">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR presensi — berganti otomatis"
                  className="h-64 w-64"
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              )}
              <p className="mt-2 text-sm text-slate-500">
                QR berganti dalam{" "}
                <span className="font-mono font-medium text-slate-900">
                  {secondsLeft}s
                </span>{" "}
                — hanya bisa dipakai satu kali
              </p>
            </CardContent>
          </Card>
        )}

        {status === "OPEN" && mode === "SCAN_STRICT" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mode scan ketat</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Tandai kehadiran satu per satu di pintu masuk lewat panel
              &quot;Tandai hadir&quot; di samping — setiap entri tercatat atas
              nama operator yang menandai.
            </CardContent>
          </Card>
        )}

        <Card className={status === "CLOSED" ? "lg:col-span-2" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4" />
                Hadir ({attendances.length})
              </CardTitle>
            </div>
            {status === "OPEN" && absentMembers.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Select value={manualUserId} onValueChange={setManualUserId}>
                  <SelectTrigger className="w-56" aria-label="Pilih panitia">
                    <SelectValue placeholder="Tandai hadir manual…" />
                  </SelectTrigger>
                  <SelectContent>
                    {absentMembers.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualMark}
                  disabled={pending || !manualUserId}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CircleCheck className="mr-1 h-4 w-4" />
                  )}
                  Tandai
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {attendances.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Belum ada yang check-in.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((a) => (
                    <TableRow key={a.userId}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={a.method === "MANUAL" ? "outline" : "secondary"}
                          className={
                            a.method === "MANUAL"
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : ""
                          }
                        >
                          {METHOD_LABELS[a.method]}
                          {a.markedBy ? ` oleh ${a.markedBy}` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(a.checkedInAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
