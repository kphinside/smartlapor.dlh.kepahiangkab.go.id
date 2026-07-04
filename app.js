/* =====================================================================
   DLH SMART LAPOR — Logika Aplikasi (app.js)
   ===================================================================== */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const state = { kategori: [], lapMap: null, lapMarker: null, dashMap: null, charts: {}, fotoUrl: "" };

/* ---------- util UI ---------- */
function toast(msg, type = "") {
  const t = $("#toast"); t.textContent = msg; t.className = "show " + type;
  clearTimeout(t._h); t._h = setTimeout(() => (t.className = ""), 3200);
}
function openModal(title, html) { $("#modalTitle").textContent = title; $("#modalBody").innerHTML = html; $("#modalBg").classList.add("open"); }
function closeModal() { $("#modalBg").classList.remove("open"); }
function fmtDate(iso) { return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function fmtDay(iso) { return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
function esc(s) { return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function chip(st) { return `<span class="chip s-${st}">${st}</span>`; }
function katNama(id) { const k = state.kategori.find((x) => x.id === id); return k ? k.nama : "Lainnya"; }

/* ---------- routing ---------- */
function showView(name) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
  $$(".view").forEach((v) => v.classList.remove("active"));
  $("#view-" + name).classList.add("active");
  if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  if (name === "lapor") setTimeout(initLapMap, 60);
  if (name === "dashboard") loadDashboard();
  if (name === "admin") { state.user ? loadAdmin() : null; }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // mode badge
  $("#modeBadge").textContent = CONFIG.IS_DEMO ? "MODE DEMO" : "TERHUBUNG SUPABASE";
  if (!CONFIG.IS_DEMO) $("#demoAccts").style.display = "none";

  // nav
  $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
  $("#modalX").addEventListener("click", closeModal);
  $("#modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg") closeModal(); });

  // load kategori
  let katErr = null;
  try { state.kategori = await DB.getKategori(true); } catch (e) { console.error(e); katErr = e; }
  fillKategoriSelect();
  if (!CONFIG.IS_DEMO && (katErr || state.kategori.length === 0)) {
    $("#f_kategori").innerHTML = '<option value="">⚠️ Database belum siap — jalankan supabase-schema.sql</option>';
    setTimeout(() => toast("Database Supabase belum siap. Jalankan file supabase-schema.sql di SQL Editor dulu.", "err"), 600);
  }

  // restore session
  state.user = DB.getUser();
  refreshUserChip();

  // wire features
  wireLapor();
  wireCek();
  wireAdmin();

  // initial route
  const h = (location.hash || "#lapor").slice(1);
  showView(["lapor", "cek", "dashboard", "admin"].includes(h) ? h : "lapor");
});

/* ===================================================================
   KATEGORI
   =================================================================== */
function fillKategoriSelect() {
  const aktif = state.kategori.filter((k) => k.aktif);
  $("#f_kategori").innerHTML = '<option value="">— Pilih jenis —</option>' + aktif.map((k) => `<option value="${k.id}">${esc(k.nama)}</option>`).join("");
  $("#fltKat").innerHTML = '<option value="">Semua Kategori</option>' + aktif.map((k) => `<option value="${k.id}">${esc(k.nama)}</option>`).join("");
  $("#fltStatus").innerHTML = '<option value="">Semua Status</option>' + STATUS_LIST.map((s) => `<option value="${s}">${s}</option>`).join("");
}

/* ===================================================================
   LAPOR
   =================================================================== */
