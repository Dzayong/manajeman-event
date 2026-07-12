"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createEvent } from "@/server/actions/events";
import { DIVISION_TEMPLATES } from "@/lib/division-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DivisionDraft = {
  key: number;
  name: string;
  useStarterTasks: boolean;
  fromTemplate: boolean;
};

let nextKey = 100;

export function CreateEventForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [divisions, setDivisions] = useState<DivisionDraft[]>(
    DIVISION_TEMPLATES.map((t, i) => ({
      key: i,
      name: t.name,
      useStarterTasks: true,
      fromTemplate: true,
    })),
  );

  function updateDivision(key: number, patch: Partial<DivisionDraft>) {
    setDivisions((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );
  }

  function addDivisionRow() {
    setDivisions((prev) => [
      ...prev,
      { key: nextKey++, name: "", useStarterTasks: false, fromTemplate: false },
    ]);
  }

  function removeDivisionRow(key: number) {
    setDivisions((prev) => prev.filter((d) => d.key !== key));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanDivisions = divisions
      .map((d) => ({
        name: d.name.trim(),
        useStarterTasks: d.useStarterTasks,
      }))
      .filter((d) => d.name.length > 0);

    if (cleanDivisions.length === 0) {
      setError("Minimal satu divisi dengan nama terisi.");
      return;
    }

    startTransition(async () => {
      const result = await createEvent({
        name,
        description,
        location,
        startDate,
        endDate,
        divisions: cleanDivisions,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Event berhasil dibuat");
      router.push(`/events/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama event</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Osjur 2026"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Orientasi jurusan untuk mahasiswa baru"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Aula kampus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Selesai</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Divisi kepanitiaan</CardTitle>
          <p className="text-sm text-slate-500">
            Lima divisi standar himpunan sudah terisi — hapus, ubah, atau
            tambah sesuai kebutuhan event. Centang &quot;tugas awal&quot; untuk
            mengisi papan tugas divisi dengan tugas umum.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {divisions.map((d) => (
            <div key={d.key} className="flex items-center gap-3">
              <Input
                value={d.name}
                onChange={(e) =>
                  updateDivision(d.key, { name: e.target.value })
                }
                placeholder="Nama divisi"
                className="flex-1"
                aria-label="Nama divisi"
              />
              <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
                <Checkbox
                  checked={d.useStarterTasks}
                  onCheckedChange={(v) =>
                    updateDivision(d.key, { useStarterTasks: v === true })
                  }
                />
                Tugas awal
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDivisionRow(d.key)}
                aria-label={`Hapus divisi ${d.name || "baru"}`}
              >
                <Trash2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDivisionRow}
          >
            <Plus className="mr-1 h-4 w-4" />
            Tambah divisi
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan…
            </>
          ) : (
            "Buat event"
          )}
        </Button>
      </div>
    </form>
  );
}
