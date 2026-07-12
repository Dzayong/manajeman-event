"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import type { EventStatus } from "@prisma/client";
import {
  deleteEvent,
  updateEvent,
  updateEventStatus,
} from "@/server/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type EventProps = {
  id: number;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
};

export function EventActions({ event }: { event: EventProps }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: event.name,
    description: event.description,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
  });

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateEventStatus(event.id, status as EventStatus);
      toast.success("Status event diperbarui");
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateEvent(event.id, form);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Event diperbarui");
      setEditOpen(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(event.id);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        defaultValue={event.status}
        onValueChange={handleStatusChange}
        disabled={pending}
      >
        <SelectTrigger className="w-32" aria-label="Status event">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="ONGOING">Berjalan</SelectItem>
          <SelectItem value="DONE">Selesai</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-4 w-4" />
            Ubah
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah detail event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama event</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Deskripsi</Label>
              <Textarea
                id="edit-desc"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-loc">Lokasi</Label>
                <Input
                  id="edit-loc"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-start">Mulai</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">Selesai</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan…
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Hapus
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus event ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua divisi, tugas, dokumen, presensi, dan data keuangan event
              &quot;{event.name}&quot; ikut terhapus. Tindakan ini tidak bisa
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
