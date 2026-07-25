# Design Brief — Keuangan Rahma

## Prinsip
Aplikasi ini dipakai satu orang, non-teknis, setiap hari, di HP.
Prioritas utama: cepat dan tanpa berpikir. Kalau sebuah aksi bikin ragu,
itu bug desain, bukan fitur.

## Nama
Satu nama di semua tempat: "Keuangan Rahma".
Hapus nama "FinTracker" di mana pun muncul.

## Bahasa
Seluruh UI berbahasa Indonesia dan konsisten.
Tidak ada istilah Inggris keuangan (Installment, Bills, Groceries, dsb).

## Model uang — tiga aliran TERPISAH
1. Pemasukan  — uang yang masuk
2. Pengeluaran — uang yang dikonsumsi/habis
3. Tabungan   — uang yang dipindah ke tujuan (Dana Darurat, Liburan, dll).
   Ini BUKAN pengeluaran. Uangnya masih milik pengguna, hanya pindah tempat.

Metrik utama (hero number):
  Sisa uang bulan ini = Pemasukan − Pengeluaran − Tabungan

Angka "Total Pengeluaran" HANYA menjumlah pengeluaran konsumsi.
Tabungan tidak boleh masuk ke angka pengeluaran.

## Kategori pengeluaran
Harus mutually exclusive (tidak tumpang tindih) dan satu bahasa.
Daftar final diisi oleh pemilik (lihat prompt Fase 2).

## Tabungan (aliran terpisah dari kategori pengeluaran)
Contoh tujuan: Dana Darurat, Tabungan Liburan. Bisa ditambah tujuan baru.

## Dua cara mencatat uang keluar
- Planner Rutin: daftar tagihan rutin bulan ini (punya estimasi + status
  "Belum/Sudah bayar"). Saat tombol "Bayar" ditekan, sistem membuat
  transaksi di ledger/sumber data yang SAMA dengan Input Manual.
- Input Manual: untuk pengeluaran di luar tagihan rutin.
- Keduanya menulis ke satu sumber data. History dan semua grafik harus
  selalu konsisten, tidak ada dobel-catat.

Bahasa pembeda di UI:
- Subjudul Planner: "Tagihan rutin yang sudah kamu rencanakan — centang saat dibayar."
- Subjudul Input Manual: "Pengeluaran di luar tagihan rutin."

## Halaman pembuka
Buka aplikasi = halaman "Beranda" ringkas: menampilkan hero "Sisa uang
bulan ini" + tombol besar "Catat Pengeluaran". BUKAN langsung halaman grafik.
Grafik/analisis cukup satu tap dari sana.

## Empty state
Setiap tab wajib punya empty state ramah dengan ajakan aksi
("Belum ada transaksi — yuk catat yang pertama") + tombol menuju Input.
Dilarang menampilkan grafik kosong atau "Rp 0" tanpa penjelasan.

## Keamanan aksi
Tombol "Hapus Semua" tidak boleh sejajar tombol biasa. Sembunyikan di menu
"..." dan beri konfirmasi dua langkah. Hapus satuan boleh mudah, idealnya
ada undo (toast "Dihapus — Batalkan").

## Aksesibilitas
- Hapus `user-scalable=no` dari meta viewport.
- Semua tombol ikon punya label teks atau aria-label.
- Teks abu terang (slate-400) di atas putih harus dicek kontrasnya (WCAG AA).