"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import {
  confirmFinanceRecord,
  deleteFinanceRecord,
  updateFinanceRecord,
} from "@/server/actions/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIdr } from "../finance-client";

type ItemDraft = { itemName: string; quantity: number; unitPrice: number };

export function RecordEditor({
  eventId,
  editable,
  record,
  divisions,
  rabItems,
}: {
  eventId: number;
  editable: boolean;
  record: {
    id: number;
    receiptUrl: string | null;
    status: "DRAFT" | "CONFIRMED";
    note: string;
    divisionId: number | null;
    rabItemId: number | null;
    items: ItemDraft[];
  };
  divisions: { id: number; name: string }[];
  rabItems: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<ItemDraft[]>(record.items);
  const [divisionId, setDivisionId] = useState(
    record.divisionId ? String(record.divisionId) : "none",
  );
  const [rabItemId, setRabItemId] = useState(
    record.rabItemId ? String(record.rabItemId) : "none",
  );
  const [note, setNote] = useState(record.note);

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  function save(thenConfirm: boolean) {
    startTransition(async () => {
      const result = await updateFinanceRecord(record.id, {
        divisionId: divisionId === "none" ? null : Number(divisionId),
        rabItemId: rabItemId === "none" ? null : Number(rabItemId),
        note,
        items: items.filter((i) => i.itemName.trim()),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (thenConfirm) {
        const confirmed = await confirmFinanceRecord(record.id);
        if (confirmed.error) {
          toast.error(confirmed.error);
          return;
        }
        toast.success("Pengeluaran dikonfirmasi & masuk realisasi");
        router.push(`/events/${eventId}/finance`);
        return;
      }
      toast.success("Perubahan disimpan");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFinanceRecord(record.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Catatan dihapus");
      router.push(`/events/${eventId}/finance`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto struk</CardTitle>
        </CardHeader>
        <CardContent>
          {record.receiptUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.receiptUrl}
              alt="Foto struk"
              className="max-h-[420px] w-full rounded-lg border object-contain"
            />
          ) : (
            <p className="text-sm text-slate-500">Tidak ada foto.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Hasil pembacaan AI</CardTitle>
            <Badge
              variant={record.status === "CONFIRMED" ? "default" : "outline"}
              className={
                record.status === "DRAFT"
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : ""
              }
            >
              {record.status === "CONFIRMED" ? "Terkonfirmasi" : "Draft"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={item.itemName}
                  disabled={!editable}
                  onChange={(e) => updateItem(i, { itemName: e.target.value })}
                  className="flex-1"
                  aria-label="Nama item"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  disabled={!editable}
                  onChange={(e) =>
                    updateItem(i, { quantity: Number(e.target.value) || 1 })
                  }
                  className="w-16"
                  aria-label="Qty"
                />
                <Input
                  type="number"
                  min={0}
                  value={item.unitPrice}
                  disabled={!editable}
                  onChange={(e) =>
                    updateItem(i, { unitPrice: Number(e.target.value) || 0 })
                  }
                  className="w-28"
                  aria-label="Harga satuan"
                />
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, j) => j !== i))
                    }
                    aria-label="Hapus item"
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                )}
              </div>
            ))}
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { itemName: "", quantity: 1, unitPrice: 0 },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Tambah item
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-lg font-semibold text-slate-900">
              {formatIdr(total)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-sm text-slate-600">Divisi</p>
              <Select
                value={divisionId}
                onValueChange={setDivisionId}
                disabled={!editable}
              >
                <SelectTrigger aria-label="Divisi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Umum</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-600">Pos RAB</p>
              <Select
                value={rabItemId}
                onValueChange={setRabItemId}
                disabled={!editable}
              >
                <SelectTrigger aria-label="Pos RAB">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa pos</SelectItem>
                  {rabItems.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Input
            value={note}
            disabled={!editable}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan (opsional)"
            aria-label="Catatan"
          />

          {editable && (
            <div className="flex items-center justify-between pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={pending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus catatan struk ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Rincian item hasil pembacaan ikut terhapus.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => save(false)}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Simpan draft
                </Button>
                <Button onClick={() => save(true)} disabled={pending}>
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Konfirmasi
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
