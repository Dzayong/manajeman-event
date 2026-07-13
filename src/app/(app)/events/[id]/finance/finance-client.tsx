"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Plus, ReceiptText, Trash2, Wallet } from "lucide-react";
import {
  addRabItem,
  deleteRabItem,
  uploadReceipt,
} from "@/server/actions/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

type RabRow = {
  id: number;
  itemName: string;
  divisionName: string | null;
  divisionId: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  note: string | null;
  realized: number;
};

type RecordRow = {
  id: number;
  totalAmount: number;
  status: "DRAFT" | "CONFIRMED";
  note: string | null;
  divisionName: string | null;
  rabItemName: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

export function FinanceClient({
  eventId,
  editable,
  divisions,
  rabItems,
  records,
}: {
  eventId: number;
  editable: boolean;
  divisions: { id: number; name: string }[];
  rabItems: RabRow[];
  records: RecordRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    itemName: "",
    divisionId: "none",
    quantity: "1",
    unitPrice: "",
  });

  const totalBudget = rabItems.reduce((s, r) => s + r.subtotal, 0);
  const totalRealized = records
    .filter((r) => r.status === "CONFIRMED")
    .reduce((s, r) => s + r.totalAmount, 0);

  function handleAddRab(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addRabItem(eventId, {
        itemName: form.itemName,
        divisionId: form.divisionId === "none" ? null : Number(form.divisionId),
        quantity: Number(form.quantity) || 1,
        unitPrice: Number(form.unitPrice) || 0,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pos RAB ditambahkan");
      setForm({ itemName: "", divisionId: "none", quantity: "1", unitPrice: "" });
    });
  }

  async function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadReceipt(eventId, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Struk terbaca — periksa & rapikan hasilnya");
      router.push(`/events/${eventId}/finance/${result.recordId}`);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-4">
          <CardContent className="py-0">
            <p className="text-sm text-slate-500">Total anggaran (RAB)</p>
            <p className="text-xl font-semibold text-slate-900">
              {formatIdr(totalBudget)}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="py-0">
            <p className="text-sm text-slate-500">Realisasi terkonfirmasi</p>
            <p className="text-xl font-semibold text-slate-900">
              {formatIdr(totalRealized)}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="py-0">
            <p className="text-sm text-slate-500">Sisa anggaran</p>
            <p
              className={`text-xl font-semibold ${totalBudget - totalRealized < 0 ? "text-red-600" : "text-slate-900"}`}
            >
              {formatIdr(totalBudget - totalRealized)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rab" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="rab">RAB ({rabItems.length})</TabsTrigger>
            <TabsTrigger value="records">
              Pengeluaran ({records.length})
            </TabsTrigger>
          </TabsList>
          {editable && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleReceipt}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
              >
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membaca struk…
                  </>
                ) : (
                  <>
                    <Camera className="mr-1 h-4 w-4" />
                    Foto struk (AI)
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <TabsContent value="rab" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                Rencana Anggaran Biaya
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rabItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Belum ada pos anggaran — tambahkan di bawah.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pos</TableHead>
                        <TableHead>Divisi</TableHead>
                        <TableHead className="text-right">Anggaran</TableHead>
                        <TableHead className="text-right">Realisasi</TableHead>
                        <TableHead className="text-right">Sisa</TableHead>
                        {editable && <TableHead className="w-10" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rabItems.map((r) => {
                        const remaining = r.subtotal - r.realized;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <span className="font-medium text-slate-900">
                                {r.itemName}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {r.quantity} × {formatIdr(r.unitPrice)}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {r.divisionName ?? "Umum"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatIdr(r.subtotal)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatIdr(r.realized)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${remaining < 0 ? "text-red-600" : "text-green-700"}`}
                            >
                              {formatIdr(remaining)}
                            </TableCell>
                            {editable && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={pending}
                                  onClick={() =>
                                    startTransition(async () => {
                                      const res = await deleteRabItem(r.id);
                                      if (res.error) toast.error(res.error);
                                      else toast.success("Pos RAB dihapus");
                                    })
                                  }
                                  aria-label={`Hapus ${r.itemName}`}
                                >
                                  <Trash2 className="h-4 w-4 text-slate-400" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {editable && (
                <form
                  onSubmit={handleAddRab}
                  className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4"
                >
                  <Input
                    value={form.itemName}
                    onChange={(e) =>
                      setForm({ ...form, itemName: e.target.value })
                    }
                    placeholder="Nama pos (mis. Konsumsi peserta)"
                    className="w-56"
                    aria-label="Nama pos"
                  />
                  <Select
                    value={form.divisionId}
                    onValueChange={(v) => setForm({ ...form, divisionId: v })}
                  >
                    <SelectTrigger className="w-36" aria-label="Divisi pos">
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
                  <Input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    className="w-20"
                    aria-label="Qty"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={form.unitPrice}
                    onChange={(e) =>
                      setForm({ ...form, unitPrice: e.target.value })
                    }
                    placeholder="Harga satuan"
                    className="w-36"
                    aria-label="Harga satuan"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending || !form.itemName.trim()}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    Tambah pos
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-4">
          {records.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <ReceiptText className="h-10 w-10 text-slate-300" />
                <p className="mt-4 font-medium text-slate-900">
                  Belum ada pengeluaran
                </p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Foto struk belanja dan AI akan menyusunnya jadi rincian
                  pengeluaran yang bisa diedit.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {records.map((r) => (
                <Card
                  key={r.id}
                  className="cursor-pointer py-0 transition-colors hover:border-slate-400"
                  onClick={() =>
                    router.push(`/events/${eventId}/finance/${r.id}`)
                  }
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatIdr(r.totalAmount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.rabItemName
                          ? `Pos: ${r.rabItemName}`
                          : "Belum ditautkan ke RAB"}
                        {r.divisionName ? ` · ${r.divisionName}` : ""} ·{" "}
                        {r.uploadedBy ?? "-"} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={r.status === "CONFIRMED" ? "default" : "outline"}
                      className={
                        r.status === "DRAFT"
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : ""
                      }
                    >
                      {r.status === "CONFIRMED" ? "Terkonfirmasi" : "Draft"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
