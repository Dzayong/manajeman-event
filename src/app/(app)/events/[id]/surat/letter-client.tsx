"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText, Calendar, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Member {
  name: string;
  position: string;
  divisionName: string | null;
}

interface LetterClientProps {
  eventId: number;
  eventName: string;
  eventLocation: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  proposalTema: string | null;
  members: Member[];
  isApproved: boolean;
}

export function LetterClient({
  eventId,
  eventName,
  eventLocation,
  eventStartDate,
  eventEndDate,
  proposalTema,
  members,
  isApproved,
}: LetterClientProps) {
  const [letterType, setLetterType] = useState<"izin" | "tugas" | "undangan">("izin");

  // Common Fields
  const [nomorSurat, setNomorSurat] = useState("001/HMIF-UKRI/VII/2026");
  const [tanggalSurat, setTanggalSurat] = useState(
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );
  const [pengirimKetuaUmum, setPengirimKetuaUmum] = useState("Ahmad Fauzi");

  // Surat Izin Tempat Fields
  const [penerimaIzin, setPenerimaIzin] = useState("Kepala Bagian Sarana & Prasarana UKRI");
  const [namaTempat, setNamaTempat] = useState(eventLocation || "Aula Kampus UKRI");
  const [waktuPenggunaan, setWaktuPenggunaan] = useState("09:00 s/d 16:00 WIB");

  // Surat Undangan Pemateri Fields
  const [penerimaUndangan, setPenerimaUndangan] = useState("Dr. Ir. H. Gunaawan, M.T.");
  const [topikMateri, setTopikMateri] = useState("Implementasi Kecerdasan Buatan pada Industri Kreatif");
  const [waktuAcara, setWaktuAcara] = useState(
    eventStartDate
      ? `${new Date(eventStartDate).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })} pukul 10:00 WIB`
      : "Kamis, 16 Juli 2026 pukul 10:00 WIB"
  );

  // Find Ketua Pelaksana from members
  const ketuaPelaksana = members.find((m) => m.position === "KETUA_PANITIA")?.name || "Ketua Pelaksana";

  const eventDatesFormatted = eventStartDate
    ? new Date(eventStartDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + (eventEndDate && eventEndDate !== eventStartDate ? ` s/d ${new Date(eventEndDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}` : "")
    : "16 Juli 2026";

  function handlePrint() {
    window.print();
  }

  if (!isApproved) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <Card className="border-red-200 bg-red-50/20 text-center">
          <CardContent className="py-12 flex flex-col items-center">
            <ShieldAlert className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-bold text-red-900">Akses Dibatasi</h2>
            <p className="text-sm text-red-700 mt-2 max-w-md">
              Anda tidak dapat mengakses Generator Surat karena proposal untuk event ini belum disetujui oleh Pengurus.
            </p>
            <Button asChild className="mt-6 bg-red-600 hover:bg-red-700 text-white">
              <Link href={`/events/${eventId}/proposal`}>
                Kembali ke Halaman Proposal
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print-layout {
            display: none !important;
          }
          .print-layout {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Header (No Print) */}
      <div className="flex items-center justify-between no-print-layout">
        <div>
          <Link
            href={`/events/${eventId}/proposal`}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Proposal
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Generator Surat Resmi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cetak dokumen administrasi surat izin, surat tugas, atau surat undangan
          </p>
        </div>
        <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800">
          <Printer className="mr-1.5 h-4 w-4" />
          Cetak / Simpan PDF
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-7 items-start no-print-layout">
        {/* Customize Fields (No Print) */}
        <Card className="lg:col-span-2 lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base font-bold">Kustomisasi Surat</CardTitle>
            <CardDescription>Pilih tipe surat dan sesuaikan informasi isian surat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="letterType">Tipe Surat</Label>
              <Select value={letterType} onValueChange={(v: any) => setLetterType(v)}>
                <SelectTrigger id="letterType">
                  <SelectValue placeholder="Pilih Tipe Surat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="izin">Surat Izin Tempat</SelectItem>
                  <SelectItem value="tugas">Surat Tugas Panitia</SelectItem>
                  <SelectItem value="undangan">Surat Undangan Pemateri</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomorSurat">Nomor Surat</Label>
              <Input
                id="nomorSurat"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggalSurat">Tanggal Surat</Label>
              <Input
                id="tanggalSurat"
                value={tanggalSurat}
                onChange={(e) => setTanggalSurat(e.target.value)}
              />
            </div>

            {letterType === "izin" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="penerimaIzin">Pihak Penerima Izin</Label>
                  <Input
                    id="penerimaIzin"
                    value={penerimaIzin}
                    onChange={(e) => setPenerimaIzin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="namaTempat">Nama Tempat / Sarana</Label>
                  <Input
                    id="namaTempat"
                    value={namaTempat}
                    onChange={(e) => setNamaTempat(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waktuPenggunaan">Waktu Penggunaan</Label>
                  <Input
                    id="waktuPenggunaan"
                    value={waktuPenggunaan}
                    onChange={(e) => setWaktuPenggunaan(e.target.value)}
                  />
                </div>
              </>
            )}

            {letterType === "undangan" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="penerimaUndangan">Nama Pemateri</Label>
                  <Input
                    id="penerimaUndangan"
                    value={penerimaUndangan}
                    onChange={(e) => setPenerimaUndangan(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topikMateri">Topik / Materi</Label>
                  <Input
                    id="topikMateri"
                    value={topikMateri}
                    onChange={(e) => setTopikMateri(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waktuAcara">Waktu Acara</Label>
                  <Input
                    id="waktuAcara"
                    value={waktuAcara}
                    onChange={(e) => setWaktuAcara(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="pengirimKetuaUmum">Nama Ketua Umum HMIF</Label>
              <Input
                id="pengirimKetuaUmum"
                value={pengirimKetuaUmum}
                onChange={(e) => setPengirimKetuaUmum(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel (No Print) */}
        <Card className="lg:col-span-5 overflow-hidden shadow-sm">
          <CardHeader className="bg-slate-50 border-b py-3 flex flex-row items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Preview</span>
            <span className="text-xs text-slate-500">Format Kertas A4</span>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[800px] bg-slate-100">
            {/* Embedded letter inside scroll area */}
            <div className="p-8 bg-white shadow-inner min-w-[700px] max-w-[800px] mx-auto my-4 border">
              <LetterTemplate
                letterType={letterType}
                nomorSurat={nomorSurat}
                tanggalSurat={tanggalSurat}
                pengirimKetuaUmum={pengirimKetuaUmum}
                ketuaPelaksana={ketuaPelaksana}
                penerimaIzin={penerimaIzin}
                namaTempat={namaTempat}
                waktuPenggunaan={waktuPenggunaan}
                penerimaUndangan={penerimaUndangan}
                topikMateri={topikMateri}
                waktuAcara={waktuAcara}
                eventName={eventName}
                eventDatesFormatted={eventDatesFormatted}
                eventLocation={eventLocation}
                proposalTema={proposalTema}
                members={members}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Standalone Full Print Layout (Hidden on screen, Visible on print) */}
      <div className="print-layout hidden p-8 bg-white text-black font-sans leading-relaxed text-sm">
        <LetterTemplate
          letterType={letterType}
          nomorSurat={nomorSurat}
          tanggalSurat={tanggalSurat}
          pengirimKetuaUmum={pengirimKetuaUmum}
          ketuaPelaksana={ketuaPelaksana}
          penerimaIzin={penerimaIzin}
          namaTempat={namaTempat}
          waktuPenggunaan={waktuPenggunaan}
          penerimaUndangan={penerimaUndangan}
          topikMateri={topikMateri}
          waktuAcara={waktuAcara}
          eventName={eventName}
          eventDatesFormatted={eventDatesFormatted}
          eventLocation={eventLocation}
          proposalTema={proposalTema}
          members={members}
        />
      </div>
    </div>
  );
}

// Letter Content Template Component
interface LetterTemplateProps {
  letterType: "izin" | "tugas" | "undangan";
  nomorSurat: string;
  tanggalSurat: string;
  pengirimKetuaUmum: string;
  ketuaPelaksana: string;
  penerimaIzin: string;
  namaTempat: string;
  waktuPenggunaan: string;
  penerimaUndangan: string;
  topikMateri: string;
  waktuAcara: string;
  eventName: string;
  eventDatesFormatted: string;
  eventLocation: string | null;
  proposalTema: string | null;
  members: Member[];
}

function LetterTemplate({
  letterType,
  nomorSurat,
  tanggalSurat,
  pengirimKetuaUmum,
  ketuaPelaksana,
  penerimaIzin,
  namaTempat,
  waktuPenggunaan,
  penerimaUndangan,
  topikMateri,
  waktuAcara,
  eventName,
  eventDatesFormatted,
  eventLocation,
  proposalTema,
  members,
}: LetterTemplateProps) {
  return (
    <div className="space-y-6 text-black font-serif">
      {/* Formal Letterhead (Kop Surat) */}
      <div className="text-center border-b-4 border-double border-black pb-4">
        <h2 className="text-xl font-bold tracking-wide uppercase leading-tight font-sans">
          Himpunan Mahasiswa Teknik Informatika (HMIF)
        </h2>
        <h3 className="text-lg font-semibold tracking-wide uppercase leading-normal font-sans">
          Universitas Kebangsaan Republik Indonesia (UKRI)
        </h3>
        <p className="text-xs italic mt-1 font-sans">
          Sekretariat: Jl. Terusan Halimun No. 37, Langa, Bandung. Telp: (022) 731 234
        </p>
      </div>

      {/* Date & No. */}
      <div className="flex justify-between items-start text-sm">
        <div>
          <table>
            <tbody>
              <tr>
                <td className="pr-4 py-0.5 font-bold">Nomor</td>
                <td className="py-0.5">: {nomorSurat}</td>
              </tr>
              <tr>
                <td className="pr-4 py-0.5 font-bold">Lampiran</td>
                <td className="py-0.5">: 1 (Satu) Berkas Proposal</td>
              </tr>
              <tr>
                <td className="pr-4 py-0.5 font-bold">Hal</td>
                <td className="py-0.5">
                  : {letterType === "izin" && "Permohonan Izin Tempat"}
                  {letterType === "tugas" && "Surat Tugas Kepanitiaan"}
                  {letterType === "undangan" && "Undangan Pemateri"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-right">Bandung, {tanggalSurat}</div>
      </div>

      {/* Content for Izin */}
      {letterType === "izin" && (
        <div className="space-y-4 text-sm text-justify">
          <div>
            <p className="font-bold">Kepada Yth.</p>
            <p className="font-bold">{penerimaIzin}</p>
            <p>Universitas Kebangsaan Republik Indonesia</p>
            <p>di Tempat</p>
          </div>

          <div className="pt-2 space-y-3">
            <p>Dengan hormat,</p>
            <p>
              Sehubungan dengan akan dilaksanakannya kegiatan akademik mahasiswa **{eventName}** dengan tema *&quot;{proposalTema || "Tema belum ditentukan"}&quot;* oleh Himpunan Mahasiswa Teknik Informatika (HMIF) UKRI, maka kami selaku panitia memohon izin untuk menggunakan sarana / tempat **{namaTempat}** guna menunjang kelancaran acara tersebut.
            </p>
            <p>Adapun kegiatan tersebut akan dilaksanakan pada:</p>
            <div className="pl-6">
              <table>
                <tbody>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Hari, Tanggal</td>
                    <td className="py-0.5">: {eventDatesFormatted}</td>
                  </tr>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Waktu</td>
                    <td className="py-0.5">: {waktuPenggunaan}</td>
                  </tr>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Tempat</td>
                    <td className="py-0.5">: {namaTempat}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Demikian surat permohonan ini kami sampaikan. Atas perhatian, dukungan, dan kebijaksanaan Bapak/Ibu, kami ucapkan terima kasih.
            </p>
          </div>
        </div>
      )}

      {/* Content for Tugas */}
      {letterType === "tugas" && (
        <div className="space-y-4 text-sm text-justify">
          <div className="text-center py-2">
            <h4 className="font-bold text-base uppercase tracking-wider underline">SURAT TUGAS</h4>
            <p className="text-xs">Nomor: {nomorSurat}</p>
          </div>

          <div className="space-y-3">
            <p>
              Himpunan Mahasiswa Teknik Informatika (HMIF) Universitas Kebangsaan Republik Indonesia (UKRI) dengan ini memberikan tugas penuh kepada nama-nama panitia pelaksana yang terlampir di bawah ini untuk melaksanakan, mengelola, dan bertanggung jawab atas kelancaran kegiatan **{eventName}** pada:
            </p>
            <div className="pl-6">
              <table>
                <tbody>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Hari, Tanggal</td>
                    <td className="py-0.5">: {eventDatesFormatted}</td>
                  </tr>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Tempat</td>
                    <td className="py-0.5">: {eventLocation || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="font-bold pt-2">Daftar Penerima Tugas:</p>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="p-2 border-r">No.</th>
                    <th className="p-2 border-r">Nama Lengkap</th>
                    <th className="p-2">Jabatan dalam Panitia</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="p-2 border-r text-center">{idx + 1}</td>
                      <td className="p-2 border-r font-medium">{m.name}</td>
                      <td className="p-2">
                        {m.position === "KETUA_PANITIA" && "Ketua Pelaksana"}
                        {m.position === "SEKRETARIS" && "Sekretaris Pelaksana"}
                        {m.position === "BENDAHARA" && "Bendahara Pelaksana"}
                        {m.position === "SC" && "Steering Committee"}
                        {m.position === "KOORDINATOR" && `Koordinator Divisi ${m.divisionName}`}
                        {m.position === "STAFF" && `Staff Divisi ${m.divisionName}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="pt-2">
              Demikian surat tugas ini diberikan kepada yang bersangkutan untuk dapat dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.
            </p>
          </div>
        </div>
      )}

      {/* Content for Undangan */}
      {letterType === "undangan" && (
        <div className="space-y-4 text-sm text-justify">
          <div>
            <p className="font-bold">Kepada Yth.</p>
            <p className="font-bold">{penerimaUndangan}</p>
            <p>di Tempat</p>
          </div>

          <div className="pt-2 space-y-3">
            <p>Dengan hormat,</p>
            <p>
              Sehubungan dengan akan dilaksanakannya kegiatan **{eventName}** dengan tema *&quot;{proposalTema || "Tema belum ditentukan"}&quot;*, kami dari Himpunan Mahasiswa Teknik Informatika (HMIF) UKRI bermaksud untuk mengundang Bapak/Ibu untuk menjadi **Pemateri / Narasumber** dengan topik materi *&quot;{topikMateri}&quot;*.
            </p>
            <p>Adapun sesi penyampaian materi tersebut akan dilaksanakan pada:</p>
            <div className="pl-6">
              <table>
                <tbody>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Hari, Tanggal</td>
                    <td className="py-0.5">: {eventDatesFormatted}</td>
                  </tr>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Waktu</td>
                    <td className="py-0.5">: {waktuAcara}</td>
                  </tr>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Tempat</td>
                    <td className="py-0.5">: {eventLocation || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Merupakan suatu kehormatan dan kebanggaan bagi kami apabila Bapak/Ibu berkenan untuk hadir dan membagikan ilmu serta pengalamannya kepada para peserta.
            </p>
            <p>
              Demikian surat undangan permohonan pemateri ini kami sampaikan. Atas kesediaan dan perhatian Bapak/Ibu, kami ucapkan terima kasih.
            </p>
          </div>
        </div>
      )}

      {/* Signature Block (Tanda Tangan) */}
      <div className="pt-8 grid grid-cols-2 text-center text-sm font-sans gap-8">
        <div>
          <p>Panitia Pelaksana,</p>
          <p className="font-bold">{eventName}</p>
          <div className="h-20"></div>
          <p className="font-bold underline">{ketuaPelaksana}</p>
          <p className="text-xs text-slate-500">Ketua Pelaksana</p>
        </div>
        <div>
          <p>Mengetahui,</p>
          <p className="font-bold">Ketua Umum HMIF UKRI</p>
          <div className="h-20"></div>
          <p className="font-bold underline">{pengirimKetuaUmum}</p>
          <p className="text-xs text-slate-500">Ketua Himpunan</p>
        </div>
      </div>
    </div>
  );
}
