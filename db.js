/* =====================================================================
   DLH SMART LAPOR — Data Layer (db.js)
   Menyediakan API seragam untuk aplikasi. Otomatis memilih:
   - Supabase (MODE PRODUKSI) bila kredensial diisi di config.js
   - localStorage (MODE DEMO) bila kredensial kosong
   ===================================================================== */

const STATUS_LIST = ["Baru", "Diverifikasi", "Diproses", "Selesai", "Ditolak"];

const DEFAULT_KATEGORI = [
  { id: 1, nama: "Sampah Liar / Tumpukan Sampah", aktif: true },
  { id: 2, nama: "TPS / Rumah Sampah Bermasalah", aktif: true },
  { id: 3, nama: "Kebersihan Taman / RTH", aktif: true },
  { id: 4, nama: "Saluran / Drainase Tersumbat", aktif: true },
  { id: 5, nama: "Pencemaran (Air/Udara/Bau)", aktif: true },
  { id: 6, nama: "Pohon Tumbang / Membahayakan", aktif: true },
  { id: 7, nama: "Lainnya", aktif: true },
];

/* ---------- util ---------- */
function genTiket() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return `LAPOR-${ymd}-${rnd}`;
}
function nowISO() { return new Date().toISOString(); }

/* =====================================================================
   DEMO DRIVER (localStorage)
   ===================================================================== */
