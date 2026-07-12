"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, QrCode, Users } from "lucide-react";
import type { SessionMode, SessionStatus } from "@prisma/client";
import { createAttendanceSession } from "@/server/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SessionRow = {
  id: number;
  title: string;
  mode: SessionMode;
  status: SessionStatus;
  openedAt: string;
  attendeeCount: number;
};

export function AttendancePanel({
  eventId,
  sessions,
  memberCount,
  canOperate,
}: {
  eventId: number;
  sessions: SessionRow[];
  memberCount: number;
  canOperate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<SessionMode>("QR_SELF");

  function handleCreate() {
    startTransition(async () => {
      const result = await createAttendanceSession(eventId, { title, mode });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Sesi presensi dibuka");
      setOpen(false);
      setTitle("");
      router.push(`/events/${eventId}/attendance/${result.id}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4" />
            Presensi
          </CardTitle>
          {canOperate && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Buka sesi
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sessions.length === 0 && (
          <p className="text-sm text-slate-500">
            Belum ada sesi presensi. Buka sesi untuk rapat atau hari-H, lalu
            tampilkan QR-nya di layar.
          </p>
        )}
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/events/${eventId}/attendance/${s.id}`}
            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-slate-400"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">{s.title}</p>
              <p className="text-xs text-slate-500">
                {new Date(s.openedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {s.mode === "QR_SELF" ? "QR dinamis" : "Scan ketat"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-slate-600">
                <Users className="h-4 w-4" />
                {s.attendeeCount}/{memberCount}
              </span>
              <Badge variant={s.status === "OPEN" ? "default" : "secondary"}>
                {s.status === "OPEN" ? "Berlangsung" : "Ditutup"}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka sesi presensi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rapat koordinasi #3 / Hari-H"
              aria-label="Nama sesi"
            />
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as SessionMode)}
            >
              <SelectTrigger aria-label="Mode presensi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QR_SELF">
                  QR dinamis — panitia scan layar (cepat)
                </SelectItem>
                <SelectItem value="SCAN_STRICT">
                  Scan ketat — operator tandai di pintu (hari-H)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              QR dinamis berganti tiap 20 detik dan hanya bisa dipakai sekali —
              screenshot yang dikirim ke grup langsung basi.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={pending || !title.trim()}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuka…
                </>
              ) : (
                "Buka sesi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
