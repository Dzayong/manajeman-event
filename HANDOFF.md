# Handoff — Sistem Kepanitiaan HMIF UKRI

Dokumen ini ditulis supaya AI/asisten baru bisa langsung lanjut kerja tanpa
kehilangan konteks. Baca ini dari atas ke bawah sebelum menyentuh kode.

## 1. Apa ini dan untuk siapa

Web app internal untuk panitia event HMIF (Himpunan Mahasiswa Teknik
Informatika, UKRI) menjalankan kepanitiaan dari pembentukan sampai laporan
akhir (LPJ). Ini **melengkapi**, bukan menyaingi, sistem pendaftaran peserta
publik yang sudah ada (`dev.hmifukri.net`, pakai Brevo untuk email massal &
sertifikat) — sistem ini murni untuk kerja *internal* panitia.

Awalnya dibangun untuk lomba "Mini Web Development Competition HMIF UKRI
2026" (deadline 16 Juli 23:50 WIB). **Pada 14 Juli, tim (Raka & Dzaki)
memutuskan tenggat lomba tidak lagi jadi patokan** — target sekarang: bangun
sistem terbaik yang benar-benar menuntaskan masalah manajemen kepanitiaan,
kualitas UI/UX setara atau melebihi referensi (app "Cicle"), berapa pun
lama waktunya. Lihat bagian 6 untuk roadmap yang sedang dikerjakan.

## 2. Tech stack

- **Next.js 16** (App Router, Turbopack) + TypeScript — fullstack, TANPA
  backend terpisah. **Next.js 16 mengganti `middleware.ts` jadi
  `src/proxy.ts`** (breaking change dari versi sebelumnya — jangan bikin
  `middleware.ts`, sudah tidak dipakai).
- **Tailwind CSS + shadcn/ui** (preset "nova", base "radix")
- **MySQL** via Prisma — **Prisma versi 6** (bukan 7 yang baru rilis dan
  mengubah cara datasource `url` dikonfigurasi — sengaja tidak upgrade,
  demi stabilitas)
- **Auth**: credential-based custom (bukan NextAuth) — bcrypt hash +
  JWT session cookie httpOnly (pakai `jose`)
- **AI**: OpenAI `gpt-4o-mini`, dipanggil **server-side saja**
  (`src/lib/ai.ts`), dengan mode mock (`AI_MOCK=true` di `.env`) untuk dev
  tanpa keluar biaya
- **Email**: Nodemailer + Gmail SMTP, juga ada mode mock (`EMAIL_MOCK=true`)
- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/utilities`
- **QR**: `qrcode` (generate) — presensi anti-fraud (lihat bagian 5)
- Lain-lain: `xlsx` (baca spreadsheet import), `zod` (validasi)

Font: **Plus Jakarta Sans** (body) + **Poppins** (heading) — identitas
warna: **merah `#DC2626`/red-600 + hitam**, BUKAN navy seperti dugaan awal
brief (dikoreksi 13 Juli setelah cek screenshot asli hmifukri.net — situs
asli pakai merah-hitam, bukan token warna ungu yang sempat salah diambil
dari CSS custom properties yang ternyata tidak dipakai).

## 3. Menjalankan project ini

```powershell
cd "projects/web-apps/hmif-kepanitiaan"
npm install
npx prisma generate          # kalau baru clone / setelah ubah schema
npm run dev                  # Turbopack, http://localhost:3000
```

**MySQL harus jalan duluan** (XAMPP). Kalau XAMPP Control Panel tidak ada,
nyalakan manual dari Git Bash:
```bash
cd /c/xampp/mysql/bin && ./mysqld.exe --defaults-file=/c/xampp/mysql/bin/my.ini --standalone &
```
Database: `hmif_kepanitiaan` (MySQL lokal, `root` tanpa password).

`.env` (lihat `.env.example` untuk template) — isi field ini:
`DATABASE_URL`, `AUTH_SECRET` (random hex, jangan sampai bocor),
`OPENAI_API_KEY` + `AI_MOCK`, `SMTP_*` + `EMAIL_MOCK`, `APP_URL`.

**PENTING — insiden API key**: user sempat menempel API key OpenAI di
chat (11 Juli). Itu HARUS dianggap bocor. Kalau belum di-revoke, ingatkan
user untuk revoke di platform.openai.com dan pasang key baru + hard limit
$5 sebelum `AI_MOCK` dimatikan.

**Akun demo**: `admin` / `admin123` (role PENGURUS, di-seed lewat
`prisma/seed.ts` — `npx prisma db seed`).

### Gotcha teknis yang sudah pernah kejadian
- **Jangan jalankan `npx prisma migrate dev` sambil dev server nyala** —
  akan EPERM saat generate client (file lock di Windows). Stop dev server
  dulu, migrate, baru start lagi.
