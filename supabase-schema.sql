-- =====================================================================
-- DLH SMART LAPOR — Skema Database Supabase
-- Jalankan seluruh isi file ini di: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- 1. TABEL ----------

-- Kategori permasalahan
create table if not exists public.kategori (
  id         bigint generated always as identity primary key,
  nama       text not null,
  deskripsi  text,
  aktif      boolean default true
);

-- Profil pengguna internal (petugas/admin/pimpinan), terhubung ke auth.users
create table if not exists public.profiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  nama     text,
  peran    text default 'petugas' check (peran in ('admin','petugas','pimpinan')),
  no_hp    text,
  aktif    boolean default true
);

-- Laporan utama
create table if not exists public.laporan (
  id             bigint generated always as identity primary key,
  no_tiket       text unique not null,
  kategori_id    bigint references public.kategori(id),
  deskripsi      text not null,
  foto_url       text,
  latitude       double precision,
  longitude      double precision,
  alamat         text,
  nama_pelapor   text,
  kontak_pelapor text,
  status         text default 'Baru' check (status in ('Baru','Diverifikasi','Diproses','Selesai','Ditolak')),
  petugas_id     uuid references auth.users(id),
  created_at     timestamptz default now()
);
create index if not exists idx_laporan_status on public.laporan(status);
create index if not exists idx_laporan_created on public.laporan(created_at desc);

-- Riwayat tindak lanjut / perubahan status
create table if not exists public.tindak_lanjut (
  id             bigint generated always as identity primary key,
  laporan_id     bigint references public.laporan(id) on delete cascade,
  status_baru    text not null,
  catatan        text,
  foto_bukti_url text,
  oleh           uuid references auth.users(id),
  oleh_nama      text,
  created_at     timestamptz default now()
);
create index if not exists idx_tindak_laporan on public.tindak_lanjut(laporan_id);

-- ---------- 2. DATA AWAL KATEGORI ----------
insert into public.kategori (nama) values
  ('Sampah Liar / Tumpukan Sampah'),
  ('TPS / Rumah Sampah Bermasalah'),
  ('Kebersihan Taman / RTH'),
  ('Saluran / Drainase Tersumbat'),
  ('Pencemaran (Air/Udara/Bau)'),
  ('Pohon Tumbang / Membahayakan'),
  ('Lainnya')
on conflict do nothing;

-- ---------- 3. ROW LEVEL SECURITY ----------
alter table public.kategori      enable row level security;
alter table public.laporan       enable row level security;
alter table public.tindak_lanjut enable row level security;
alter table public.profiles      enable row level security;

-- Fungsi bantu: cek peran pengguna login
create or replace function public.is_staff()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.peran = 'admin');
$$;

-- KATEGORI: semua boleh baca kategori aktif; hanya admin boleh ubah
drop policy if exists kategori_read on public.kategori;
create policy kategori_read on public.kategori for select using (true);
drop policy if exists kategori_write on public.kategori;
create policy kategori_write on public.kategori for all using (public.is_admin()) with check (public.is_admin());

-- LAPORAN: publik boleh membuat & membaca (untuk cek status); hanya staf boleh ubah
drop policy if exists laporan_insert on public.laporan;
create policy laporan_insert on public.laporan for insert with check (true);
drop policy if exists laporan_select on public.laporan;
create policy laporan_select on public.laporan for select using (true);
drop policy if exists laporan_update on public.laporan;
create policy laporan_update on public.laporan for update using (public.is_staff()) with check (public.is_staff());

-- TINDAK LANJUT: publik boleh baca (riwayat status); hanya staf boleh menambah
drop policy if exists tindak_select on public.tindak_lanjut;
create policy tindak_select on public.tindak_lanjut for select using (true);
drop policy if exists tindak_insert on public.tindak_lanjut;
create policy tindak_insert on public.tindak_lanjut for insert with check (public.is_staff());

-- PROFILES: pengguna boleh baca profilnya; admin kelola semua
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- ---------- 4. STORAGE (foto) ----------
-- Buat bucket 'foto' (publik) — jalankan ini, atau buat manual di menu Storage.
insert into storage.buckets (id, name, public) values ('foto','foto', true)
on conflict (id) do nothing;

-- Siapa saja boleh melihat foto; siapa saja boleh mengunggah (agar pelapor publik bisa lampirkan foto).
drop policy if exists foto_read on storage.objects;
create policy foto_read on storage.objects for select using (bucket_id = 'foto');
drop policy if exists foto_insert on storage.objects;
create policy foto_insert on storage.objects for insert with check (bucket_id = 'foto');

-- =====================================================================
-- 5. MEMBUAT AKUN PETUGAS/ADMIN
-- ---------------------------------------------------------------------
-- a) Buka Supabase > Authentication > Users > Add user (isi email & password).
-- b) Salin UUID user tersebut, lalu jalankan (ganti nilai sesuai kebutuhan):
--
--    insert into public.profiles (id, nama, peran) values
--      ('UUID-USER-DISINI', 'Admin DLH', 'admin');
--
--    Peran yang tersedia: 'admin', 'petugas', 'pimpinan'
-- =====================================================================
