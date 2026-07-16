"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, FileText, Printer, Save, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveProposal, submitProposal, reviewProposal } from "@/server/actions/proposals";
import Link from "next/link";

interface Proposal {
  id: number;
  eventId: number;
  tema: string | null;
  latarBelakang: string | null;
  tujuan: string | null;
  sasaran: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  submittedAt: Date | null;
  reviewNote: string | null;
  reviewedBy?: { name: string } | null;
}

interface ProposalFormProps {
  eventId: number;
  proposal: Proposal | null;
  isPengurus: boolean;
  canManage: boolean;
}

export function ProposalForm({ eventId, proposal, isPengurus, canManage }: ProposalFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [tema, setTema] = useState(proposal?.tema || "");
  const [latarBelakang, setLatarBelakang] = useState(proposal?.latarBelakang || "");
  const [tujuan, setTujuan] = useState(proposal?.tujuan || "");
  const [sasaran, setSasaran] = useState(proposal?.sasaran || "");
  const [reviewNote, setReviewNote] = useState("");

  const status = proposal?.status || "DRAFT";
  const isEditable = canManage && (status === "DRAFT" || status === "REJECTED");
  const isSubmitted = status === "SUBMITTED";
  const isApproved = status === "APPROVED";
  const isRejected = status === "REJECTED";

  function handleSave() {
    startTransition(async () => {
      const res = await saveProposal(eventId, {
        tema,
        latarBelakang,
        tujuan,
        sasaran,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Draft proposal berhasil disimpan.");
        router.refresh();
      }
    });
  }

  function handleSubmit() {
    if (!tema.trim() || !latarBelakang.trim() || !tujuan.trim() || !sasaran.trim()) {
      toast.error("Semua kolom proposal wajib diisi sebelum diajukan.");
      return;
    }

    startTransition(async () => {
      // First save the current draft
      const saveRes = await saveProposal(eventId, {
        tema,
        latarBelakang,
        tujuan,
        sasaran,
      });
      if (saveRes.error) {
        toast.error(saveRes.error);
        return;
      }

      // Then submit
      const res = await submitProposal(eventId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Proposal berhasil diajukan ke Pengurus.");
        router.refresh();
      }
    });
  }

  function handleReview(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !reviewNote.trim()) {
      toast.error("Catatan review wajib diisi jika menolak proposal.");
      return;
    }

    startTransition(async () => {
      const res = await reviewProposal(eventId, decision, reviewNote);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          decision === "APPROVED"
            ? "Proposal telah disetujui."
            : "Proposal telah ditolak / diminta revisi."
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Status Banners */}
      {isApproved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Proposal Disetujui</p>
              <p className="text-sm mt-1">
                Proposal ini telah disetujui oleh Pengurus ({proposal?.reviewedBy?.name}). Anda sekarang dapat mengakses **Generator Surat** untuk mencetak surat izin, surat tugas, atau surat undangan resmi.
              </p>
              {proposal?.reviewNote && (
                <p className="text-sm mt-2 italic bg-emerald-100/50 dark:bg-emerald-950/40 p-2 rounded">
                  Catatan Reviewer: &quot;{proposal.reviewNote}&quot;
                </p>
              )}
              <div className="mt-3">
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href={`/events/${eventId}/surat`}>
                    <Printer className="mr-1.5 h-4 w-4" />
                    Buka Generator Surat
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSubmitted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Menunggu Persetujuan</p>
              <p className="text-sm mt-1">
                Proposal telah diajukan dan sedang ditinjau oleh Pengurus. Pengeditan dinonaktifkan sementara selama proses peninjauan berlangsung.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-950 dark:bg-red-950/20 dark:text-red-200">
          <div className="flex gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Proposal Ditolak / Perlu Revisi</p>
              <p className="text-sm mt-1">
                Proposal ini perlu diperbaiki berdasarkan masukan dari Pengurus ({proposal?.reviewedBy?.name}). Silakan perbaiki data di bawah dan ajukan kembali.
              </p>
              {proposal?.reviewNote && (
                <p className="text-sm mt-2 font-medium bg-red-100/50 dark:bg-red-950/40 p-2 rounded">
                  Catatan Reviewer: &quot;{proposal.reviewNote}&quot;
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Section for Pengurus */}
      {isPengurus && isSubmitted && (
        <Card className="border-amber-300 bg-amber-50/10">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-amber-500" />
              Persetujuan Proposal (Khusus Pengurus)
            </CardTitle>
            <CardDescription>
              Tinjau isi proposal di bawah, berikan catatan review, lalu berikan keputusan persetujuan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reviewNote" className="font-medium text-slate-700">Catatan Review</Label>
              <Textarea
                id="reviewNote"
                placeholder="Tulis catatan persetujuan atau alasan penolakan di sini..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                disabled={pending}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => handleReview("APPROVED")}
                disabled={pending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Setujui Proposal
              </Button>
              <Button
                onClick={() => handleReview("REJECTED")}
                disabled={pending}
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Tolak / Minta Revisi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" />
            Detail Proposal Kegiatan
          </CardTitle>
          <CardDescription>
            Isi dengan lengkap tema, latar belakang, tujuan, dan sasaran dari kegiatan ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tema" className="font-medium text-slate-700">Tema Kegiatan</Label>
            <Input
              id="tema"
              placeholder="Contoh: Mengembangkan Kreativitas Mahasiswa di Era Digital"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              disabled={!isEditable || pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="latarBelakang" className="font-medium text-slate-700">Latar Belakang</Label>
            <Textarea
              id="latarBelakang"
              placeholder="Jelaskan alasan dan kondisi yang melatarbelakangi kegiatan ini..."
              value={latarBelakang}
              onChange={(e) => setLatarBelakang(e.target.value)}
              disabled={!isEditable || pending}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tujuan" className="font-medium text-slate-700">Tujuan Kegiatan</Label>
            <Textarea
              id="tujuan"
              placeholder="Tuliskan tujuan yang ingin dicapai dari kegiatan ini..."
              value={tujuan}
              onChange={(e) => setTujuan(e.target.value)}
              disabled={!isEditable || pending}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sasaran" className="font-medium text-slate-700">Sasaran Kegiatan</Label>
            <Textarea
              id="sasaran"
              placeholder="Siapa target peserta atau pihak yang terlibat dalam kegiatan ini..."
              value={sasaran}
              onChange={(e) => setSasaran(e.target.value)}
              disabled={!isEditable || pending}
              rows={3}
            />
          </div>

          {isEditable && (
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={pending} variant="outline" className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                Simpan Draft
              </Button>
              <Button onClick={handleSubmit} disabled={pending} className="flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                Ajukan Proposal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