const DemoDB = {
  KEY: "smartlapor_demo_v1",
  _load() {
    let s = localStorage.getItem(this.KEY);
    if (!s) { this._seed(); s = localStorage.getItem(this.KEY); }
    return JSON.parse(s);
  },
  _save(state) { localStorage.setItem(this.KEY, JSON.stringify(state)); },
  reset() { localStorage.removeItem(this.KEY); this._seed(); },
  _seed() {
    const c = CONFIG.MAP_CENTER;
    const jitter = () => (Math.random() - 0.5) * 0.05;
    const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
    const laporan = [
      { kategori_id: 1, deskripsi: "Tumpukan sampah liar di pinggir Jalan Merdeka dekat pasar.", status: "Selesai",     nama_pelapor: "Warga", d: 12, done: 9 },
      { kategori_id: 3, deskripsi: "Rumput Taman Santoso tinggi dan banyak sampah plastik.",       status: "Diproses",   nama_pelapor: "Komunitas Hijau", d: 6, done: null },
      { kategori_id: 4, deskripsi: "Drainase tersumbat menyebabkan genangan di Kelurahan Pasar.",  status: "Diverifikasi", nama_pelapor: "Budi", d: 3, done: null },
      { kategori_id: 2, deskripsi: "TPS lama masih menumpuk sampah, menimbulkan bau.",             status: "Baru",       nama_pelapor: "Anonim", d: 1, done: null },
      { kategori_id: 5, deskripsi: "Bau menyengat dari saluran pembuangan pabrik tahu.",           status: "Selesai",     nama_pelapor: "Siti", d: 20, done: 15 },
      { kategori_id: 1, deskripsi: "Sampah berserakan di area car free day.",                      status: "Selesai",     nama_pelapor: "Warga", d: 8, done: 7 },
      { kategori_id: 6, deskripsi: "Pohon besar miring membahayakan pengguna jalan.",              status: "Diproses",   nama_pelapor: "Rian", d: 2, done: null },
    ].map((r, i) => ({
      id: i + 1,
      no_tiket: `LAPOR-DEMO-${1000 + i}`,
      kategori_id: r.kategori_id,
      deskripsi: r.deskripsi,
      foto_url: "",
      latitude: c[0] + jitter(),
      longitude: c[1] + jitter(),
      alamat: "Kabupaten Kepahiang",
      nama_pelapor: r.nama_pelapor,
      kontak_pelapor: "",
      status: r.status,
      created_at: daysAgo(r.d),
      _done: r.done,
    }));
    const tindak = [];
    let tid = 1;
    laporan.forEach((lp) => {
      const order = ["Diverifikasi", "Diproses", "Selesai"];
      const idx = STATUS_LIST.indexOf(lp.status);
      if (lp.status === "Ditolak") return;
      order.forEach((st) => {
        if (STATUS_LIST.indexOf(st) <= idx) {
          const dOff = st === "Selesai" && lp._done != null ? lp._done : null;
          tindak.push({
            id: tid++, laporan_id: lp.id, status_baru: st,
            catatan: st === "Selesai" ? "Penanganan selesai, lokasi sudah bersih." : "Ditindaklanjuti petugas.",
            foto_bukti_url: "",
            oleh: "Petugas Lapangan",
            created_at: dOff != null ? new Date(Date.now() - dOff * 86400000).toISOString() : lp.created_at,
          });
        }
      });
      delete lp._done;
    });
    this._save({ kategori: JSON.parse(JSON.stringify(DEFAULT_KATEGORI)), laporan, tindak_lanjut: tindak, seq: laporan.length + 1, tseq: tid });
  },

  async getKategori(all = false) {
    const s = this._load();
    return all ? s.kategori : s.kategori.filter((k) => k.aktif);
  },
  async addKategori(nama) {
    const s = this._load();
    const id = Math.max(0, ...s.kategori.map((k) => k.id)) + 1;
    s.kategori.push({ id, nama, aktif: true }); this._save(s); return { id };
  },
  async toggleKategori(id) {
    const s = this._load();
    const k = s.kategori.find((x) => x.id === id); if (k) k.aktif = !k.aktif; this._save(s);
  },
  async createLaporan(data) {
    const s = this._load();
    const rec = {
      id: s.seq++, no_tiket: genTiket(), kategori_id: Number(data.kategori_id),
      deskripsi: data.deskripsi, foto_url: data.foto_url || "",
      latitude: data.latitude, longitude: data.longitude, alamat: data.alamat || "",
      nama_pelapor: data.nama_pelapor || "Anonim", kontak_pelapor: data.kontak_pelapor || "",
      status: "Baru", created_at: nowISO(),
    };
    s.laporan.push(rec); this._save(s); return rec;
  },
  async getByTiket(tiket) {
    const s = this._load();
    const lp = s.laporan.find((x) => x.no_tiket.toLowerCase() === tiket.toLowerCase());
    if (!lp) return null;
    lp._tindak = s.tindak_lanjut.filter((t) => t.laporan_id === lp.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return lp;
  },
  async getAll(filters = {}) {
    const s = this._load();
    let r = s.laporan.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (filters.status) r = r.filter((x) => x.status === filters.status);
    if (filters.kategori_id) r = r.filter((x) => x.kategori_id === Number(filters.kategori_id));
    if (filters.q) { const q = filters.q.toLowerCase(); r = r.filter((x) => x.deskripsi.toLowerCase().includes(q) || x.no_tiket.toLowerCase().includes(q)); }
    return r;
  },
  async getTindak(laporanId) {
    const s = this._load();
    return s.tindak_lanjut.filter((t) => t.laporan_id === laporanId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },
  async updateStatus(laporanId, statusBaru, catatan, fotoUrl, userNama) {
    const s = this._load();
    const lp = s.laporan.find((x) => x.id === laporanId); if (!lp) return;
    lp.status = statusBaru;
    s.tindak_lanjut.push({ id: s.tseq++, laporan_id: laporanId, status_baru: statusBaru, catatan: catatan || "", foto_bukti_url: fotoUrl || "", oleh: userNama || "Petugas", created_at: nowISO() });
    this._save(s);
  },
  async getStats() { return computeStats(await this.getAll(), await this.getKategori(true)); },
  async login(email, password) {
    const u = CONFIG.DEMO_USERS.find((x) => x.email === email && x.password === password);
    if (!u) throw new Error("Email atau kata sandi salah.");
    const sess = { email: u.email, nama: u.nama, peran: u.peran };
    localStorage.setItem("smartlapor_session", JSON.stringify(sess)); return sess;
  },
  async logout() { localStorage.removeItem("smartlapor_session"); },
  getUser() { const s = localStorage.getItem("smartlapor_session"); return s ? JSON.parse(s) : null; },
  async uploadFoto(file) { return await fileToDataURL(file); }, // demo: simpan sebagai data URL
};

/* =====================================================================
   SUPABASE DRIVER
   ===================================================================== */
const SupaDB = {
  sb: null,
  _client() { if (!this.sb) this.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY); return this.sb; },
  async getKategori(all = false) {
    let q = this._client().from("kategori").select("*").order("id");
    if (!all) q = q.eq("aktif", true);
    const { data, error } = await q; if (error) throw error; return data;
  },
  async addKategori(nama) {
    const { data, error } = await this._client().from("kategori").insert({ nama, aktif: true }).select().single();
    if (error) throw error; return data;
  },
  async toggleKategori(id) {
    const { data: cur } = await this._client().from("kategori").select("aktif").eq("id", id).single();
    const { error } = await this._client().from("kategori").update({ aktif: !cur.aktif }).eq("id", id);
    if (error) throw error;
  },
  async createLaporan(data) {
    const rec = {
      no_tiket: genTiket(), kategori_id: Number(data.kategori_id), deskripsi: data.deskripsi,
      foto_url: data.foto_url || null, latitude: data.latitude, longitude: data.longitude,
      alamat: data.alamat || null, nama_pelapor: data.nama_pelapor || "Anonim",
      kontak_pelapor: data.kontak_pelapor || null, status: "Baru",
    };
    const { data: row, error } = await this._client().from("laporan").insert(rec).select().single();
    if (error) throw error; return row;
  },
  async getByTiket(tiket) {
    const { data, error } = await this._client().from("laporan").select("*").ilike("no_tiket", tiket).maybeSingle();
    if (error) throw error; if (!data) return null;
    data._tindak = await this.getTindak(data.id); return data;
  },
  async getAll(filters = {}) {
    let q = this._client().from("laporan").select("*").order("created_at", { ascending: false });
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.kategori_id) q = q.eq("kategori_id", Number(filters.kategori_id));
    const { data, error } = await q; if (error) throw error;
    let r = data;
    if (filters.q) { const s = filters.q.toLowerCase(); r = r.filter((x) => (x.deskripsi || "").toLowerCase().includes(s) || (x.no_tiket || "").toLowerCase().includes(s)); }
    return r;
  },
  async getTindak(laporanId) {
    const { data, error } = await this._client().from("tindak_lanjut").select("*").eq("laporan_id", laporanId).order("created_at");
    if (error) throw error; return data;
  },
  async updateStatus(laporanId, statusBaru, catatan, fotoUrl, userNama) {
    const c = this._client();
    const { error: e1 } = await c.from("laporan").update({ status: statusBaru }).eq("id", laporanId);
    if (e1) throw e1;
    const { error: e2 } = await c.from("tindak_lanjut").insert({ laporan_id: laporanId, status_baru: statusBaru, catatan: catatan || null, foto_bukti_url: fotoUrl || null, oleh_nama: userNama || "Petugas" });
    if (e2) throw e2;
  },
  async getStats() { return computeStats(await this.getAll(), await this.getKategori(true)); },
  async login(email, password) {
    const { data, error } = await this._client().auth.signInWithPassword({ email, password });
    if (error) throw new Error("Email atau kata sandi salah.");
    let nama = email, peran = "petugas";
    const { data: prof } = await this._client().from("profiles").select("nama,peran").eq("id", data.user.id).maybeSingle();
    if (prof) { nama = prof.nama || nama; peran = prof.peran || peran; }
    const sess = { email, nama, peran };
    localStorage.setItem("smartlapor_session", JSON.stringify(sess)); return sess;
  },
  async logout() { await this._client().auth.signOut(); localStorage.removeItem("smartlapor_session"); },
  getUser() { const s = localStorage.getItem("smartlapor_session"); return s ? JSON.parse(s) : null; },
  async uploadFoto(file) {
    const c = this._client();
    const path = `laporan/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error } = await c.storage.from("foto").upload(path, file, { upsert: false });
    if (error) throw error;
    return c.storage.from("foto").getPublicUrl(path).data.publicUrl;
  },
};

/* ---------- statistik bersama ---------- */
function computeStats(laporan, kategori) {
  const total = laporan.length;
  const by = (st) => laporan.filter((x) => x.status === st).length;
  const katMap = {}; kategori.forEach((k) => (katMap[k.id] = k.nama));
  const perKat = {}; kategori.forEach((k) => (perKat[k.nama] = 0));
  laporan.forEach((x) => { const n = katMap[x.kategori_id] || "Lainnya"; perKat[n] = (perKat[n] || 0) + 1; });

  // tren 6 bulan terakhir
  const months = []; const now = new Date();
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("id-ID", { month: "short" }), n: 0 }); }
  laporan.forEach((x) => { const d = new Date(x.created_at); const k = `${d.getFullYear()}-${d.getMonth()}`; const m = months.find((mm) => mm.key === k); if (m) m.n++; });

  // rata-rata waktu penyelesaian (hari) — pakai selisih created_at ke selesai
  const done = laporan.filter((x) => x.status === "Selesai");
  let avgDays = null;
  if (done.length) {
    // perkiraan sederhana pada level dashboard (detail per tiket via tindak_lanjut)
    avgDays = null;
  }
  return {
    total, baru: by("Baru"), diverifikasi: by("Diverifikasi"), diproses: by("Diproses"),
    selesai: by("Selesai"), ditolak: by("Ditolak"),
    perKategori: perKat, tren: months,
  };
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
  });
}

/* ---------- pemilihan driver ---------- */
const DB = CONFIG.IS_DEMO ? DemoDB : SupaDB;