function initLapMap() {
  if (state.lapMap) { state.lapMap.invalidateSize(); return; }
  const m = L.map("lapMap").setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(m);
  const mk = L.marker(CONFIG.MAP_CENTER, { draggable: true }).addTo(m);
  mk.on("dragend", () => setLoc(mk.getLatLng().lat, mk.getLatLng().lng, "Pin digeser manual"));
  m.on("click", (e) => { mk.setLatLng(e.latlng); setLoc(e.latlng.lat, e.latlng.lng, "Titik dipilih pada peta"); });
  state.lapMap = m; state.lapMarker = mk;
  state.loc = { lat: CONFIG.MAP_CENTER[0], lng: CONFIG.MAP_CENTER[1] };
  setTimeout(() => m.invalidateSize(), 120);
}
function setLoc(lat, lng, note) {
  state.loc = { lat, lng };
  $("#locStatus").innerHTML = `<span class="pill">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</span> ${note || ""}`;
}
function wireLapor() {
  $("#filebox").addEventListener("click", () => $("#f_foto").click());
  $("#f_foto").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 6 * 1024 * 1024) { toast("Ukuran foto terlalu besar (maks ~5MB).", "err"); e.target.value = ""; return; }
    const url = await fileToDataURL(f);
    $("#preview").src = url; $("#preview").style.display = "block";
    state._fotoFile = f; state._fotoPreview = url;
  });
  $("#btnGPS").addEventListener("click", () => {
    if (!navigator.geolocation) { toast("Perangkat tidak mendukung GPS.", "err"); return; }
    $("#locStatus").textContent = "Mendeteksi lokasi...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        initLapMap();
        state.lapMap.setView([latitude, longitude], 16);
        state.lapMarker.setLatLng([latitude, longitude]);
        setLoc(latitude, longitude, "Lokasi GPS Anda");
      },
      () => { $("#locStatus").textContent = "Gagal mendapatkan GPS. Silakan geser pin manual."; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
  $("#formLapor").addEventListener("submit", async (e) => {
    e.preventDefault();
    const kategori_id = $("#f_kategori").value;
    const deskripsi = $("#f_deskripsi").value.trim();
    if (!kategori_id) return toast("Pilih jenis permasalahan.", "err");
    if (deskripsi.length < 8) return toast("Deskripsi terlalu singkat.", "err");
    if (!state.loc) return toast("Tandai lokasi kejadian pada peta.", "err");
    const btn = $("#btnKirim"); btn.disabled = true; btn.textContent = "Mengirim...";
    try {
      let foto_url = "";
      if (state._fotoFile) foto_url = await DB.uploadFoto(state._fotoFile);
      const rec = await DB.createLaporan({
        kategori_id, deskripsi, foto_url,
        latitude: state.loc.lat, longitude: state.loc.lng, alamat: "Kabupaten Kepahiang",
        nama_pelapor: $("#f_nama").value.trim(), kontak_pelapor: $("#f_kontak").value.trim(),
      });
      showTicket(rec.no_tiket);
      $("#formLapor").reset(); $("#preview").style.display = "none"; state._fotoFile = null;
    } catch (err) { console.error(err); toast("Gagal mengirim: " + err.message, "err"); }
    finally { btn.disabled = false; btn.textContent = "Kirim Laporan"; }
  });
}
function showTicket(tiket) {
  openModal("✅ Laporan Terkirim", `
    <p>Terima kasih. Laporan Anda telah kami terima dan akan segera ditindaklanjuti.</p>
    <div class="ticket-box"><div class="hint">Nomor Tiket Anda</div><div class="num">${tiket}</div></div>
    <p class="hint" style="margin-top:12px">Simpan nomor ini untuk memantau perkembangan di menu <b>Cek Status</b>.</p>
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="navigator.clipboard&&navigator.clipboard.writeText('${tiket}');document.getElementById('modalBg').classList.remove('open');document.querySelector('[data-view=cek]').click();document.getElementById('cekTiket').value='${tiket}';document.getElementById('btnCek').click();">Lihat Status Laporan</button>
  `);
}

/* ===================================================================
   CEK STATUS
   =================================================================== */
function wireCek() {
  $("#btnCek").addEventListener("click", doCek);
  $("#cekTiket").addEventListener("keydown", (e) => { if (e.key === "Enter") doCek(); });
}
async function doCek() {
  const tiket = $("#cekTiket").value.trim();
  if (!tiket) return toast("Masukkan nomor tiket.", "err");
  $("#cekResult").innerHTML = '<div class="empty">Mencari...</div>';
  try {
    const lp = await DB.getByTiket(tiket);
    if (!lp) { $("#cekResult").innerHTML = '<div class="empty">Tiket tidak ditemukan. Periksa kembali nomor Anda.</div>'; return; }
    const tl = lp._tindak || await DB.getTindak(lp.id);
    $("#cekResult").innerHTML = `
      <div class="card" style="margin-top:16px;background:#fafbfb">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <span class="mono">${esc(lp.no_tiket)}</span> ${chip(lp.status)}
        </div>
        <p style="margin:10px 0 4px"><b>${esc(katNama(lp.kategori_id))}</b></p>
        <p>${esc(lp.deskripsi)}</p>
        ${lp.foto_url ? `<img src="${lp.foto_url}" style="max-height:200px;border-radius:10px;margin-top:10px"/>` : ""}
        <p class="hint" style="margin-top:10px">📅 Dilaporkan ${fmtDate(lp.created_at)} · 📍 ${(+lp.latitude).toFixed(4)}, ${(+lp.longitude).toFixed(4)}</p>
        <h2 style="font-size:14px;margin-top:16px">Riwayat Penanganan</h2>
        <div class="timeline">
          <div class="tl-item"><div><b>Laporan diterima</b></div><div class="t">${fmtDate(lp.created_at)}</div></div>
          ${tl.map((t) => `<div class="tl-item"><div>${chip(t.status_baru)} ${esc(t.catatan || "")}</div>${t.foto_bukti_url ? `<img src="${t.foto_bukti_url}" style="max-height:120px;border-radius:8px;margin-top:6px"/>` : ""}<div class="t">oleh ${esc(t.oleh || t.oleh_nama || "Petugas")} · ${fmtDate(t.created_at)}</div></div>`).join("")}
        </div>
      </div>`;
  } catch (err) { console.error(err); $("#cekResult").innerHTML = '<div class="empty">Terjadi kesalahan: ' + esc(err.message) + "</div>"; }
}

/* ===================================================================
   DASHBOARD
   =================================================================== */
async function loadDashboard() {
  try {
    const all = await DB.getAll();
    const st = await DB.getStats();
    renderStatCards(st);
    renderCharts(st);
    renderDashMap(all);
    renderDashTable(all.slice(0, 8));
    computeAvg(all);
  } catch (err) { console.error(err); toast("Gagal memuat dashboard.", "err"); }
}
function renderStatCards(s) {
  const cards = [
    { n: s.total, l: "Total Laporan", c: "var(--navy)" },
    { n: s.baru + s.diverifikasi, l: "Baru / Menunggu", c: "var(--baru)" },
    { n: s.diproses, l: "Sedang Diproses", c: "var(--proses)" },
    { n: s.selesai, l: "Selesai", c: "var(--selesai)" },
    { n: "—", l: "Rata-rata Selesai (hari)", c: "var(--teal)", id: "avgDays" },
  ];
  $("#statCards").innerHTML = cards.map((c) => `<div class="stat"><div class="bar" style="background:${c.c}"></div><div class="n" ${c.id ? `id="${c.id}"` : ""}>${c.n}</div><div class="l">${c.l}</div></div>`).join("");
}
async function computeAvg(all) {
  const done = all.filter((x) => x.status === "Selesai");
  if (!done.length) { const el = $("#avgDays"); if (el) el.textContent = "0"; return; }
  let sum = 0, cnt = 0;
  for (const lp of done) {
    const tl = await DB.getTindak(lp.id);
    const fin = tl.filter((t) => t.status_baru === "Selesai").pop();
    if (fin) { sum += (new Date(fin.created_at) - new Date(lp.created_at)) / 86400000; cnt++; }
  }
  const el = $("#avgDays"); if (el) el.textContent = cnt ? (sum / cnt).toFixed(1) : "0";
}
function renderCharts(s) {
  const kk = Object.keys(s.perKategori), kv = Object.values(s.perKategori);
  const palette = ["#1F7A6D", "#2E75B6", "#d97706", "#16a34a", "#7c3aed", "#dc2626", "#0891b2", "#65a30d"];
  if (state.charts.kat) state.charts.kat.destroy();
  state.charts.kat = new Chart($("#chartKat"), {
    type: "doughnut",
    data: { labels: kk, datasets: [{ data: kv, backgroundColor: palette, borderWidth: 2, borderColor: "#fff" }] },
    options: { plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } } }, cutout: "58%" },
  });
  if (state.charts.tren) state.charts.tren.destroy();
  state.charts.tren = new Chart($("#chartTren"), {
    type: "bar",
    data: { labels: s.tren.map((t) => t.label), datasets: [{ label: "Jumlah Laporan", data: s.tren.map((t) => t.n), backgroundColor: "#1F7A6D", borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}
function renderDashMap(all) {
  if (!state.dashMap) {
    state.dashMap = L.map("dashMap").setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(state.dashMap);
    state._dashLayer = L.layerGroup().addTo(state.dashMap);
  }
  state._dashLayer.clearLayers();
  const colors = { Baru: "#2563eb", Diverifikasi: "#7c3aed", Diproses: "#d97706", Selesai: "#16a34a", Ditolak: "#dc2626" };
  all.forEach((lp) => {
    if (lp.latitude == null) return;
    L.circleMarker([lp.latitude, lp.longitude], { radius: 8, color: "#fff", weight: 2, fillColor: colors[lp.status] || "#666", fillOpacity: 0.9 })
      .bindPopup(`<b>${esc(katNama(lp.kategori_id))}</b><br>${esc(lp.deskripsi.slice(0, 80))}<br><small>${lp.status} · ${esc(lp.no_tiket)}</small>`)
      .addTo(state._dashLayer);
  });
  setTimeout(() => state.dashMap.invalidateSize(), 120);
}
function renderDashTable(rows) {
  $("#dashTable").innerHTML = `
    <thead><tr><th>Tiket</th><th>Kategori</th><th>Tanggal</th><th>Status</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td class="mono">${esc(r.no_tiket)}</td><td>${esc(katNama(r.kategori_id))}</td><td>${fmtDay(r.created_at)}</td><td>${chip(r.status)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Belum ada laporan.</td></tr>`}</tbody>`;
}

/* ===================================================================
   ADMIN
   =================================================================== */
function refreshUserChip() {
  const chipEl = $("#userChip");
  if (state.user) { chipEl.style.display = "inline-block"; chipEl.textContent = `👤 ${state.user.nama}`; chipEl.onclick = () => showView("admin"); }
  else chipEl.style.display = "none";
}
function wireAdmin() {
  $("#formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      state.user = await DB.login($("#l_email").value.trim(), $("#l_pass").value);
      refreshUserChip(); toast("Selamat datang, " + state.user.nama, "ok"); loadAdmin();
    } catch (err) { toast(err.message, "err"); }
  });
  $("#btnLogout").addEventListener("click", async () => { await DB.logout(); state.user = null; refreshUserChip(); $("#loginBox").style.display = "block"; $("#adminPanel").style.display = "none"; });
  $("#fltQ").addEventListener("input", debounce(renderAdminTable, 250));
  $("#fltStatus").addEventListener("change", renderAdminTable);
  $("#fltKat").addEventListener("change", renderAdminTable);
  $("#btnExport").addEventListener("click", exportCSV);
  $("#btnKategori").addEventListener("click", manageKategori);
}
function loadAdmin() {
  if (!state.user) { $("#loginBox").style.display = "block"; $("#adminPanel").style.display = "none"; return; }
  $("#loginBox").style.display = "none"; $("#adminPanel").style.display = "block";
  $("#adminHello").textContent = "Halo, " + state.user.nama;
  const roleLabel = { admin: "Administrator — akses penuh", petugas: "Petugas Lapangan — tindak lanjut", pimpinan: "Pimpinan — pemantauan" };
  $("#adminRole").textContent = roleLabel[state.user.peran] || state.user.peran;
  const isPimpinan = state.user.peran === "pimpinan";
  $("#btnKategori").style.display = state.user.peran === "admin" ? "inline-flex" : "none";
  state._readonly = isPimpinan;
  renderAdminTable();
}
async function renderAdminTable() {
  const filters = { q: $("#fltQ").value.trim(), status: $("#fltStatus").value, kategori_id: $("#fltKat").value };
  const rows = await DB.getAll(filters);
  const actionable = !state._readonly;
  $("#adminTable").innerHTML = `
    <thead><tr><th>Tiket</th><th>Kategori</th><th>Deskripsi</th><th>Tanggal</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <td class="mono">${esc(r.no_tiket)}</td>
        <td>${esc(katNama(r.kategori_id))}</td>
        <td style="max-width:260px">${esc(r.deskripsi.slice(0, 90))}${r.deskripsi.length > 90 ? "…" : ""}</td>
        <td class="muted" style="white-space:nowrap">${fmtDay(r.created_at)}</td>
        <td>${chip(r.status)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="openDetail(${r.id})">${actionable ? "Tindak Lanjut" : "Lihat"}</button></td>
      </tr>`).join("") || `<tr><td colspan="6" class="empty">Tidak ada laporan sesuai filter.</td></tr>`}</tbody>`;
}
async function openDetail(id) {
  const all = await DB.getAll(); const lp = all.find((x) => x.id === id); if (!lp) return;
  const tl = await DB.getTindak(id);
  const ro = state._readonly;
  const mapLink = `https://www.google.com/maps?q=${lp.latitude},${lp.longitude}`;
  openModal("Detail Laporan", `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span class="mono">${esc(lp.no_tiket)}</span> ${chip(lp.status)}
    </div>
    <p style="margin:10px 0 2px"><b>${esc(katNama(lp.kategori_id))}</b></p>
    <p>${esc(lp.deskripsi)}</p>
    ${lp.foto_url ? `<img src="${lp.foto_url}" style="max-height:180px;border-radius:10px;margin-top:8px"/>` : ""}
    <p class="hint" style="margin-top:8px">👤 ${esc(lp.nama_pelapor || "Anonim")} ${lp.kontak_pelapor ? "· " + esc(lp.kontak_pelapor) : ""}</p>
    <p class="hint">📅 ${fmtDate(lp.created_at)} · 📍 <a href="${mapLink}" target="_blank">Buka di Google Maps</a></p>
    <div class="timeline" style="margin-top:12px">
      <div class="tl-item"><div><b>Laporan diterima</b></div><div class="t">${fmtDate(lp.created_at)}</div></div>
      ${tl.map((t) => `<div class="tl-item"><div>${chip(t.status_baru)} ${esc(t.catatan || "")}</div><div class="t">${esc(t.oleh || t.oleh_nama || "Petugas")} · ${fmtDate(t.created_at)}</div></div>`).join("")}
    </div>
    ${ro ? '<p class="hint" style="margin-top:14px">Mode pemantauan (read-only).</p>' : `
      <hr style="margin:16px 0;border:none;border-top:1px solid var(--line)"/>
      <h3 style="font-size:14px;color:var(--navy);margin-bottom:8px">Perbarui Status</h3>
      <label>Status Baru</label>
      <select id="upStatus">${STATUS_LIST.map((s) => `<option value="${s}" ${s === lp.status ? "selected" : ""}>${s}</option>`).join("")}</select>
      <label>Catatan Penanganan</label>
      <textarea id="upCatatan" placeholder="mis. Sampah sudah diangkut, lokasi bersih."></textarea>
      <label>Foto Bukti (opsional)</label>
      <input type="file" id="upFoto" accept="image/*" />
      <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="saveStatus(${id})">Simpan Perubahan</button>
    `}
  `);
}
async function saveStatus(id) {
  const status = $("#upStatus").value;
  const catatan = $("#upCatatan").value.trim();
  let fotoUrl = "";
  const f = $("#upFoto").files[0];
  try {
    if (f) fotoUrl = await DB.uploadFoto(f);
    await DB.updateStatus(id, status, catatan, fotoUrl, state.user.nama);
    closeModal(); toast("Status diperbarui.", "ok"); renderAdminTable();
  } catch (err) { toast("Gagal: " + err.message, "err"); }
}
async function manageKategori() {
  const kat = await DB.getKategori(true);
  openModal("Kelola Kategori", `
    <div id="katList">${kat.map((k) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><span>${esc(k.nama)} ${k.aktif ? "" : '<span class="muted">(nonaktif)</span>'}</span><button class="btn btn-ghost btn-sm" onclick="toggleKat(${k.id})">${k.aktif ? "Nonaktifkan" : "Aktifkan"}</button></div>`).join("")}</div>
    <label style="margin-top:14px">Tambah Kategori Baru</label>
    <div class="row"><input id="newKat" placeholder="Nama kategori" style="flex:3"/><button class="btn btn-primary" style="flex:1" onclick="addKat()">Tambah</button></div>
  `);
}
async function addKat() {
  const nama = $("#newKat").value.trim(); if (!nama) return;
  await DB.addKategori(nama); state.kategori = await DB.getKategori(true); fillKategoriSelect(); manageKategori(); toast("Kategori ditambahkan.", "ok");
}
async function toggleKat(id) {
  await DB.toggleKategori(id); state.kategori = await DB.getKategori(true); fillKategoriSelect(); manageKategori();
}
async function exportCSV() {
  const rows = await DB.getAll();
  const head = ["No Tiket", "Kategori", "Deskripsi", "Status", "Nama Pelapor", "Kontak", "Latitude", "Longitude", "Tanggal"];
  const lines = [head.join(",")];
  rows.forEach((r) => {
    const cells = [r.no_tiket, katNama(r.kategori_id), r.deskripsi, r.status, r.nama_pelapor, r.kontak_pelapor, r.latitude, r.longitude, r.created_at]
      .map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  });
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `laporan_dlh_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  toast("Data diekspor ke CSV.", "ok");
}

/* ---------- helper ---------- */
function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }
window.openDetail = openDetail; window.saveStatus = saveStatus; window.manageKategori = manageKategori;
window.addKat = addKat; window.toggleKat = toggleKat;
