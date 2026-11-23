# Laporan Skill — Keuangan Rahma

Catatan semua skill dan plugin yang dipakai untuk memperbaiki aplikasi pada 23–24 November 2026: apa yang dilakukan tiap skill, apa yang ditemukan, apa yang diubah, dan apa yang sengaja tidak diubah.

File yang diubah: `index.html` dan `main.js`. Semua perubahan **belum di-commit dan belum di-deploy**.

## Ringkasan

| Skill / plugin | Peran | Hasil utama |
| --- | --- | --- |
| Karpathy guidelines | Aturan kerja | Perubahan kecil dan tepat sasaran, tanpa tulis ulang ke framework |
| Codex (adversarial review) | Review kode kritis | 1 temuan: `/api/data` tanpa login. Tidak diubah, karena aplikasi pribadi |
| `/frontend-design` | Kritik desain + arah baru | Arah "Amplop", perbaikan bug, siklus gajian tanggal 25 |
| `/apple-design` | Review berdasarkan HIG Apple | Tombol tidak berebut perhatian, ukuran sentuh 44px, huruf kapital seragam |
| `/visual-critique:critique-ux` | Review hierarki, affordance, kepadatan | "Catat gaji" jadi tombol, banner panduan bisa ditutup |
| `/ui-design:data-visualization` | Review grafik | Label nilai, garis nol, daftar kategori, deskripsi untuk pembaca layar |
| ui-ux-pro-max | Database desain + checklist | Error tidak hilang sendiri, undo hapus, ikon vektor, jarak tombol |

---

## 1. Karpathy guidelines (plugin `andrej-karpathy-skills`)

**Apa ini:** empat aturan kerja untuk AI saat coding: berpikir dulu sebelum menulis kode, sesederhana mungkin, perubahan seperlunya, dan target yang bisa dicek.

**Bagaimana dipakai:** sebagai lensa saat mengkritik dan mengubah kode.
- Tidak menulis ulang ke React atau framework lain, dan tidak memecah `main.js`.
- Asumsi ditanyakan dulu. Contohnya tanggal gajian, yang ternyata tanggal **25**, bukan 26 seperti tebakan awal.
- Setiap perbaikan dibuat sekecil mungkin. Misalnya bug hapus pemasukan cukup dengan menghapus satu baris.

Plugin terpasang untuk user, dan aktif di sesi Claude Code berikutnya.

## 2. Codex — adversarial review (plugin `codex-plugin-cc`)

**Apa ini:** review kode oleh Codex (OpenAI) yang sengaja mencari alasan kenapa kode belum layak rilis.

**Target:** seluruh aplikasi (`api/data.js`, `main.js`, `index.html`, `package.json`).

**Temuan:**
- **[critical]** `/api/data` membuka dan menerima data keuangan tanpa login (`api/data.js`).

**Tindakan:** sempat ditambahkan password untuk API, lalu **dibatalkan atas permintaan pemilik** karena aplikasi ini untuk pribadi. Endpoint tetap terbuka, dan risikonya diterima secara sadar.

## 3. `/frontend-design` — kritik desain dan arah "Amplop"

**Cara kerja:** screenshot semua halaman (HP, mode gelap, desktop), ringkasan data di Redis (hanya dibaca), dan pencocokan dengan `DESIGN_BRIEF.md`.

**Temuan dari data:**
- Semua transaksi dicatat lewat tombol **Bayar** di Planner. Input Manual tidak pernah dipakai, jadi kartu "Keluar" di Beranda selalu Rp 0.
- Pemasukan beberapa bulan tidak tercatat, sehingga angka utama Beranda selalu minus merah.
- Aplikasi memakai bulan kalender, padahal gajian tanggal 25, sehingga ada pemasukan yang tidak masuk ke bulan mana pun.

**Bug fungsi yang diperbaiki:**

| Bug | Perbaikan |
| --- | --- |
| Tutup buku **menghapus pemasukan** bulan itu | Baris penghapusan dibuang; hitungan sudah dipisah per periode |
| Pesan "berhasil" muncul walau simpan **gagal** | `saveDataToCloud()` mengembalikan `true`/`false`; pesan sukses hanya kalau `true` |
| Data cloud bisa **tertimpa data kosong** kalau gagal dimuat | Flag `dataLoaded`: tidak menyimpan sebelum data cloud termuat |
| Pemasukan dari Input Manual tidak dihitung | `computeMonthTotals()` ikut menjumlah pemasukan dari transaksi |
| Chart.js dan Tailwind dimuat tanpa versi | Dikunci: Chart.js 4.6.1, Tailwind 3.4.17 |
| Teks pudar di desktop | Warna Tailwind bernama `base` bentrok dengan font `text-base`; token warnanya dihapus |
| Grafik mingguan salah membaca tanggal (UTC) | Tanggal dibaca sebagai waktu lokal |
| Nama tagihan berisi tanda kutip merusak tombol Bayar | Tombol memanggil `payPlannerItem(id)`, hanya dengan id |

