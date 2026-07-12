"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import type { Position } from "@prisma/client";
import Link from "next/link";
import { removeMembership } from "@/server/actions/members";
import { POSITION_LABELS, isCorePosition } from "@/lib/positions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type MemberRow = {
  membershipId: number;
  name: string;
  username: string;
  email: string | null;
  position: Position;
  divisionName: string | null;
};

export function MembersPanel({
  eventId,
  members,
}: {
  eventId: number;
  members: MemberRow[];
}) {
  const [, startTransition] = useTransition();

  function handleRemove(member: MemberRow) {
    startTransition(async () => {
      await removeMembership(member.membershipId);
      toast.success(`${member.name} dikeluarkan dari kepanitiaan`);
    });
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <UserPlus className="h-10 w-10 text-slate-300" />
          <p className="mt-4 font-medium text-slate-900">Belum ada panitia</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Import daftar panitia dari spreadsheet hasil oprek, lalu sistem
            membuatkan akun untuk semua anggota.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/events/${eventId}/import`}>
              <UserPlus className="mr-1 h-4 w-4" />
              Import panitia
            </Link>
          </Button>
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
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.membershipId}>
                <TableCell>
                  <span className="font-medium text-slate-900">{m.name}</span>
                  {m.email && (
                    <span className="block text-xs text-slate-500">
                      {m.email}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {m.username}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={isCorePosition(m.position) ? "default" : "secondary"}
                  >
                    {POSITION_LABELS[m.position]}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600">
                  {m.divisionName ?? "-"}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Keluarkan ${m.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Keluarkan {m.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Keanggotaannya di event ini dihapus. Akunnya tetap
                          ada dan bisa didaftarkan ke event lain.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(m)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Keluarkan
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