- Kalau ekstensi browser (Claude in Chrome / preview pane) tidak
  konek, verifikasi tetap bisa jalan lewat `curl` + sesi JWT palsu:
  tanda-tangani token pakai `AUTH_SECRET` yang sama (lib `jose`, payload
  `{userId, role, name, username}`, algoritma HS256), pasang sebagai
  cookie `session=<token>` di header `Cookie`, lalu `curl` halaman yang
  butuh login. Berhasil dipakai untuk verifikasi Fase 1 tanpa browser.
- Klik pertama di browser kadang tidak terdaftar tepat setelah
  navigasi/reload (React hydration belum selesai) — pola berulang di
  sesi sebelumnya, solusinya cuma retry sekali.

## 4. Struktur & peran (model data inti)

5 posisi (`enum Position` di `prisma/schema.prisma`):
`KETUA_PANITIA`, `SEKRETARIS`, `BENDAHARA`, `SC` (Steering Committee,
read-only), `KOORDINATOR`, `STAFF`. 2 role akun (`enum Role`): `PENGURUS`
(admin himpunan, akses semua event) dan `PANITIA` (akun hasil generate,
akses via `Membership`).

Hirarki: **Event → Division → Task**. `Membership` menghubungkan
`User` ↔ `Event` (+ opsional `Division`, + `Position`). Jabatan inti
(Ketua/Sekretaris/Bendahara/SC) tidak terikat divisi (`divisionId = null`
di Membership); Koordinator/Staff terikat satu divisi.

Logika hak akses terpusat di **`src/lib/permissions.ts`**:
`getEventAccess()`, `canViewDivision()`, `canEditDivision()`,
`canManageFinance()`, `canOperateEvent()` — SELALU reuse fungsi-fungsi
ini, jangan bikin logic akses baru yang duplikat.

## 5. Fitur yang sudah jadi (M0–M3 + tambahan)

- **Auth & onboarding**: login → wajib ganti password (akun baru) → baca
  & setujui tata tertib event → dashboard. Tata tertib versi-kan
  (`rulesVersion`), edit aturan minta semua panitia setuju ulang.
- **Event & divisi**: CRUD event, 5 divisi standar (Acara/Korlap/Humas/
  Logistik/Konsumsi) dengan template tugas awal, bisa custom.
- **Import panitia**: upload spreadsheet (xlsx/csv) / foto (AI vision) /
  manual → preview & edit → generate akun massal (username unik + password
  sementara + email kredensial). Tombol salin per baris (bukan cuma salin
  semua) — ditambah setelah user melaporkan kesulitan transkrip manual.
- **Workspace divisi** (`/divisions/[id]`): papan tugas Kanban
  **drag-and-drop** (fallback tombol panah tetap ada), checklist per tugas,
  Document Hub (kategori + pencarian + preview inline utk file & link
  Google Docs/Canva/Figma — 3 layanan itu punya endpoint embed resmi,
  lainnya tetap buka tab baru), rekap keaktifan anggota (warna
  hijau/kuning/merah dari activity log).
- **Workspace event** (`/events/[id]/workspace`, halaman utama/"Ringkasan"):
  dokumen administratif level-event (proposal dll, terpisah dari dokumen
  divisi), progress semua divisi, presensi, timeline, panel AI & Laporan.
- **Sidebar navigasi persisten** (`src/components/event-sidebar*.tsx`):
  desktop kolom statis, mobile drawer (Sheet) — dipasang di layout
  `events/[id]/layout.tsx` + manual di `divisions/[id]/page.tsx`.
- **Presensi anti-fraud**: QR dinamis sekali-pakai (ganti tiap 20 detik,
  `AttendanceToken`) ATAU mode "Scan ketat" (operator scan QR pribadi
  panitia di pintu) ATAU manual (selalu tercatat siapa yang menandai).
- **Keuangan**: RAB per pos per divisi → foto struk → AI OCR ekstrak item
  (WAJIB bisa diedit manual sebelum dikonfirmasi) → realisasi vs anggaran.
- **Laporan AI**: Rangkum Progress & Draft LPJ — **diperdalam** (13 Juli)
  supaya menyertakan Susunan Kepanitiaan lengkap + tabel RAB per-pos, bukan
  cuma 2 angka total. **Mode mock TIDAK mengarang teks kaleng** — dia
  menampilkan context data ASLI yang akan dikirim ke AI, supaya bisa
  diverifikasi sebelum keluar biaya API (ini perbaikan penting, baca
  commit `8cc4d82` untuk detail root-cause-nya).
- **Chat revisi laporan**: setelah draft awal dibuat, ada UI chat
  (preview kiri, ngobrol kanan) untuk minta AI merevisi bagian tertentu
  — bukan cuma generate-sekali-lalu-edit-manual.
