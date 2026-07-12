"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { addDivision, deleteDivision } from "@/server/actions/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

type DivisionRow = {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  taskCount: number;
};

export function DivisionsPanel({
  eventId,
  divisions,
}: {
  eventId: number;
  divisions: DivisionRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [useStarter, setUseStarter] = useState(false);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await addDivision(eventId, {
        name: newName,
        useStarterTasks: useStarter,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Divisi ${newName} ditambahkan`);
      setNewName("");
      setUseStarter(false);
    });
  }

  function handleDelete(division: DivisionRow) {
    startTransition(async () => {
      await deleteDivision(division.id);
      toast.success(`Divisi ${division.name} dihapus`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {divisions.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex items-start justify-between gap-2 pt-4">
              <div>
                <p className="font-medium text-slate-900">{d.name}</p>
                {d.description && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {d.description}
                  </p>
                )}
                <p className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                  <Users className="h-4 w-4" />
                  {d.memberCount} anggota · {d.taskCount} tugas
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus divisi ${d.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Hapus divisi {d.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {d.taskCount} tugas di dalamnya ikut terhapus; anggota
                      divisi menjadi tanpa divisi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(d)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Hapus divisi
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama divisi baru"
          className="w-56"
          aria-label="Nama divisi baru"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Checkbox
            checked={useStarter}
            onCheckedChange={(v) => setUseStarter(v === true)}
          />
          Tugas awal
        </label>
        <Button type="submit" size="sm" disabled={pending || !newName.trim()}>
          {pending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Tambah
        </Button>
      </form>
    </div>
  );
}
