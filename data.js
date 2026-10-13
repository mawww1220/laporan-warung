/* =====================================================================
   data.js — SUMBER DATA TUNGGAL Warung Laporan
   Semua halaman membaca & menulis data lewat file ini, sehingga angka
   di Dashboard, Penjualan, Pengeluaran, Modal & Prive, dan Laporan
   selalu sama. File ini tidak menyentuh tampilan (tidak memakai DOM).
   ===================================================================== */
(function (root) {
    "use strict";

    const VERSI_SKEMA = 2;
    const MAKS_NOMINAL = 999999999999;      // batas wajar: 999 miliar
    const TAHUN_MIN = 2000;
    const TAHUN_MAKS = 2100;

    /* ---------- Kunci penyimpanan (kunci lama TETAP dipakai) ---------- */
    const KUNCI = {
        penjualan: "warungLaporanPenjualan",
        pengeluaran: "warungLaporanPengeluaran",
        modal: "warungLaporanModal",
        prive: "warungLaporanPrive",
        profil: "warungLaporanProfil",
        versi: "warungLaporanVersi",
        asliPenjualan: "warungLaporanAsliV1Penjualan",     // salinan data lama sebelum migrasi
        asliPengeluaran: "warungLaporanAsliV1Pengeluaran", // salinan data lama sebelum migrasi
        ditolak: "warungLaporanMigrasiDitolak",
        cadanganTerakhir: "warungLaporanCadanganTerakhir",
        snapshot: "warungLaporanSnapshotSebelumImpor"
    };

    const JENIS = ["penjualan", "pengeluaran", "modal", "prive"];
    const JENIS_LABEL = {
        penjualan: "Penjualan",
        pengeluaran: "Pengeluaran",
        modal: "Modal",
        prive: "Prive"
    };
    const ARAH = { penjualan: "masuk", modal: "masuk", pengeluaran: "keluar", prive: "keluar" };

    const KATEGORI = [
        "Pembelian Bahan Baku",
        "Gas",
        "Listrik",
        "Sewa Tempat",
        "Perbaikan dan Perawatan",
        "Transportasi",
        "Pengeluaran Lainnya"
    ];
    const KATEGORI_HPP = KATEGORI[0];

    const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
        "Agustus", "September", "Oktober", "November", "Desember"];
    const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    /* ---------- Akses localStorage yang aman ---------- */
    function bacaTeks(kunci) {
        try { return root.localStorage.getItem(kunci); } catch (e) { return null; }
    }
    function tulisTeks(kunci, teks) {
        try { root.localStorage.setItem(kunci, teks); return true; } catch (e) { return false; }
    }
    function hapusKunci(kunci) {
        try { root.localStorage.removeItem(kunci); return true; } catch (e) { return false; }
    }
    function penyimpananTersedia() {
        try {
            const k = "__uji_penyimpanan__";
            root.localStorage.setItem(k, "1");
            root.localStorage.removeItem(k);
            return true;
        } catch (e) { return false; }
    }

    function buatId() {
        if (root.crypto && typeof root.crypto.randomUUID === "function") {
            try { return root.crypto.randomUUID(); } catch (e) { /* lanjut ke cadangan */ }
        }
        return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    }

    /* ---------- Tanggal (disimpan sebagai teks YYYY-MM-DD) ---------- */
    const p2 = (n) => String(n).padStart(2, "0");

    function isoValid(s) {
        if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
        const [y, m, d] = s.split("-").map(Number);
        if (y < TAHUN_MIN || y > TAHUN_MAKS) return false;
        const t = new Date(Date.UTC(y, m - 1, d));
        return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
    }
    function hariIni() {
        const n = new Date();
        return n.getFullYear() + "-" + p2(n.getMonth() + 1) + "-" + p2(n.getDate());
    }
    function hariDalamBulan(y, m) { return new Date(y, m, 0).getDate(); }
    function awalBulan(y, m) { return y + "-" + p2(m) + "-01"; }
    function akhirBulan(y, m) { return y + "-" + p2(m) + "-" + p2(hariDalamBulan(y, m)); }
    function pecah(iso) { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; }
    function geserBulan(y, m, n) {
        const t = (y * 12 + (m - 1)) + n;
        return { y: Math.floor(t / 12), m: (t % 12) + 1 };
    }
    // Hari yang dihitung untuk rata-rata harian: bulan berjalan = sampai hari ini
    function hariTerhitung(y, m) {
        const n = pecah(hariIni());
        if (y === n.y && m === n.m) return n.d;
        if (y < n.y || (y === n.y && m < n.m)) return hariDalamBulan(y, m);
        return 0;
    }

    /* ---------- Format tampilan ---------- */
    function angka(n) {
        return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    function rupiah(n) {
        const v = Math.round(Number(n) || 0);
        return (v < 0 ? "-" : "") + "Rp" + angka(v);
    }
    function tanggal(iso) {
        if (!isoValid(iso)) return "-";
        const { y, m, d } = pecah(iso);
        return d + " " + BULAN_SINGKAT[m - 1] + " " + y;
    }
    function tanggalPanjang(iso) {
        if (!isoValid(iso)) return "-";
        const { y, m, d } = pecah(iso);
        return d + " " + BULAN[m - 1] + " " + y;
    }
    function tanggalLengkap(iso) {
        if (!isoValid(iso)) return "-";
        const { y, m, d } = pecah(iso);
        return HARI[new Date(y, m - 1, d).getDay()] + ", " + d + " " + BULAN[m - 1] + " " + y;
    }
    function bulanTahun(y, m) { return BULAN[m - 1] + " " + y; }
    function periode(dari, sampai) {
        if (!dari && !sampai) return "Semua tanggal";
        if (dari && !sampai) return "Sejak " + tanggal(dari);
        if (!dari && sampai) return "Sampai " + tanggal(sampai);
        return dari === sampai ? tanggal(dari) : tanggal(dari) + " – " + tanggal(sampai);
    }
    function persen(n) {
        return (Math.round(n * 10) / 10).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + "%";
    }

    /* ---------- Pembersihan & validasi satu catatan ---------- */
    function nominalValid(n) {
        return typeof n === "number" && Number.isSafeInteger(n) && n > 0 && n <= MAKS_NOMINAL;
    }

    // Mengembalikan catatan yang rapi, atau null jika tidak layak dipakai.
    function bersihkan(jenis, r) {
        if (!r || typeof r !== "object") return null;
        if (typeof r.id !== "string" || !r.id) return null;
        if (!isoValid(r.tanggal)) return null;
        const nominal = (typeof r.nominal === "string" && r.nominal.trim() !== "") ? Number(r.nominal) : r.nominal;
        if (!nominalValid(nominal)) return null;
        const out = {
            id: r.id,
            tanggal: r.tanggal,
            nominal: nominal,
            keterangan: typeof r.keterangan === "string" ? r.keterangan.trim().slice(0, 120) : ""
        };
        if (jenis === "pengeluaran") {
            if (KATEGORI.indexOf(r.kategori) < 0) return null;
            out.kategori = r.kategori;
            if (typeof r.kategoriAsli === "string") out.kategoriAsli = r.kategoriAsli;
            if (r.perluDitinjau === true) out.perluDitinjau = true;
        }
        if (typeof r.dibuat === "string") out.dibuat = r.dibuat;
        if (typeof r.diubah === "string") out.diubah = r.diubah;
        return out;
    }

    // Mengubah isian nominal menjadi angka bulat. Hanya menerima "150000" atau "150.000".
    // Mengembalikan angka, null (kosong), atau NaN (format salah).
    function bacaNominal(x) {
        if (x === null || x === undefined) return null;
        if (typeof x === "number") return x;
        const t = String(x).trim();
        if (t === "") return null;
        if (/^\d+$/.test(t)) return Number(t);
        if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
        return NaN;
    }

    // Validasi isian formulir. Mengembalikan {ok, galat:{...}, nilai:{...}}
    function validasiInput(jenis, isi) {
        const galat = {};
        const nilai = {};

        const tgl = typeof isi.tanggal === "string" ? isi.tanggal : "";
        if (!tgl) galat.tanggal = "Tanggal belum diisi.";
        else if (!isoValid(tgl)) galat.tanggal = "Tanggal tidak valid.";
        else if (tgl > hariIni()) galat.tanggal = "Tanggal tidak boleh lebih dari hari ini.";
        else nilai.tanggal = tgl;

        const nom = bacaNominal(isi.nominal);
        if (nom === null) galat.nominal = "Nominal belum diisi.";
        else if (typeof nom !== "number" || !Number.isSafeInteger(nom) || nom <= 0) galat.nominal = "Nominal harus berupa angka bulat lebih dari 0.";
        else if (nom > MAKS_NOMINAL) galat.nominal = "Nominal terlalu besar.";
        else nilai.nominal = nom;

        if (jenis === "pengeluaran") {
            if (!isi.kategori) galat.kategori = "Pilih kategori pengeluaran.";
            else if (KATEGORI.indexOf(isi.kategori) < 0) galat.kategori = "Kategori tidak dikenal.";
            else nilai.kategori = isi.kategori;
        }

        const ket = typeof isi.keterangan === "string" ? isi.keterangan.trim() : "";
        if (ket.length > 120) galat.keterangan = "Keterangan maksimal 120 karakter.";
        else nilai.keterangan = ket;

        return { ok: Object.keys(galat).length === 0, galat, nilai };
    }

    /* ---------- Baca / tulis daftar catatan ---------- */
    // Baca MENTAH (apa adanya) agar penyimpanan ulang tidak menghilangkan isi yang tak dikenal.
    function bacaMentah(jenis) {
        const teks = bacaTeks(KUNCI[jenis]);
        if (teks === null) return { ok: true, data: [] };
        try {
            const d = JSON.parse(teks);
            return Array.isArray(d) ? { ok: true, data: d } : { ok: false, data: [] };
        } catch (e) {
            return { ok: false, data: [] };
        }
    }
    function ambil(jenis) {
        const m = bacaMentah(jenis);
        const hasil = [];
        const sudah = new Set();
        m.data.forEach((r) => {
            const b = bersihkan(jenis, r);
            if (b && !sudah.has(b.id)) { sudah.add(b.id); hasil.push(b); }
        });
        return hasil;
    }
    const PESAN_RUSAK = "Data tersimpan tidak dapat dibaca. Jangan menambah data baru; ekspor cadangan atau hubungi pembuat aplikasi.";
    const PESAN_GAGAL = "Data gagal disimpan. Periksa pengaturan penyimpanan browser (mungkin penuh atau diblokir).";

    function tambah(jenis, isi) {
        const v = validasiInput(jenis, isi);
        if (!v.ok) return { ok: false, galat: v.galat };
        const m = bacaMentah(jenis);
        if (!m.ok) return { ok: false, pesan: PESAN_RUSAK };
        const rec = { id: buatId(), dibuat: new Date().toISOString() };
        Object.assign(rec, v.nilai);
        const bersih = bersihkan(jenis, rec);
        if (!bersih) return { ok: false, pesan: "Data tidak valid." };
        m.data.push(bersih);
        if (!tulisTeks(KUNCI[jenis], JSON.stringify(m.data))) return { ok: false, pesan: PESAN_GAGAL };
        return { ok: true, rec: bersih };
    }

    function ubah(jenis, id, isi) {
        const v = validasiInput(jenis, isi);
        if (!v.ok) return { ok: false, galat: v.galat };
        const m = bacaMentah(jenis);
        if (!m.ok) return { ok: false, pesan: PESAN_RUSAK };
        const i = m.data.findIndex((r) => r && r.id === id);
        if (i < 0) return { ok: false, pesan: "Catatan tidak ditemukan. Mungkin sudah dihapus dari tab lain." };
        const baru = Object.assign({}, m.data[i], v.nilai, { diubah: new Date().toISOString() });
        delete baru.perluDitinjau;          // setelah diperiksa pengguna, penanda hilang
        const bersih = bersihkan(jenis, baru);
        if (!bersih) return { ok: false, pesan: "Data tidak valid." };
        m.data[i] = bersih;
        if (!tulisTeks(KUNCI[jenis], JSON.stringify(m.data))) return { ok: false, pesan: PESAN_GAGAL };
        return { ok: true, rec: bersih };
    }

    function hapus(jenis, id) {
        const m = bacaMentah(jenis);
        if (!m.ok) return { ok: false, pesan: PESAN_RUSAK };
        const sisa = m.data.filter((r) => !(r && r.id === id));
        if (sisa.length === m.data.length) return { ok: false, pesan: "Catatan tidak ditemukan. Mungkin sudah dihapus dari tab lain." };
        if (!tulisTeks(KUNCI[jenis], JSON.stringify(sisa))) return { ok: false, pesan: PESAN_GAGAL };
        return { ok: true };
    }

    // Menghapus penanda "perlu ditinjau" setelah pengguna memeriksa kategori hasil migrasi
    function tandaiDiperiksa() {
        const m = bacaMentah("pengeluaran");
        if (!m.ok) return { ok: false, pesan: PESAN_RUSAK };
        m.data.forEach((r) => { if (r && typeof r === "object") delete r.perluDitinjau; });
        if (!tulisTeks(KUNCI.pengeluaran, JSON.stringify(m.data))) return { ok: false, pesan: PESAN_GAGAL };
        return { ok: true };
    }

    /* ---------- Profil usaha ---------- */
    function profilAwal() {
        return {
            namaUsaha: "", namaPemilik: "", alamat: "", telepon: "",
            jamOperasional: "", tahunMulai: "", saldoKasAwal: 0
        };
    }
    function ambilProfil() {
        const p = profilAwal();
        const teks = bacaTeks(KUNCI.profil);
        if (teks === null) return p;
        try {
            const d = JSON.parse(teks);
            if (!d || typeof d !== "object") return p;
            ["namaUsaha", "namaPemilik", "alamat", "telepon", "jamOperasional"].forEach((k) => {
                if (typeof d[k] === "string") p[k] = d[k];
            });
            if (typeof d.tahunMulai === "string" || typeof d.tahunMulai === "number") p.tahunMulai = String(d.tahunMulai);
            if (Number.isSafeInteger(d.saldoKasAwal) && d.saldoKasAwal >= 0 && d.saldoKasAwal <= MAKS_NOMINAL) {
                p.saldoKasAwal = d.saldoKasAwal;
            }
        } catch (e) { /* pakai bawaan */ }
        return p;
    }
    function validasiProfil(isi) {
        const galat = {};
        const nilai = {};
        const t = (k) => (typeof isi[k] === "string" ? isi[k].trim() : "");

        nilai.namaUsaha = t("namaUsaha");
        if (!nilai.namaUsaha) galat.namaUsaha = "Nama usaha wajib diisi.";
        else if (nilai.namaUsaha.length > 80) galat.namaUsaha = "Nama usaha maksimal 80 karakter.";

        nilai.namaPemilik = t("namaPemilik");
        if (nilai.namaPemilik.length > 80) galat.namaPemilik = "Nama pemilik maksimal 80 karakter.";

        nilai.alamat = t("alamat");
        if (nilai.alamat.length > 200) galat.alamat = "Alamat maksimal 200 karakter.";

        nilai.telepon = t("telepon");
        if (nilai.telepon && !/^[0-9+\-()\s]{5,20}$/.test(nilai.telepon)) {
            galat.telepon = "Nomor telepon hanya boleh berisi angka, spasi, +, -, dan tanda kurung (5–20 karakter).";
        }

        nilai.jamOperasional = t("jamOperasional");
        if (nilai.jamOperasional.length > 80) galat.jamOperasional = "Jam operasional maksimal 80 karakter.";

        const th = t("tahunMulai");
        if (th === "") nilai.tahunMulai = "";
        else if (!/^\d{4}$/.test(th) || Number(th) < 1900 || Number(th) > new Date().getFullYear()) {
            galat.tahunMulai = "Tahun mulai usaha harus 4 angka antara 1900 dan tahun ini.";
        } else nilai.tahunMulai = th;

        let s = bacaNominal(isi.saldoKasAwal);
        if (s === null) s = 0;
        if (typeof s !== "number" || !Number.isSafeInteger(s) || s < 0) galat.saldoKasAwal = "Saldo kas awal harus berupa angka 0 atau lebih.";
        else if (s > MAKS_NOMINAL) galat.saldoKasAwal = "Saldo kas awal terlalu besar.";
        else nilai.saldoKasAwal = s;

        return { ok: Object.keys(galat).length === 0, galat, nilai };
    }
    function simpanProfil(isi) {
        const v = validasiProfil(isi);
        if (!v.ok) return { ok: false, galat: v.galat };
        const rec = Object.assign({}, v.nilai, { diperbarui: new Date().toISOString() });
        if (!tulisTeks(KUNCI.profil, JSON.stringify(rec))) return { ok: false, pesan: PESAN_GAGAL };
        return { ok: true, profil: ambilProfil() };
    }

    /* ---------- Perhitungan ---------- */
    function muat() {
        return {
            P: ambil("penjualan"), E: ambil("pengeluaran"),
            M: ambil("modal"), V: ambil("prive"),
            profil: ambilProfil()
        };
    }
    function jumlah(arr) { return arr.reduce((t, r) => t + r.nominal, 0); }
    function dalamRentang(arr, dari, sampai) {
        return arr.filter((r) => (!dari || r.tanggal >= dari) && (!sampai || r.tanggal <= sampai));
    }

    /* Ringkasan keuangan untuk rentang tanggal (dari/sampai boleh kosong = tanpa batas).
       Saldo awal periode = Saldo Kas Awal (Profil) + semua transaksi SEBELUM tanggal awal.
       Dengan begitu saldo akhir periode ini = saldo awal periode berikutnya,
       dan saldo awal tidak pernah dijumlahkan berulang. */
    function ringkasan(dari, sampai, ctx) {
        ctx = ctx || muat();
        const sebelum = (r) => !!dari && r.tanggal < dari;
        const P = dalamRentang(ctx.P, dari, sampai);
        const E = dalamRentang(ctx.E, dari, sampai);
        const M = dalamRentang(ctx.M, dari, sampai);
        const V = dalamRentang(ctx.V, dari, sampai);

        const penjualan = jumlah(P);
        const pengeluaran = jumlah(E);
        const modal = jumlah(M);
        const prive = jumlah(V);

        const saldoAwal = ctx.profil.saldoKasAwal
            + jumlah(ctx.P.filter(sebelum)) + jumlah(ctx.M.filter(sebelum))
            - jumlah(ctx.E.filter(sebelum)) - jumlah(ctx.V.filter(sebelum));

        const perKategori = KATEGORI.map((k) => {
            const n = jumlah(E.filter((r) => r.kategori === k));
            return { kategori: k, nominal: n, persen: pengeluaran > 0 ? (n / pengeluaran) * 100 : 0 };
        });
        const hpp = perKategori[0].nominal;                 // Pembelian Bahan Baku
        const biayaLain = pengeluaran - hpp;                // 6 kategori lainnya
        const labaKotor = penjualan - hpp;

        return {
            dari, sampai,
            penjualan, pengeluaran, modal, prive,
            labaSederhana: penjualan - pengeluaran,
            hpp, labaKotor, biayaLain,
            labaSetelahHpp: labaKotor - biayaLain,
            persenHpp: penjualan > 0 ? (hpp / penjualan) * 100 : null,
            perKategori,
            saldoAwal,
            saldoAkhir: saldoAwal + penjualan + modal - pengeluaran - prive,
            jumlahCatatan: { penjualan: P.length, pengeluaran: E.length, modal: M.length, prive: V.length }
        };
    }

    function saldoKasTerkini(ctx) { return ringkasan("", "", ctx).saldoAkhir; }

    function perBulan(tahun, ctx) {
        ctx = ctx || muat();
        const hasil = [];
        for (let m = 1; m <= 12; m++) {
            const r = ringkasan(awalBulan(tahun, m), akhirBulan(tahun, m), ctx);
            r.tahun = tahun; r.bulan = m;
            hasil.push(r);
        }
        return hasil;
    }

    function rataHarian(penjualanBulan, y, m) {
        const h = hariTerhitung(y, m);
        return h > 0 ? penjualanBulan / h : null;
    }

    // Semua transaksi dari keempat jenis dalam satu daftar (untuk riwayat)
    function gabungan(ctx, dari, sampai) {
        ctx = ctx || muat();
        const daftar = [];
        [["penjualan", ctx.P], ["pengeluaran", ctx.E], ["modal", ctx.M], ["prive", ctx.V]].forEach(([jenis, arr]) => {
            dalamRentang(arr, dari, sampai).forEach((r, i) => {
                daftar.push(Object.assign({ jenis, arah: ARAH[jenis], urut: i }, r));
            });
        });
        return daftar;
    }
    function urutTerbaru(a, b) {
        return b.tanggal.localeCompare(a.tanggal)
            || (b.dibuat || "").localeCompare(a.dibuat || "")
            || b.urut - a.urut;
    }
    function urutLama(a, b) { return urutTerbaru(b, a); }

    function adaData(ctx) {
        ctx = ctx || muat();
        return ctx.P.length + ctx.E.length + ctx.M.length + ctx.V.length > 0;
    }

    function tahunTersedia(ctx) {
        ctx = ctx || muat();
        const set = new Set([new Date().getFullYear()]);
        [].concat(ctx.P, ctx.E, ctx.M, ctx.V).forEach((r) => set.add(Number(r.tanggal.slice(0, 4))));
        return Array.from(set).sort((a, b) => b - a);
    }

    /* ---------- Migrasi data lama (v1 → v2), tanpa menghapus apa pun ---------- */
    const PEMETAAN_KATEGORI = {
        "Bahan baku": { baru: "Pembelian Bahan Baku", tinjau: false },
        "Gas dan bahan bakar": { baru: "Gas", tinjau: true },
        "Listrik dan air": { baru: "Listrik", tinjau: true },
        "Gaji karyawan": { baru: "Pengeluaran Lainnya", tinjau: true },
        "Peralatan": { baru: "Pengeluaran Lainnya", tinjau: true },
        "Lainnya": { baru: "Pengeluaran Lainnya", tinjau: false }
    };

    function migrasi() {
        const info = { dijalankan: false, dipindah: 0, ditolak: 0, ditinjau: 0, galat: null };
        if (!penyimpananTersedia()) { info.galat = "Penyimpanan browser tidak tersedia."; return info; }
        if (bacaTeks(KUNCI.versi) === String(VERSI_SKEMA)) return info;

        info.dijalankan = true;
        const ditolak = [];
        let semuaAman = true;

        [["penjualan", KUNCI.asliPenjualan], ["pengeluaran", KUNCI.asliPengeluaran]].forEach(([jenis, kunciAsli]) => {
            const mentah = bacaTeks(KUNCI[jenis]);
            if (mentah === null) return;                      // belum pernah ada data
            if (bacaTeks(kunciAsli) === null) tulisTeks(kunciAsli, mentah);   // salinan pengaman

            let arr;
            try { arr = JSON.parse(mentah); } catch (e) { arr = null; }
            if (!Array.isArray(arr)) { semuaAman = false; info.galat = "Sebagian data lama tidak dapat dibaca; data asli tidak diubah."; return; }

            const idTerpakai = new Set();
            const hasil = [];
            arr.forEach((r) => {
                if (!r || typeof r !== "object") { ditolak.push({ jenis, alasan: "Bukan catatan", asli: r }); return; }
                const salinan = Object.assign({}, r);
                if (typeof salinan.id !== "string" || !salinan.id || idTerpakai.has(salinan.id)) salinan.id = buatId();

                if (jenis === "pengeluaran" && KATEGORI.indexOf(salinan.kategori) < 0) {
                    const asal = typeof salinan.kategori === "string" ? salinan.kategori : "";
                    const peta = PEMETAAN_KATEGORI[asal] || { baru: "Pengeluaran Lainnya", tinjau: true };
                    salinan.kategoriAsli = asal || "(kosong)";
                    salinan.kategori = peta.baru;
                    if (peta.tinjau) { salinan.perluDitinjau = true; info.ditinjau++; }
                    info.dipindah++;
                }
                const bersih = bersihkan(jenis, salinan);
                if (!bersih) { ditolak.push({ jenis, alasan: "Tanggal atau nominal tidak valid", asli: r }); return; }
                if (typeof r.dibuat === "string") bersih.dibuat = r.dibuat;
                idTerpakai.add(bersih.id);
                hasil.push(bersih);
            });
            if (!tulisTeks(KUNCI[jenis], JSON.stringify(hasil))) { semuaAman = false; info.galat = "Migrasi gagal menyimpan; data asli tidak diubah."; }
        });

        if (ditolak.length) {
            let lama = [];
            try { lama = JSON.parse(bacaTeks(KUNCI.ditolak) || "[]"); } catch (e) { lama = []; }
            tulisTeks(KUNCI.ditolak, JSON.stringify(lama.concat(ditolak)));
        }
        info.ditolak = ditolak.length;
        if (semuaAman) tulisTeks(KUNCI.versi, String(VERSI_SKEMA));
        return info;
    }

    /* ---------- Cadangan & pemulihan ---------- */
    function ekspor() {
        const ctx = muat();
        return {
            aplikasi: "Warung Laporan",
            versiSkema: VERSI_SKEMA,
            diekspor: new Date().toISOString(),
            data: {
                penjualan: ctx.P, pengeluaran: ctx.E, modal: ctx.M, prive: ctx.V,
                profil: ctx.profil
            }
        };
    }
    function tandaiCadangan() { tulisTeks(KUNCI.cadanganTerakhir, new Date().toISOString()); }
    function cadanganTerakhir() {
        const t = bacaTeks(KUNCI.cadanganTerakhir);
        return t && !isNaN(Date.parse(t)) ? t : null;
    }

    // Memeriksa isi file cadangan. Satu saja catatan tidak valid → seluruh file ditolak.
    function validasiCadangan(obj) {
        const galat = [];
        const tambahGalat = (t) => { if (galat.length < 8) galat.push(t); };
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, galat: ["Isi file bukan format cadangan Warung Laporan."] };
        if (obj.aplikasi !== "Warung Laporan") return { ok: false, galat: ["File ini bukan cadangan Warung Laporan."] };
        if (typeof obj.versiSkema !== "number" || obj.versiSkema > VERSI_SKEMA || obj.versiSkema < 2) {
            return { ok: false, galat: ["Versi cadangan tidak dikenali. Gunakan file cadangan yang diunduh dari aplikasi ini."] };
        }
        if (!obj.data || typeof obj.data !== "object") return { ok: false, galat: ["Bagian data tidak ditemukan di file."] };

        const bersih = {};
        const jumlahCatatan = {};
        const semuaId = new Set();
        JENIS.forEach((jenis) => {
            const arr = obj.data[jenis] === undefined ? [] : obj.data[jenis];
            if (!Array.isArray(arr)) { tambahGalat(JENIS_LABEL[jenis] + ": format daftar tidak valid."); return; }
            const hasil = [];
            const idJenis = new Set();
            arr.forEach((r, i) => {
                const b = bersihkan(jenis, r);
                if (!b) tambahGalat(JENIS_LABEL[jenis] + " nomor " + (i + 1) + ": tanggal, nominal, atau kategori tidak valid.");
                else if (idJenis.has(b.id)) tambahGalat(JENIS_LABEL[jenis] + " nomor " + (i + 1) + ": ID ganda.");
                else { idJenis.add(b.id); hasil.push(b); }
            });
            bersih[jenis] = hasil;
            jumlahCatatan[jenis] = hasil.length;
        });

        let profil = null;
        if (obj.data.profil !== undefined && obj.data.profil !== null) {
            const pv = validasiProfil(obj.data.profil);
            if (!pv.ok) tambahGalat("Profil usaha: " + Object.values(pv.galat)[0]);
            else profil = pv.nilai;
        }
        if (galat.length) return { ok: false, galat };
        return { ok: true, galat: [], data: Object.assign(bersih, { profil }), jumlah: jumlahCatatan };
    }

    function snapshotMentah() {
        const s = {};
        ["penjualan", "pengeluaran", "modal", "prive", "profil"].forEach((j) => { s[j] = bacaTeks(KUNCI[j]); });
        return s;
    }
    function pulihkanMentah(s) {
        Object.keys(s).forEach((j) => {
            if (s[j] === null) hapusKunci(KUNCI[j]); else tulisTeks(KUNCI[j], s[j]);
        });
    }

    /* mode: "gabung" (tambah yang belum ada) atau "ganti" (timpa semua).
       Sebelum mengubah apa pun, kondisi sekarang disimpan sebagai snapshot
       agar bisa dibatalkan. */
    function terapkanCadangan(data, mode) {
        const sebelum = snapshotMentah();
        const snap = { waktu: new Date().toISOString(), data: ekspor() };
        if (!tulisTeks(KUNCI.snapshot, JSON.stringify(snap))) {
            return { ok: false, pesan: "Tidak bisa menyimpan salinan pengaman sebelum impor. Penyimpanan browser mungkin penuh. Tidak ada data yang diubah." };
        }
        try {
            const ringkas = { ditambah: 0, dilewati: 0 };
            JENIS.forEach((jenis) => {
                const masuk = data[jenis] || [];
                let akhir;
                if (mode === "ganti") {
                    akhir = masuk;
                    ringkas.ditambah += masuk.length;
                } else {
                    const ada = ambil(jenis);
                    const idAda = new Set(ada.map((r) => r.id));
                    const baru = masuk.filter((r) => !idAda.has(r.id));
                    ringkas.dilewati += masuk.length - baru.length;
                    ringkas.ditambah += baru.length;
                    akhir = ada.concat(baru);
                }
                if (!tulisTeks(KUNCI[jenis], JSON.stringify(akhir))) throw new Error("tulis");
            });
            if (data.profil) {
                const profilSekarang = bacaTeks(KUNCI.profil);
                if (mode === "ganti" || profilSekarang === null) {
                    const rec = Object.assign({}, data.profil, { diperbarui: new Date().toISOString() });
                    if (!tulisTeks(KUNCI.profil, JSON.stringify(rec))) throw new Error("tulis");
                }
            }
            tulisTeks(KUNCI.versi, String(VERSI_SKEMA));
            return { ok: true, ringkas };
        } catch (e) {
            pulihkanMentah(sebelum);
            return { ok: false, pesan: "Impor gagal di tengah jalan, data dikembalikan seperti semula." };
        }
    }

    function infoSnapshot() {
        const t = bacaTeks(KUNCI.snapshot);
        if (!t) return null;
        try {
            const s = JSON.parse(t);
            return s && s.waktu && s.data ? { waktu: s.waktu } : null;
        } catch (e) { return null; }
    }
    function batalkanImporTerakhir() {
        const t = bacaTeks(KUNCI.snapshot);
        if (!t) return { ok: false, pesan: "Tidak ada salinan pengaman." };
        let s;
        try { s = JSON.parse(t); } catch (e) { return { ok: false, pesan: "Salinan pengaman rusak." }; }
        const v = validasiCadangan(s.data);
        if (!v.ok) return { ok: false, pesan: "Salinan pengaman tidak valid." };
        const sebelum = snapshotMentah();
        try {
            JENIS.forEach((jenis) => {
                if (!tulisTeks(KUNCI[jenis], JSON.stringify(v.data[jenis]))) throw new Error("tulis");
            });
            if (v.data.profil) {
                const rec = Object.assign({}, v.data.profil, { diperbarui: new Date().toISOString() });
                if (!tulisTeks(KUNCI.profil, JSON.stringify(rec))) throw new Error("tulis");
            }
            hapusKunci(KUNCI.snapshot);
            return { ok: true };
        } catch (e) {
            pulihkanMentah(sebelum);
            return { ok: false, pesan: "Gagal mengembalikan data; kondisi semula dipertahankan." };
        }
    }

    function hitungCatatan() {
        const c = {};
        JENIS.forEach((j) => { c[j] = ambil(j).length; });
        return c;
    }

    /* ---------- Antarmuka publik ---------- */
    const infoMigrasi = migrasi();

    root.WL = {
        VERSI_SKEMA, KUNCI, JENIS, JENIS_LABEL, ARAH, KATEGORI, KATEGORI_HPP,
        BULAN, BULAN_SINGKAT, MAKS_NOMINAL,
        penyimpananTersedia: penyimpananTersedia(),
        infoMigrasi,
        fmt: { angka, rupiah, tanggal, tanggalPanjang, tanggalLengkap, bulanTahun, periode, persen },
        tgl: { hariIni, isoValid, awalBulan, akhirBulan, hariDalamBulan, geserBulan, pecah, hariTerhitung },
        data: {
            ambil, tambah, ubah, hapus, tandaiDiperiksa, muat, gabungan, urutTerbaru, urutLama, adaData,
            tahunTersedia, validasiInput, hitungCatatan, bacaTeks, tulisTeks, KUNCI_DITOLAK: KUNCI.ditolak
        },
        profil: { ambil: ambilProfil, simpan: simpanProfil, validasi: validasiProfil },
        hitung: {
            jumlah, dalamRentang, ringkasan, saldoKasTerkini, perBulan, rataHarian
        },
        cadangan: {
            ekspor, validasi: validasiCadangan, terapkan: terapkanCadangan,
            tandai: tandaiCadangan, terakhir: cadanganTerakhir,
            infoSnapshot, batalkanImporTerakhir
        },
        UI: {}
    };
})(typeof window !== "undefined" ? window : globalThis);
