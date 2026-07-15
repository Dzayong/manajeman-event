"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  createAnnouncement,
  deleteAnnouncement,
} from "@/server/actions/announcements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DivisionOption = {
  id: number;
  name: string;
};

export type AnnouncementRow = {
  id: number;
  title: string;
  body: string;
  deadline: string | null;
  createdAt: string;
  createdBy: string | null;
  targetDivisions: DivisionOption[];
};

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatLongDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function TargetBadges({ targets }: { targets: DivisionOption[] }) {
  if (targets.length === 0) {
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <Users className="h-3 w-3" />
        Semua divisi
      </Badge>
    );
  }

  return (
    <>
      {targets.slice(0, 3).map((target) => (
        <Badge key={target.id} variant="outline" className="font-normal">
          {target.name}
        </Badge>
      ))}
      {targets.length > 3 && (
        <Badge variant="outline" className="font-normal">
          +{targets.length - 3}
        </Badge>
      )}
    </>
  );
}

export function AnnouncementsPanel({
  eventId,
  announcements,
  divisions,
  canOperate,
  showForm = false,
}: {
  eventId: number;
  announcements: AnnouncementRow[];
  divisions: DivisionOption[];
  canOperate: boolean;
  showForm?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deadline, setDeadline] = useState("");
  const [targetDivisionIds, setTargetDivisionIds] = useState<number[]>([]);

  function toggleTarget(divisionId: number, checked: boolean) {
    setTargetDivisionIds((current) =>
      checked
        ? Array.from(new Set([...current, divisionId]))
        : current.filter((id) => id !== divisionId),
    );
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createAnnouncement(eventId, {
        title,
        body,
        deadline,
        targetDivisionIds,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pengumuman diposting");
      setTitle("");
      setBody("");
      setDeadline("");
      setTargetDivisionIds([]);
    });
  }

  function handleDelete(announcement: AnnouncementRow) {
    startTransition(async () => {
      const result = await deleteAnnouncement(announcement.id);
      if (result.error) toast.error(result.error);
      else toast.success("Pengumuman dihapus");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          Pengumuman
        </CardTitle>
        {showForm && (
          <p className="text-sm text-slate-500">
            Info lintas-divisi yang perlu diketahui semua atau beberapa tim.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && canOperate && (
          <form
            onSubmit={handleAdd}
            className="space-y-3 rounded-lg border border-dashed p-3"
          >
            <div className="grid gap-2 md:grid-cols-[1fr_11rem]">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul pengumuman"
                aria-label="Judul pengumuman"
              />
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                aria-label="Deadline pengumuman"
              />
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tulis keputusan, kebutuhan, atau update singkat..."
              aria-label="Isi pengumuman"
              className="min-h-24"
            />
            {divisions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">
                  Target divisi
                  <span className="font-normal text-slate-500">
                    {" "}
                    (kosong = semua)
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {divisions.map((division) => (
                    <Label
                      key={division.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-normal"
                    >
                      <Checkbox
                        checked={targetDivisionIds.includes(division.id)}
                        onCheckedChange={(value) =>
                          toggleTarget(division.id, value === true)
                        }
                      />
                      {division.name}
                    </Label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={pending || !title.trim() || !body.trim()}
              >
                {pending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                Posting
              </Button>
            </div>
          </form>
        )}

        {announcements.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-500">
            Belum ada pengumuman lintas-divisi.
          </p>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {announcement.title}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                      {announcement.body}
                    </p>
                  </div>
                  {canOperate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={pending}
                      onClick={() => handleDelete(announcement)}
                      aria-label={`Hapus ${announcement.title}`}
                    >
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    {announcement.createdBy ?? "-"} -{" "}
                    {formatShortDate(announcement.createdAt)}
                  </span>
                  {announcement.deadline && (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <CalendarDays className="h-3 w-3" />
                      Deadline {formatLongDate(announcement.deadline)}
                    </span>
                  )}
                  <TargetBadges targets={announcement.targetDivisions} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
