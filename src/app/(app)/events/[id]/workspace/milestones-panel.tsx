"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Flag, Loader2, Plus, Trash2 } from "lucide-react";
import {
  addMilestone,
  deleteMilestone,
  toggleMilestone,
} from "@/server/actions/milestones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type MilestoneRow = {
  id: number;
  title: string;
  dueDate: string | null;
  isDone: boolean;
};

export function MilestonesPanel({
  eventId,
  milestones,
  canManage,
}: {
  eventId: number;
  milestones: MilestoneRow[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addMilestone(eventId, { title, dueDate });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Milestone ditambahkan");
      setTitle("");
      setDueDate("");
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="h-4 w-4" />
          Timeline acara
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestones.length === 0 && (
          <p className="text-sm text-slate-500">
            Belum ada milestone — tambahkan target besar seperti technical
            meeting atau gladi bersih.
          </p>
        )}
        {milestones.map((m) => (
          <div key={m.id} className="flex items-start gap-2">
            <Checkbox
              checked={m.isDone}
              disabled={!canManage || pending}
              onCheckedChange={(v) =>
                startTransition(async () => {
                  const result = await toggleMilestone(m.id, v === true);
                  if (result.error) toast.error(result.error);
                })
              }
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm ${m.isDone ? "text-slate-400 line-through" : "text-slate-900"}`}
              >
                {m.title}
              </p>
              {m.dueDate && (
                <p className="text-xs text-slate-500">
                  {new Date(m.dueDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteMilestone(m.id);
                    if (result.error) toast.error(result.error);
                    else toast.success("Milestone dihapus");
                  })
                }
                aria-label={`Hapus ${m.title}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            )}
          </div>
        ))}

        {canManage && (
          <form onSubmit={handleAdd} className="space-y-2 border-t pt-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul milestone"
              aria-label="Judul milestone"
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Tanggal milestone"
              />
              <Button type="submit" size="sm" disabled={pending || !title.trim()}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