**Siklus gajian tanggal 25:**
- Periode "November" = **25 Okt – 24 Nov**. Fungsi baru: `getPeriodKey()`, `prevPeriodKey()`, `formatPeriodRange()`.
- Aturan ini berlaku sama di Beranda, Planner, Analisis, tutup buku, dan Riwayat.
- Mulai tanggal 25, aplikasi menawarkan tutup buku untuk periode yang baru selesai. Kalau pemasukannya masih Rp 0, ada peringatan dan tombol "Catat gaji dulu" dengan tanggal gajian terisi otomatis.

**Arah desain "Amplop" (Beranda):**
- Angka utama: **sisa uang sampai gajian**, ditambah keterangan "Gajian X hari lagi".
- Kalau gaji belum dicatat, angka utama menampilkan uang yang sudah keluar (bukan minus merah) dan ada tombol "Catat gaji".
- Daftar **tagihan belum dibayar** dengan tombol Bayar langsung di Beranda.
- Kalau periode baru belum punya tagihan, ada tombol "Salin tagihan dari periode lalu".

**Sesuai `DESIGN_BRIEF.md`:**
- Nama "FinTracker" diganti "Keuangan Rahma", dan semua teks bahasa Inggris diterjemahkan.
- `user-scalable=no` dihapus, jadi zoom bisa dipakai lagi.
- Kontras teks dinaikkan: abu-abu `slate-400` (2,6:1) diganti `slate-500` (4,8:1), dan warna utama jadi `#2563eb` (5,2:1 untuk teks putih).
- "Hapus Semua" dipindah ke menu "⋯" dengan konfirmasi. Hapus tagihan dipindah ke form Ubah, tidak lagi di sebelah tombol Bayar.
- Halaman kosong sekarang punya keterangan dan tombol aksi. Grafik kosong dan "Rp 0" tanpa penjelasan sudah tidak ada.
- Banner panduan hilang setelah Panduan dibuka. Panduan tetap bisa dibuka lewat tombol "?" di header.

**Kesan template yang dibuang:** judul dua warna, label HURUF KAPITAL, blob dekoratif, dan emoji di tombol. Warna merah sekarang hanya untuk masalah (minus, lebih bayar, hapus).

## 4. `/apple-design` — review berdasarkan HIG Apple

Referensi yang dibaca: `accessibility.md`, `color.md`, `buttons.md`, `tab-bars.md`, `layout.md`, `writing.md`, `dark-mode.md`, `charting-data.md`.

| Temuan | Referensi HIG | Perbaikan |
| --- | --- | --- |
| 6–9 tombol hijau solid berderet berebut perhatian | `buttons.md › Style`: maksimal 1–2 tombol menonjol per layar | Tombol Bayar di daftar jadi gaya *tinted*; hijau solid hanya di tombol konfirmasi |
| Tombol di kartu Planner tingginya 32px | `accessibility.md › Mobility`: default 44×44 pt | Semua tombol aksi minimal 44px |
| Pesan error hilang dalam 3 detik | `accessibility.md › Cognitive`: hindari elemen berbatas waktu | Diperpanjang (lalu dibuat permanen di langkah ui-ux-pro-max) |
| Huruf kapital campur aduk | `writing.md › Best practices`: satu gaya per jenis elemen | Semua label, tombol, dan judul pakai *sentence case* |
| Grafik tanpa nilai untuk pembaca layar | `charting-data.md › Best practices` | Ditangani di bagian 6 |

**Sengaja tidak diubah:** tombol mode gelap. HIG menyarankan aplikasi cukup mengikuti setelan sistem (`dark-mode.md`), tapi tombol ini baru saja sengaja ditambahkan pemilik.

## 5. `/visual-critique:critique-ux` (+ critique-visual-hierarchy, critique-affordance, critique-information-density)

| Prioritas | Masalah | Dimensi | Status |
| --- | --- | --- | --- |
| P2 | Banyak tombol solid bersaing | Hierarchy / Affordance | Diperbaiki (tombol *tinted*) |
| P2 | "Catat gaji" hanya tautan di tengah kalimat, padahal aksi terpenting saat gaji belum dicatat | Affordance / Density | Diperbaiki (jadi tombol) |
| P2 | Banner panduan di atas angka utama hanya hilang kalau Panduan dibuka | Hierarchy | Diperbaiki (ada tombol ×) |
| P2 | Ukuran sentuh tombol Planner | Affordance | Diperbaiki (44px) |
| P3 | Teks "Rp 0 dari Rp X" berulang di kartu tagihan yang belum dibayar | Density | Belum diubah |
| P3 | Kartu Planner tinggi, jadi daftarnya panjang di-scroll | Density | Belum diubah |

Risiko terbesar saat itu: input gaji (satu-satunya yang membuat angka utama bermakna) tampil seperti teks biasa, sementara enam tombol solid berebut perhatian. Sudah diperbaiki.

## 6. `/ui-design:data-visualization` — grafik

