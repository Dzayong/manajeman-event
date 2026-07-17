<div align="center">

# Sistem Manajemen Kepanitiaan Event HMIF

**Satu platform untuk seluruh siklus hidup kepanitiaan event kampus** — dari pembentukan panitia, papan tugas, presensi anti-fraud, keuangan berbasis AI OCR, proposal & persetujuan berjenjang, generator surat resmi, sampai laporan pertanggungjawaban (LPJ) yang ditulis AI dan diverifikasi manusia.

Dibangun untuk **Mini Web Dev Competition 2026** oleh tim **REMACode**.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?logo=openai&logoColor=white)](https://platform.openai.com)

</div>

> 📸 *Tambahkan screenshot/GIF demo dashboard, papan tugas, dan generator LPJ di sini sebelum publikasi ke profil tim.*

---

## Daftar Isi

- [Latar Belakang](#latar-belakang)
- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Model Peran & Akses](#model-peran--akses)
- [Keamanan](#keamanan)
- [Transparansi Penggunaan AI](#transparansi-penggunaan-ai)
- [Rencana Pengembangan](#rencana-pengembangan)
- [Tim](#tim)

---

## Latar Belakang

Setiap kepanitiaan event kampus biasanya dibentuk ulang dari nol untuk setiap acara, lalu bubar begitu acara selesai — tanpa mewariskan data atau pembelajaran ke generasi pengurus berikutnya. Dalam praktiknya ini menimbulkan pola masalah yang berulang tiap tahun:

- **Koordinasi tersebar** di banyak grup WhatsApp berbeda per divisi, informasi penting gampang tenggelam.
- **Presensi manual** (tanda tangan kertas / konfirmasi chat) rawan titip-hadir dan tidak bisa diaudit.
- **Keuangan berantakan** — RAB di Excel, struk belanja hilang di galeri HP, dan penyusunan LPJ di akhir acara jadi kerja lembur karena harus merekonstruksi ulang semua nota.
- **Ingatan institusional hilang** — begitu event selesai, riwayat kerja panitia ikut hilang, kepengurusan berikutnya mulai dari nol.

Sistem ini menyatukan seluruh siklus tersebut ke **satu sumber data**, dengan kontrol akses berbasis peran, presensi anti-kecurangan, alur keuangan yang bisa direkonsiliasi otomatis, dan AI yang membantu — tapi **selalu dipagari data asli**, bukan dipercaya buta (lihat [Transparansi Penggunaan AI](#transparansi-penggunaan-ai)).

## Fitur Utama

| Modul | Yang bisa dilakukan |
|---|---|
| **Manajemen Event & Akun** | Buat event, susun divisi, impor panitia lewat spreadsheet atau foto (dibaca AI), generate akun otomatis, wajib ganti password saat login pertama |
| **Papan Tugas per Divisi** | Kanban drag-and-drop (To-do/Dikerjakan/Selesai), checklist, komentar berdiskusi, riwayat aktivitas |
| **Pengumuman Lintas Divisi** | Blast pengumuman ke seluruh atau divisi tertentu, dengan tenggat opsional |
| **Presensi Anti-Fraud** | QR code dengan token yang berotasi otomatis setiap 20 detik, sehingga screenshot/titip-hadir tidak berlaku |
| **Keuangan Cerdas** | RAB per pos → foto struk dibaca AI (OCR vision) jadi rincian item → verifikasi manusia → realisasi anggaran terhitung otomatis |
| **Proposal & Persetujuan Berjenjang** | Ketua menyusun & mengajukan proposal, Pengurus meninjau dan menyetujui/menolak dengan catatan |
| **Generator Surat Resmi** | Surat izin tempat, surat tugas, dan surat undangan pemateri — otomatis terisi dari data panitia, siap cetak PDF dengan kop surat |
| **Laporan & LPJ Berbasis AI** | Draf ringkasan progres / LPJ disusun AI dari data asli, direvisi lewat obrolan, diekspor PDF (dengan kop surat, tanda tangan, dan lampiran foto bukti) maupun Word (.doc) |
| **Lampiran Foto Otomatis** | Halaman cetak terpisah yang mengumpulkan foto struk terkonfirmasi dan dokumentasi kegiatan jadi satu lampiran siap print |
| **Arsip Lintas Generasi** | Event yang sudah selesai (`DONE`) otomatis jadi *read-only* dan tetap bisa dijelajahi kepengurusan berikutnya, bukan terkubur di folder Drive yang terlupakan |

## Tech Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) + TypeScript | Full-stack dalam satu framework, cocok untuk tim kecil bergerak cepat |
| Database | MySQL + Prisma ORM 6 (21 model, 6 migrasi) | Type-safety otomatis ke TypeScript, mengurangi bug pada data |
| UI | Tailwind CSS 4 + shadcn/ui + Radix UI primitives | Komponen aksesibel siap pakai, konsisten di seluruh halaman |
| Autentikasi | `jose` (JWT) + `bcryptjs`, session cookie `httpOnly` | Stateless, tidak butuh session store terpisah |
| AI | OpenAI `gpt-4o-mini` (vision + teks) | OCR struk/roster foto, ringkasan progres, draf LPJ, revisi via chat |
| Presensi | `qrcode` | QR token berotasi 20 detik, divalidasi di server |
| Import data | `xlsx` | Impor panitia massal dari spreadsheet |
| Ekspor dokumen | `marked` + print bawaan browser | Render markdown laporan jadi PDF/Word tanpa dependency berat |
| Drag-and-drop | `@dnd-kit/core` | Papan tugas kanban yang mulus di desktop & mobile |
| Email | `nodemailer` (siap pakai, `EMAIL_MOCK` untuk pengembangan) | Kredensial akun & pengingat tenggat |

## Struktur Proyek

```
src/
├─ app/                     # Next.js App Router — 20 halaman (route)
│  ├─ (auth)/login/         # Halaman login
│  └─ (app)/                # Seluruh halaman setelah login
│     ├─ dashboard/
│     ├─ events/[id]/       # Workspace event, proposal, surat, laporan, keuangan
│     └─ divisions/[id]/    # Workspace per divisi (papan tugas, dokumen)
├─ server/actions/          # Server Actions — 15 modul, operasi tulis ke database
├─ lib/                     # Logic inti yang dipakai berulang
│  ├─ permissions.ts        #   kontrol akses berbasis peran, terpusat
│  ├─ ai.ts                 #   semua panggilan ke OpenAI
│  ├─ report-context.ts     #   menyusun data asli sebagai konteks AI
│  └─ report-markdown.ts    #   render markdown laporan → HTML aman (XSS-safe)
└─ components/              # Komponen UI yang dipakai lintas halaman
prisma/
├─ schema.prisma            # Skema database (21 model)
└─ migrations/              # Riwayat migrasi
```

## Menjalankan Secara Lokal

```bash
# 1. Install dependency
npm install

# 2. Siapkan environment variables
cp .env.example .env
# lalu isi .env sesuai tabel di bawah

# 3. Setup skema database
npx prisma migrate dev

# 4. (Opsional) isi akun percobaan
npx prisma db seed

# 5. Jalankan
npm run dev
```

Buka `http://localhost:3000`. Akun percobaan bawaan: `admin` / `admin123` (dari `prisma/seed.ts`, ganti passwordnya di lingkungan produksi).

## Variabel Lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string MySQL |
| `AUTH_SECRET` | ✅ | Kunci penandatanganan JWT sesi login. **Generate sendiri**, jangan pernah pakai contoh dari repo publik: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OPENAI_API_KEY` | ⚪ | Kosongkan untuk mode mock (`AI_MOCK=true`) — semua fitur AI tetap bisa dites dengan data contoh |
| `AI_MOCK` | ⚪ | `"true"` = fitur AI pakai data contoh, tanpa panggilan API asli |
| `SMTP_*`, `EMAIL_MOCK` | ⚪ | Kredensial Gmail SMTP untuk email kredensial/pengingat; `EMAIL_MOCK="true"` untuk pengembangan |
| `APP_URL` | ✅ | Base URL aplikasi (untuk link di email) |

## Model Peran & Akses

Dua tingkat peran, dipusatkan lewat satu fungsi otorisasi (`getEventAccess`) yang dipakai konsisten di seluruh sistem — bukan logic akses yang tersebar dan berpotensi tidak konsisten:

- **Pengurus** (himpunan) — akses penuh lintas semua event.
- **Panitia**, dengan posisi per event: `KETUA_PANITIA`, `SEKRETARIS`, `BENDAHARA`, `SC` (Steering Committee, *read-only*), `KOORDINATOR`/`STAFF` (terikat satu divisi).

Event yang berstatus `DONE` otomatis membuat seluruh akses jadi *read-only* bagi siapa pun — mekanisme yang sama dipakai untuk peran SC.

## Keamanan

- Password di-hash dengan `bcryptjs`, sesi login pakai JWT (`jose`) di cookie `httpOnly`.
- `.env.example` **tidak pernah** berisi nilai rahasia asli — hanya placeholder kosong.
- Presensi memakai token QR yang berotasi otomatis (20 detik), bukan kode statis yang bisa disebar lewat screenshot.
- Isi laporan (markdown yang bisa diedit manusia) di-escape sebelum dirender ke HTML untuk ekspor — mencegah injeksi script antar-pengguna.
- Validasi input di sisi server memakai `zod` pada seluruh Server Actions.

## Transparansi Penggunaan AI

Proyek ini dikembangkan dengan bantuan AI coding assistant (Claude) untuk sebagian besar implementasi kode, debugging, dan audit kualitas. Keputusan fitur, prioritas, arah desain, serta pengujian di perangkat asli tetap dilakukan oleh tim.

Selama pengembangan, tim menemukan bahwa fitur AI **tidak selalu otomatis akurat** — draf LPJ pernah menghasilkan rincian keuangan yang dikarang (nama item dan nominal yang tidak ada di database) saat AI tidak diberi akses ke data yang cukup rinci. Ini diperbaiki dengan mendesain ulang cara konteks data dikirim ke AI (lihat `src/lib/report-context.ts` dan `src/lib/ai.ts`): AI sekarang **hanya boleh memakai angka yang benar-benar ada di database**, dan wajib mengatakan terus terang jika data yang diminta belum cukup rinci — bukan mengarang.

## Rencana Pengembangan

- [ ] Deploy ke hosting cloud (Vercel) dengan database & penyimpanan file berbasis cloud (saat ini berjalan lokal dengan penyimpanan file di disk)
- [ ] Mode gelap (dark mode) secara menyeluruh
- [ ] Aktivasi notifikasi email otomatis (pengingat H-1, rekap mingguan) — infrastrukturnya sudah tersedia
- [ ] Perluasan ke multi-himpunan/multi-organisasi

## Tim

**REMACode** — Mini Web Dev Competition 2026

- Raka Zilva Inggia
- Muhammad Dzaki Awaludin