- **Email otomatis**: reminder deadline H-1, rekap mingguan ke Ketua
  Pelaksana — Vercel Cron (`vercel.json`) + tombol manual "kirim sekarang".
- **Sistem desain visual (Fase 1 roadmap baru, SELESAI)**: warna=status
  konsisten (merah=telat, kuning=perlu perhatian, hijau=aman), donut chart
  ringan (`components/donut-chart.tsx`, SVG manual tanpa library),
  vonis satu-kalimat dihitung dari heuristik lokal (BUKAN panggilan AI —
  lihat `lib/event-verdict.ts`, alasannya: dipanggil tiap page-view, kalau
  pakai AI beneran jadi mahal & lambat), kartu "Perlu perhatian" (top 3
  tugas paling telat lintas divisi), avatar berwarna konsisten per-orang
  (`lib/avatar-color.ts`, hash nama → 1 dari 8 warna tetap), kartu tugas
  tidak pernah kosong (placeholder "Belum ada PIC"/"Belum ada tenggat"),
  hirarki tombol (1 aksi utama solid per panel, sisanya outline).

## 6. Roadmap yang sedang berjalan (6 fase, keputusan 14 Juli)

File plan lengkap (kalau masih ada & terbaca):
`C:\Users\user\.claude\plans\moonlit-tickling-pie.md` — tapi asumsikan
AI baru TIDAK bisa akses itu, makanya isi intinya diulang di sini:

**Fase 1 — Sistem desain visual** ✅ SELESAI (lihat bagian 5 di atas)

**Fase 2 — Papan pengumuman lintas-divisi** 🔵 BELUM DIMULAI (giliran
berikutnya persis saat handoff ini dibuat)
Menutup gap: divisi tidak tahu progress/keputusan divisi lain yang
mempengaruhi mereka (mis. Logistik butuh info jumlah peserta final dari
Humas). Skema baru:
```prisma
model Announcement {
  id          Int       @id @default(autoincrement())
  eventId     Int
  title       String    @db.VarChar(200)
  body        String    @db.Text
  deadline    DateTime? @db.Date
  createdById Int?
  createdAt   DateTime  @default(now())
  event       Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdBy   User?     @relation(fields: [createdById], references: [id], onDelete: SetNull)
  targets     AnnouncementTarget[] // kosong = untuk semua divisi
}
model AnnouncementTarget {
  id             Int      @id @default(autoincrement())
  announcementId Int
  divisionId     Int
  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  division       Division     @relation(fields: [divisionId], references: [id], onDelete: Cascade)
  @@unique([announcementId, divisionId])
}
```
Posting dibatasi `canOperateEvent()` (Pengurus/Ketua/Sekretaris/
Koordinator — reuse dari `lib/permissions.ts`). Tampil di Ringkasan event
+ workspace divisi yang ditarget (atau semua kalau tidak ditarget
spesifik). Ingat tambahkan relasi `announcements Announcement[]` ke model
`Event` dan `Division` di schema.

**Fase 3 — Komentar tugas + activity feed harian** 🔵 belum
- `TaskComment` (taskId, userId, body, createdAt) — thread di dialog
  detail tugas yang sudah ada (`divisions/[id]/task-board.tsx`).
- Feed "Hari ini": query `ActivityLog` 24 jam terakhir lintas semua
  divisi, render ringkas di Ringkasan event. Data sudah ada, tinggal
  query + render — model `ActivityLog` sudah lengkap.

**Fase 4 — Countdown urgensi H-7 → H-1** 🔵 belum
Komponen countdown di Ringkasan: hitung selisih hari ke `event.startDate`
atau milestone terdekat, warna makin intens mendekati hari-H (reuse
`lib/urgency.ts` 3-tingkat). Murni UI + tanggal, tidak ada skema baru.

**Fase 5 — Arsip kepengurusan lintas generasi** 🔵 belum
Tab "Arsip" di dashboard Pengurus (`src/app/(app)/dashboard/page.tsx`),
filter `status: DONE`, tetap bisa dibuka penuh (laporan/keuangan/dokumen)
tapi tombol edit disembunyikan. Tidak ada skema baru — event tidak pernah
dihapus, datanya sudah permanen, cuma belum ada UI untuk menjelajahinya.

