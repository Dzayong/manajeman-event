import type { Position } from "@prisma/client";
import { POSITION_LABELS } from "@/lib/positions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MemberStats = {
  userId: number;
  name: string;
  username: string;
  position: Position;
  taskTotal: number;
  taskDone: number;
  taskOverdue: number;
  lastActive: string | null;
  attended: number;
};

type Health = "green" | "yellow" | "red";

function healthOf(m: MemberStats): Health {
  const idleDays = m.lastActive
    ? (Date.now() - new Date(m.lastActive).getTime()) / 86_400_000
    : Infinity;
  if (m.taskOverdue > 0 || idleDays > 3) return "red";
  if (idleDays > 1.5) return "yellow";
  return "green";
}

const HEALTH_STYLE: Record<Health, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const HEALTH_TITLE: Record<Health, string> = {
  green: "Aktif dan on-track",
  yellow: "Mulai jarang aktif",
  red: "Ada tugas telat atau lama tidak aktif",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "Belum pernah aktif";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export function MembersActivity({ members }: { members: MemberStats[] }) {
  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Belum ada anggota di divisi ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Nama</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead>Tugas</TableHead>
              <TableHead>Telat</TableHead>
              <TableHead>Presensi</TableHead>
              <TableHead>Terakhir aktif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const health = healthOf(m);
              return (
                <TableRow key={m.userId}>
                  <TableCell>
                    <span
                      title={HEALTH_TITLE[health]}
                      className={`block h-2.5 w-2.5 rounded-full ${HEALTH_STYLE[health]}`}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-900">{m.name}</span>
                    <span className="block text-xs text-slate-500">
                      @{m.username}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {POSITION_LABELS[m.position]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {m.taskDone}/{m.taskTotal} selesai
                  </TableCell>
                  <TableCell>
                    {m.taskOverdue > 0 ? (
                      <span className="font-medium text-red-600">
                        {m.taskOverdue} tugas
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {m.attended}×
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {relativeTime(m.lastActive)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-slate-500">
          Rekap dihitung otomatis dari aktivitas di sistem: update tugas,
          upload dokumen, dan presensi.
        </p>
      </CardContent>
    </Card>
  );
}
