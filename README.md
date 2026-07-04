# DLH Smart Lapor 🌿

Aplikasi pelaporan & monitoring persampahan dan lingkungan hidup **Dinas Lingkungan Hidup Kabupaten Kepahiang**.

Warga melapor (foto + lokasi GPS otomatis) → petugas menindaklanjuti → pimpinan memantau lewat dashboard. Ringan, mobile-friendly, dan berbiaya rendah (GitHub Pages + Supabase).

---

## Isi Paket

| File | Fungsi |
|------|--------|
| `index.html` | Tampilan & struktur aplikasi |
| `app.js` | Logika aplikasi (form, cek status, dashboard, admin) |
| `db.js` | Lapisan data — otomatis pilih Supabase / mode demo |
| `config.js` | **Konfigurasi** (isi kredensial Supabase di sini) |
| `supabase-schema.sql` | Skema database untuk dijalankan di Supabase |
| `logo.png` / `logo_small.png` | Logo di header & favicon (lihat catatan di bawah) |
| `qr.html` | Generator QR + poster sosialisasi siap cetak |
| `Poster_Sosialisasi_SmartLapor.png` | Poster jadi (contoh URL) siap cetak |
| `QR_SmartLapor.png` | Gambar QR polos |
| `README.md` | Panduan ini |

---

## A. Coba Cepat (Mode Demo — tanpa setup)

Aplikasi sudah bisa langsung dicoba **tanpa Supabase**. Data disimpan sementara di browser.

1. Buka `index.html` (klik dua kali, atau via Live Server).
2. Coba semua fitur: buat laporan, cek status, dashboard, dan login admin.

**Akun demo:**
- Admin — `admin@dlh.go.id` / `admin123`
- Petugas — `petugas@dlh.go.id` / `petugas123`
- Pimpinan — `pimpinan@dlh.go.id` / `pimpinan123`

> Catatan: mode demo memakai penyimpanan lokal browser. Data belum permanen/online — itu tugas Supabase di bawah.

---

## B. Menghubungkan ke Supabase (Mode Produksi)

1. Buat akun di **https://supabase.com** → **New project** (catat *database password*).
2. Buka menu **SQL Editor** → **New query** → tempel seluruh isi `supabase-schema.sql` → **Run**.
   (Ini membuat tabel, keamanan RLS, bucket foto, dan kategori awal.)
3. Buka **Project Settings → API**, salin:
   - **Project URL**
   - **anon public key**
4. Buka `config.js`, isi:
   ```js
   SUPABASE_URL: "https://xxxxxxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi....",
   ```
5. Buat akun petugas: **Authentication → Users → Add user** (email + password),
   lalu di **SQL Editor** jalankan (ganti UUID sesuai user):
   ```sql
   insert into public.profiles (id, nama, peran)
   values ('UUID-USER', 'Admin DLH', 'admin');
   ```
   Peran: `admin`, `petugas`, atau `pimpinan`.
6. Muat ulang aplikasi — badge di kanan atas berubah menjadi **TERHUBUNG SUPABASE**.

---

## C. Deploy ke GitHub Pages (gratis)

1. Buat akun **https://github.com** → **New repository** (mis. `smart-lapor`), set **Public**.
2. Upload semua file (`index.html`, `app.js`, `db.js`, `config.js`, dll) — tombol **Add file → Upload files → Commit**.
3. Buka **Settings → Pages** → *Source:* **Deploy from a branch** → *Branch:* `main` / `/root` → **Save**.
4. Tunggu 1–2 menit. Situs tayang di:
   `https://<username>.github.io/smart-lapor/`

> Karena `config.js` memakai **anon key** (kunci publik yang memang aman diekspos) dan
> data dilindungi oleh **RLS** di Supabase, aman untuk repository publik.
> Jangan pernah menaruh *service_role key* di sini.

---

## D. Sub-domain Resmi (via Kominfo)

Setelah aplikasi berjalan & clear, ajukan sub-domain resmi ke Dinas Kominfo, misalnya:

```
smartlapor.dlh.kepahiangkab.go.id
```

Kominfo mengarahkan sub-domain tersebut ke GitHub Pages melalui **CNAME record** ke
`<username>.github.io`. Tambahkan pula sub-domain itu pada **Settings → Pages → Custom domain**.

---

## Fitur

**Untuk Masyarakat**
- Formulir laporan: kategori, deskripsi, **foto**, dan **lokasi GPS otomatis** + peta interaktif
- Nomor tiket unik & **cek status** berikut riwayat penanganan (timeline)

**Untuk Petugas / Admin**
- Login berjenjang (admin / petugas / pimpinan)
- Daftar laporan dengan **filter** (status, kategori, kata kunci)
- **Perbarui status** + catatan + foto bukti; tautan navigasi Google Maps
- **Kelola kategori** (admin) & **ekspor CSV**

**Dashboard Monitoring**
- Kartu ringkasan (total, baru, diproses, selesai, rata-rata waktu penyelesaian)
- Grafik per kategori & tren bulanan
- **Peta sebaran** laporan berwarna sesuai status

---

## E. Logo & QR Sosialisasi

**Logo.** Header memakai `logo.png` (badge daun sementara). Untuk memakai **lambang resmi
Kabupaten Kepahiang**, cukup ganti file `logo.png` (disarankan persegi, latar transparan)
tanpa mengubah kode apa pun.

**QR & Poster.** Buka `qr.html`, masukkan **alamat final aplikasi** (URL GitHub Pages atau
sub-domain Kominfo), lalu:
- **Unduh QR (PNG)** untuk ditempel di dokumen/spanduk, atau
- **Cetak / Simpan Poster PDF** (poster A4 lengkap, siap tempel di kantor kelurahan, taman, pasar).

> File `Poster_Sosialisasi_SmartLapor.png` & `QR_SmartLapor.png` yang disertakan masih memakai
> URL contoh `smartlapor.dlh.kepahiangkab.go.id`. **Perbarui lewat `qr.html`** setelah alamat final aktif.

---

## Teknologi
HTML/CSS/JS · Leaflet + OpenStreetMap (peta) · Chart.js (grafik) · Supabase (database, auth, storage) · GitHub Pages (hosting).

*Dikembangkan untuk mendukung Revitalisasi Taman Santoso & pengelolaan sampah mandiri Kabupaten Kepahiang.*