**Fase 6 — Proposal, approval, generator surat** 🔵 belum (subsistem
terbesar, tadinya sengaja di-skip, sekarang dikerjakan atas permintaan
eksplisit user)
Approval **satu langkah** (Ketua Pelaksana ajukan → Pengurus setujui/
tolak) — SENGAJA tidak bikin hirarki baru (Ketua Umum/Wakil dst) karena
tidak ada datanya di sistem kita, cukup pakai role Pengurus vs Panitia
yang sudah ada.
```prisma
enum ProposalStatus { DRAFT SUBMITTED APPROVED REJECTED }
model Proposal {
  id            Int            @id @default(autoincrement())
  eventId       Int            @unique
  latarBelakang String?        @db.Text
  tujuan        String?        @db.Text
  sasaran       String?        @db.Text
  tema          String?        @db.VarChar(200)
  status        ProposalStatus @default(DRAFT)
  submittedAt   DateTime?
  reviewedById  Int?
  reviewNote    String?        @db.Text
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  event         Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)
  reviewedBy    User?          @relation(fields: [reviewedById], references: [id], onDelete: SetNull)
}
```
- Halaman `/events/[id]/proposal`: form isi → "Ajukan" → Pengurus lihat
  daftar proposal masuk (tab baru di dashboard Pengurus) → setujui/tolak
  + catatan.
- RAB (`RabItem`, sudah ada) dilampirkan sebagai referensi, bukan
  duplikasi data.
- **Generator surat**: 3 jenis (Surat Izin Tempat, Surat Tugas Panitia,
  Surat Undangan Pemateri), di-generate ON-DEMAND dari data event +
  susunan panitia yang sudah ada (mail-merge sederhana) → halaman HTML
  rapi + tombol "Cetak / Simpan PDF" pakai dialog print bawaan browser.
  **Sengaja TIDAK pakai library PDF server-side** (lebih rapuh, dependency
  baru) — print-to-PDF browser sudah cukup dan lebih reliable. Tidak
  perlu tabel baru untuk surat itu sendiri (generate on-the-fly).

**Urutan wajib**: 1→2→3→4→5→6. Tiap fase commit terpisah, verifikasi
end-to-end (tsc + browser/curl) sebelum lanjut fase berikutnya. Kalau ada
keputusan desain ambigu (terutama Fase 6), TANYA user dulu — jangan
asumsi sepihak (ini pesan eksplisit dari user).

## 7. Prinsip kerja yang sudah terbukti sepanjang proyek ini

1. **Tanya dulu kalau scope ambigu** — user (Raka & Dzaki) beberapa kali
   mengoreksi arah setelah aku jalan duluan tanpa nanya. Pola yang jalan:
   `EnterPlanMode` untuk perubahan besar/arsitektural, `AskUserQuestion`
   untuk pilihan konkret berdampak opsi jelas.
2. **Mock data harus mencerminkan data ASLI**, bukan teks kaleng statis —
   pelajaran mahal dari kasus AI report (commit `8cc4d82`). Kalau bikin
   mode mock baru untuk fitur AI apa pun, ikuti pola ini.
3. **Jangan hapus fitur demi tampilan** — user eksplisit: UI diperbaiki
   dengan reorganisasi bobot visual (warna, hirarki, ukuran), bukan
   menyembunyikan data.
4. **Selalu verifikasi end-to-end sebelum bilang selesai** — `tsc --noEmit`
   bersih itu belum cukup, harus dites jalan beneran (browser atau curl
   dengan sesi asli) dan cek database langsung, bukan asumsi dari kode.
5. **Commit per unit kerja yang selesai**, pesan jelas menjelaskan
   "kenapa" bukan cuma "apa". Jangan pernah pakai `--no-verify` atau
   commit kode yang belum diverifikasi.
6. Kalau nemu bug nyata saat verifikasi (bukan cuma kosmetik), perbaiki
   dan verifikasi ulang SEBELUM lanjut — jangan tunda. Ini terjadi 2x:
   bug pointerdown drag-kit menutup tombol panah, dan bug password
   sementara (ternyata bukan bug, tapi worth diinvestigasi tuntas).

## 8. File-file kunci untuk orientasi cepat

- `prisma/schema.prisma` — seluruh model data, baca ini duluan.
- `src/lib/permissions.ts` — semua logic hak akses, reuse jangan duplikat.
- `src/lib/ai.ts` — semua panggilan OpenAI, pola mock/real selalu di sini.
- `src/lib/auth.ts` + `src/proxy.ts` — sesi & proteksi route.
- `src/components/event-sidebar*.tsx` — navigasi persisten, dipakai di
  semua halaman event/divisi.
- `src/app/(app)/events/[id]/workspace/page.tsx` — halaman "Ringkasan",
  paling banyak berubah tiap fase baru (hub utama).
- `src/app/(app)/divisions/[id]/task-board.tsx` — papan tugas + drag-drop.

## 9. Yang perlu dari user (belum beres, bukan salah AI)

- Revoke + ganti API key OpenAI yang sempat bocor di chat.
- Siapkan akun Gmail sistem + App Password untuk `SMTP_USER`/`SMTP_PASS`.
- Kalau nanti mau deploy: database MySQL hosted (Railway/Aiven) + akun
  Vercel — belum dikerjakan sama sekali, masih di localhost.
