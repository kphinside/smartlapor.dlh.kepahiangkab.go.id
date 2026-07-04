/* =====================================================================
   DLH SMART LAPOR — Konfigurasi
   ---------------------------------------------------------------------
   Cara pakai:
   1) MODE DEMO (default): biarkan SUPABASE_URL & SUPABASE_ANON_KEY kosong.
      Aplikasi langsung jalan memakai penyimpanan lokal (localStorage)
      dengan data contoh. Cocok untuk uji coba & presentasi.

   2) MODE PRODUKSI: isi SUPABASE_URL & SUPABASE_ANON_KEY dari proyek
      Supabase Anda (Settings > API). Aplikasi otomatis memakai database
      Supabase (data tersimpan permanen & online).
   ===================================================================== */

const CONFIG = {
  // --- Isi dua baris ini untuk MODE PRODUKSI (Supabase) ---
  SUPABASE_URL: "",        // contoh: "https://xxxxxxxx.supabase.co"
  SUPABASE_ANON_KEY: "",   // contoh: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."

  // --- Identitas aplikasi ---
  APP_NAME: "DLH Smart Lapor",
  APP_SUBTITLE: "Kanal Pelaporan Persampahan & Lingkungan Hidup",
  INSTANSI: "Dinas Lingkungan Hidup Kabupaten Kepahiang",

  // --- Peta default (Kabupaten Kepahiang, Bengkulu) ---
  MAP_CENTER: [-3.6489, 102.5636],
  MAP_ZOOM: 13,

  // --- Akun demo (hanya berlaku di MODE DEMO) ---
  DEMO_USERS: [
    { email: "admin@dlh.go.id",    password: "admin123",    nama: "Admin DLH",        peran: "admin" },
    { email: "petugas@dlh.go.id",  password: "petugas123",  nama: "Petugas Lapangan", peran: "petugas" },
    { email: "pimpinan@dlh.go.id", password: "pimpinan123", nama: "Kepala Dinas",     peran: "pimpinan" },
  ],
};

// Deteksi mode otomatis
CONFIG.IS_DEMO = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
