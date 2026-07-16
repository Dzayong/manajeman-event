"use client";

import type { ReportPhoto } from "@/lib/report-photos";

/**
 * Screen-hidden, print-only rendering of a report. Kept separate from the
 * editor so the printed artefact is the *rendered* document (headings,
 * budget tables, photo evidence) rather than the raw markdown the editor
 * shows. Uses the browser's own print-to-PDF -- same approach as the
 * letter generator, no PDF library.
 */
export function ReportPrintView({
  html,
  title,
  eventName,
  createdAt,
  photos,
  isLpj,
  ketuaPelaksana,
}: {
  html: string;
  title: string;
  eventName: string;
  createdAt: string;
  photos: { receipts: ReportPhoto[]; documentation: ReportPhoto[] };
  isLpj: boolean;
  ketuaPelaksana: string | null;
}) {
  const hasPhotos =
    photos.receipts.length > 0 || photos.documentation.length > 0;

  return (
    <div className="hidden print:block">
      <style>{`
        @media print {
          @page { margin: 1.8cm; }
          .report-doc { color: #000; font-size: 11pt; line-height: 1.6; }
          .report-doc h1 { font-size: 16pt; font-weight: 700; margin: 0 0 .6em; }
          .report-doc h2 { font-size: 13pt; font-weight: 700; margin: 1.2em 0 .4em; }
          .report-doc h3 { font-size: 11.5pt; font-weight: 700; margin: 1em 0 .3em; }
          .report-doc p { margin: 0 0 .6em; text-align: justify; }
          .report-doc ul, .report-doc ol { margin: 0 0 .6em; padding-left: 1.4em; }
          .report-doc li { margin-bottom: .2em; }
          .report-doc table {
            width: 100%;
            border-collapse: collapse;
            margin: .5em 0 1em;
            font-size: 10pt;
            page-break-inside: avoid;
          }
          .report-doc th, .report-doc td {
            border: 1px solid #333;
            padding: 5px 7px;
            text-align: left;
            vertical-align: top;
          }
          .report-doc th { background: #f1f1f1; font-weight: 700; }
          .report-doc strong { font-weight: 700; }
          .print-photo { page-break-inside: avoid; break-inside: avoid; }
          .photo-section { page-break-before: always; }
          .report-signature { page-break-inside: avoid; }
        }
      `}</style>

      <div className="report-doc">
        {isLpj && (
          <div className="mb-4 border-b-4 border-double border-black pb-3 text-center">
            <p className="text-[13pt] font-bold uppercase leading-tight">
              Himpunan Mahasiswa Teknik Informatika (HMIF)
            </p>
            <p className="text-[11pt] font-semibold uppercase leading-normal">
              Universitas Kebangsaan Republik Indonesia (UKRI)
            </p>
            <p className="text-[9pt] italic">
              Sekretariat: Jl. Terusan Halimun No. 37, Langa, Bandung. Telp: (022) 731 234
            </p>
          </div>
        )}

        <div className="mb-6 border-b-2 border-black pb-3 text-center">
          <p className="text-[13pt] font-bold uppercase">{title}</p>
          <p className="text-[11pt]">{eventName}</p>
          <p className="text-[9pt] italic">Dibuat {createdAt}</p>
        </div>

        <div dangerouslySetInnerHTML={{ __html: html }} />

        {isLpj && (
          <div className="report-signature mt-10 grid grid-cols-2 gap-8 text-center text-[10.5pt]">
            <div>
              <p>Ketua Pelaksana,</p>
              <p className="font-bold">{eventName}</p>
              <div className="h-20" />
              <p className="font-bold underline">
                {ketuaPelaksana ?? " "}
              </p>
              <p className="text-[9pt]">Ketua Pelaksana</p>
            </div>
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Ketua Umum HMIF UKRI</p>
              <div className="h-20" />
              <p className="font-bold underline">&nbsp;</p>
              <p className="text-[9pt]">Ketua Himpunan</p>
            </div>
          </div>
        )}

        {hasPhotos && (
          <div className="photo-section">
            <h2>Lampiran: Bukti Foto</h2>

            {photos.receipts.length > 0 && (
              <>
                <h3>A. Bukti Struk (Realisasi Anggaran Terkonfirmasi)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {photos.receipts.map((p) => (
                    <div key={p.id} className="print-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.caption}
                        className="w-full border border-slate-400 object-contain"
                        style={{ maxHeight: "6cm" }}
                      />
                      <p className="mt-1 text-[8pt] leading-tight">
                        {p.caption}
                        <br />
                        {p.subCaption}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {photos.documentation.length > 0 && (
              <>
                <h3>B. Dokumentasi Kegiatan</h3>
                <div className="grid grid-cols-3 gap-3">
                  {photos.documentation.map((p) => (
                    <div key={p.id} className="print-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.caption}
                        className="w-full border border-slate-400 object-contain"
                        style={{ maxHeight: "6cm" }}
                      />
                      <p className="mt-1 text-[8pt] leading-tight">
                        {p.caption}
                        <br />
                        {p.subCaption}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
