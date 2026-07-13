"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  FileSpreadsheet,
  Loader2,
  Mail,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import type { Position } from "@prisma/client";
import {
  generateAccounts,
  type GeneratedAccount,
  type MemberRowInput,
} from "@/server/actions/members";
import { parseRosterPhoto } from "@/server/actions/roster";
import { POSITION_LABELS, isCorePosition } from "@/lib/positions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type DivisionOption = { id: number; name: string };

type DraftRow = {
  key: number;
  name: string;
  email: string;
  divisionId: string; // "" = none
  position: Position;
};

let nextKey = 1;

const EMAIL_STATUS_LABELS: Record<string, string> = {
  sent: "Email terkirim",
  mocked: "Email (mode mock)",
  failed: "Email gagal",
  skipped: "Tanpa email",
};

export function ImportWizard({
  eventId,
  eventName,
  divisions,
}: {
  eventId: number;
  eventName: string;
  divisions: DivisionOption[];
}) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [results, setResults] = useState<GeneratedAccount[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [parsing, setParsing] = useState(false);
  const [scanningPhoto, setScanningPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function addRow(partial?: Partial<DraftRow>) {
    setRows((prev) => [
      ...prev,
      {
        key: nextKey++,
        name: "",
        email: "",
        divisionId: "",
        position: "STAFF",
        ...partial,
      },
    ]);
  }

  function updateRow(key: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function matchDivision(name: string): string {
    const found = divisions.find(
      (d) => d.name.toLowerCase() === name.trim().toLowerCase(),
    );
    return found ? String(found.id) : "";
  }

  function matchPosition(value: string): Position {
    const v = value.trim().toLowerCase();
    if (v.includes("ketua")) return "KETUA_PANITIA";
    if (v.includes("sekretaris")) return "SEKRETARIS";
    if (v.includes("bendahara")) return "BENDAHARA";
    if (v === "sc" || v.includes("steering")) return "SC";
    if (v.includes("koor")) return "KOORDINATOR";
    return "STAFF";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      if (json.length === 0) {
        toast.error("File kosong atau format tidak dikenali.");
        return;
      }

      const keys = Object.keys(json[0]);
      const nameKey = keys.find((k) => /nama|name/i.test(k));
      const emailKey = keys.find((k) => /mail/i.test(k));
      const divisionKey = keys.find((k) => /divisi|division/i.test(k));
      const positionKey = keys.find((k) => /posisi|jabatan|position/i.test(k));

      if (!nameKey) {
        toast.error(
          "Kolom nama tidak ditemukan. Pastikan ada kolom berjudul 'Nama'.",
        );
        return;
      }

      const imported = json
        .map((row) => ({
          name: String(row[nameKey] ?? "").trim(),
          email: emailKey ? String(row[emailKey] ?? "").trim() : "",
          divisionRaw: divisionKey ? String(row[divisionKey] ?? "") : "",
          positionRaw: positionKey ? String(row[positionKey] ?? "") : "",
        }))
        .filter((r) => r.name.length > 0);

      setRows((prev) => [
        ...prev,
        ...imported.map((r) => ({
          key: nextKey++,
          name: r.name,
          email: r.email,
          divisionId: matchDivision(r.divisionRaw),
          position: matchPosition(r.positionRaw),
        })),
      ]);
      toast.success(`${imported.length} baris terbaca dari ${file.name}`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file. Pastikan formatnya .xlsx atau .csv.");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await parseRosterPhoto(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const parsed = result.rows ?? [];
      setRows((prev) => [
        ...prev,
        ...parsed.map((r) => ({
          key: nextKey++,
          name: r.name,
          email: r.email,
          divisionId: matchDivision(r.division),
          position: matchPosition(r.position),
        })),
      ]);
      toast.success(`AI membaca ${parsed.length} nama dari foto`);
    } finally {
      setScanningPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function handleGenerate() {
    const invalid = rows.filter((r) => !r.name.trim());
    if (invalid.length > 0) {
      toast.error("Ada baris tanpa nama — isi atau hapus dulu.");
      return;
    }
    const payload: MemberRowInput[] = rows.map((r) => ({
      name: r.name.trim(),
      email: r.email.trim(),
      divisionId: r.divisionId ? Number(r.divisionId) : null,
      position: r.position,
    }));

    startTransition(async () => {
      const result = await generateAccounts(eventId, payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setResults(result.accounts ?? []);
      toast.success("Akun panitia berhasil dibuat");
    });
  }

  async function copyAccounts() {
    if (!results) return;
    const text = results
      .filter((a) => !a.error)
      .map(
        (a) =>
          `${a.name} — username: ${a.username} — password: ${a.temporaryPassword}`,
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Daftar akun disalin ke clipboard");
  }

  if (results) {
    const succeeded = results.filter((a) => !a.error);
    const failed = results.filter((a) => a.error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Check className="h-5 w-5 text-green-600" />
            {succeeded.length} akun dibuat untuk {eventName}
          </CardTitle>
          <p className="text-sm text-amber-600">
            Password sementara hanya ditampilkan sekali di halaman ini — salin
            sekarang bila diperlukan. Panitia yang punya email juga menerima
            kredensialnya via email.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password sementara</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {succeeded.map((a) => (
                <TableRow key={a.username}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {a.username}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {a.temporaryPassword}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {POSITION_LABELS[a.position]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      {EMAIL_STATUS_LABELS[a.emailStatus]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {failed.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {failed.length} baris gagal:{" "}
              {failed.map((f) => `${f.name} (${f.error})`).join("; ")}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" asChild>
              <Link href={`/events/${eventId}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Kembali ke event
              </Link>
            </Button>
            <Button onClick={copyAccounts}>
              <Copy className="mr-1 h-4 w-4" />
              Salin semua akun
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="hidden"
            id="spreadsheet-input"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
          >
            {parsing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-1 h-4 w-4" />
            )}
            Upload spreadsheet
          </Button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => photoInputRef.current?.click()}
            disabled={scanningPhoto}
          >
            {scanningPhoto ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Membaca foto…
              </>
            ) : (
              <>
                <Camera className="mr-1 h-4 w-4" />
                Foto daftar (AI)
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => addRow()}>
            <Plus className="mr-1 h-4 w-4" />
            Tambah baris manual
          </Button>
          <p className="text-sm text-slate-500">
            Kolom yang dikenali: Nama, Email, Divisi, Posisi/Jabatan
          </p>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <UserPlus className="h-10 w-10 text-slate-300" />
            <p className="mt-4 font-medium text-slate-900">
              Belum ada data panitia
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Upload file hasil oprek atau tambah baris manual untuk memulai.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Periksa data ({rows.length} orang)
            </CardTitle>
            <p className="text-sm text-slate-500">
              Rapikan nama, pilih divisi dan posisi tiap orang. Jabatan inti
              (Ketua, Sekretaris, Bendahara, SC) tidak memerlukan divisi.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Nama</TableHead>
                  <TableHead className="min-w-48">Email</TableHead>
                  <TableHead className="min-w-36">Posisi</TableHead>
                  <TableHead className="min-w-36">Divisi</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Input
                        value={r.name}
                        onChange={(e) =>
                          updateRow(r.key, { name: e.target.value })
                        }
                        placeholder="Nama lengkap"
                        aria-label="Nama"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.email}
                        onChange={(e) =>
                          updateRow(r.key, { email: e.target.value })
                        }
                        placeholder="email@gmail.com (opsional)"
                        aria-label="Email"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.position}
                        onValueChange={(v) =>
                          updateRow(r.key, {
                            position: v as Position,
                            ...(isCorePosition(v as Position)
                              ? { divisionId: "" }
                              : {}),
                          })
                        }
                      >
                        <SelectTrigger aria-label="Posisi">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.entries(POSITION_LABELS) as [
                              Position,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.divisionId || "none"}
                        onValueChange={(v) =>
                          updateRow(r.key, {
                            divisionId: v === "none" ? "" : v,
                          })
                        }
                        disabled={isCorePosition(r.position)}
                      >
                        <SelectTrigger aria-label="Divisi">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa divisi</SelectItem>
                          {divisions.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(r.key)}
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" asChild disabled={pending}>
                <Link href={`/events/${eventId}`}>Batal</Link>
              </Button>
              <Button onClick={handleGenerate} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuat {rows.length} akun…
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1 h-4 w-4" />
                    Generate {rows.length} akun
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
