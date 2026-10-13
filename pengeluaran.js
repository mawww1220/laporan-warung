/* Halaman Pengeluaran — memakai modul catatan.js (dengan kategori & rekap) */
WL.UI.halamanCatatan({
    jenis: "pengeluaran",
    akar: document.getElementById("akar"),
    judul: "Pengeluaran",
    kata: "pengeluaran",
    kategori: true,
    rekap: true,
    labelTotal: "Total pengeluaran",
    ikon: "pengeluaran",
    warna: "merah",
    labelNominal: "Nominal pengeluaran",
    placeholderKet: "Contoh: Beli beras 50 kg",
    teksBantu: "Pilih tanggal dan kategori, lalu isi nominal. Keterangan boleh dikosongkan.",
    teksRiwayat: "Semua pengeluaran yang sudah dicatat. Pakai filter tanggal dan kategori.",
    teksKosong: "Belum ada pengeluaran. Isi formulir di atas untuk mencatat pengeluaran pertama."
});
