"use client";

import Link from "next/link";
import { ArrowLeft, ImageOff, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportPhoto } from "@/lib/report-photos";

export function LampiranClient({
  eventId,
  reportId,
  eventName,
  receipts,
  documentation,
}: {
  eventId: number;
  reportId: number;
  eventName: string;
  receipts: ReportPhoto[];
  documentation: ReportPhoto[];
}) {
  const isEmpty = receipts.length === 0 && documentation.length === 0;

  function handlePrint() {
    window.print();
  }

  function PhotoGrid({ photos }: { photos: ReportPhoto[] }) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption}
              className="aspect-[3/4] w-full rounded-md border object-cover"
            />
            <p className="mt-1 truncate text-xs font-medium text-slate-900">
              {p.caption}
            </p>
            <p className="truncate text-[11px] text-slate-500">{p.subCaption}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print-layout { display: none !important; }
          body { background-color: white !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="no-print-layout flex items-center justify-between">
        <div>
          <Link
            href={`/events/${eventId}/reports/${reportId}`}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Laporan
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Lampiran Foto LPJ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Foto struk (realisasi anggaran terkonfirmasi) dan dokumentasi kegiatan — {eventName}
          </p>
        </div>
        {!isEmpty && (
          <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800">
            <Printer className="mr-1.5 h-4 w-4" />
            Cetak / Simpan PDF
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Card className="no-print-layout">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <ImageOff className="h-10 w-10 text-slate-300" />
            <p className="mt-4 font-medium text-slate-900">Belum ada foto</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Foto struk muncul otomatis begitu ada transaksi berstatus
              "Terkonfirmasi" di menu Keuangan. Foto dokumentasi kegiatan bisa
              diupload lewat menu Dokumen tiap divisi dengan kategori
              "Dokumentasi".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8 print:text-black">
          {receipts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Bukti Struk (Realisasi Anggaran)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoGrid photos={receipts} />
              </CardContent>
            </Card>
          )}
          {documentation.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Dokumentasi Kegiatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoGrid photos={documentation} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