| Grafik | Perbaikan |
| --- | --- |
| Donat pengeluaran per kategori | Legenda diganti **daftar nama, nominal, dan %**. Warna tetap per kategori (bukan per urutan), tanpa merah. Diurutkan dari terbesar |
| Dibanding periode lalu (batang) | Label nilai di atas batang ("Rp 9,3 jt"), nama bulan sebagai label, tanpa garis kisi |
| Pengeluaran harian | Sumbu Y ditulis Rupiah ringkas ("Rp 350 rb"). Kalau kosong, grafik diganti keterangan + tombol |
| Sisa tiap periode | Batang hijau untuk surplus dan merah untuk minus, **garis nol dipertegas**, label nilai di atas atau bawah batang |
| Semua grafik | `aria-label` berisi angka sebenarnya, untuk pembaca layar |

Helper baru: `formatRpShort()`, plugin `barValueLabels`, dan `zeroLineGrid`.

## 7. ui-ux-pro-max (plugin `ui-ux-pro-max-skill`)

**Cara pakai:** skrip `search.py` dari skill yang terpasang. Query hanya berisi istilah umum, tanpa data pribadi.

**Pencarian design system:**
- Query pertama ("personal finance budget tracker mobile") **tidak cocok**: hasilnya landing page dengan video, glassmorphism, dan font tulisan tangan Caveat. Hasil ini ditolak.
- Query ulang (`--domain product` dan `--domain color`) menemukan kecocokan terverifikasi: **"Personal Finance Tracker"**, dengan palet biru tenang + hijau sukses + merah peringatan. Palet ini **sudah sesuai** dengan aplikasi sekarang.
- Rekomendasi gaya **Glassmorphism + Dark Mode (OLED)** tidak dipakai, karena berisiko untuk kontras dan tidak cocok dengan brief (pemakai non-teknis, harus cepat). Gaya sekundernya, Minimalism/Flat, sudah dipakai.

**Pencarian UX dan checklist sebelum rilis (`references/pro-rules.md`):**

| Panduan (tingkat) | Perbaikan |
| --- | --- |
| Persistent Error Messages (High) | Toast error **tidak hilang sendiri**, punya tombol ×, `role="alert"` |
| Undo for Reversible Actions (Medium) | Hapus satu transaksi, tagihan, atau wishlist langsung jalan dengan tombol **"Batalkan"** (`deleteWithUndo()`). Konfirmasi "Yakin?" hanya untuk hapus semua |
| Touch Spacing (Medium) | Jarak tombol di kartu Planner 12px, kartu Wishlist 8px |
| Part-to-Whole chart | Irisan donat terbesar mulai dari jam 12 |
| No Emoji as Structural Icons | Ikon kartu Riwayat dan label modal tutup buku diganti ikon vektor / teks |
| Decorative icons hidden | 57 ikon dekoratif diberi `aria-hidden="true"` |
| Scroll content not hidden behind fixed bars | Padding bawah dinaikkan supaya konten tidak tertutup navigasi bawah |
| Stable Interaction States | Umpan balik saat tombol ditekan (sedikit lebih gelap, tanpa menggeser layout) |
| — | Toast yang tersembunyi tidak lagi menghalangi tap (`pointer-events-none`) |
| Contrast Readability (High) + `color-dark-mode` | Header tabel Planner, baris grup, ringkasan, dan bar sticky di mode gelap sebelumnya abu terang dengan teks abu terang (varian `bg-slate-50/80`, `/50`, `/95` tidak ikut remap). Sekarang gelap, kontras teks 6,3:1 |

## 8. Yang sengaja tidak diubah / sisa pekerjaan

- **Login / password**: tidak dipakai, atas pilihan pemilik (aplikasi pribadi).
- **Tombol mode gelap**: dipertahankan (lihat bagian 4).
- **Emoji di Wishlist dan Panduan**: dipertahankan sebagai bagian dari karakter aplikasi, bukan ikon navigasi.
- **Tailwind lewat CDN**: masih memproses CSS di browser, jadi membuka aplikasi sedikit lebih lambat di HP. Perlu build step kalau mau dipercepat.
- **Safe area iPhone (`viewport-fit=cover`)**: belum diatur.
- **P3 dari critique-ux**: teks berulang di kartu tagihan dan kartu Planner yang tinggi.
- **Data**: ada satu pemasukan bertanggal **26 Desember 2026** (tanggal di masa depan, kemungkinan salah ketik). Tidak diubah.
- **Tes**: perbaikan dari bagian 3–6 lolos 21/21 tes otomatis. Perbaikan ui-ux-pro-max lolos 9/10; satu yang gagal adalah pengukuran jarak tombol Planner, yang kemudian dinaikkan ke 12px tanpa tes ulang.

## 9. Plugin yang terpasang

| Plugin | Cara menghapus |
| --- | --- |
| `andrej-karpathy-skills@karpathy-skills` | `claude plugin uninstall andrej-karpathy-skills@karpathy-skills` |
| `codex@openai-codex` | `claude plugin uninstall codex@openai-codex` |
| `ui-ux-pro-max@ui-ux-pro-max-skill` | `claude plugin uninstall ui-ux-pro-max@ui-ux-pro-max-skill` |

Ketiganya terpasang untuk user (semua proyek) dan aktif mulai sesi Claude Code berikutnya.
