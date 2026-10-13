/* Dashboard — semua angka dihitung dari data yang tersimpan (lewat data.js) */
(function () {
    "use strict";
    const WL = window.WL;
    const UI = WL.UI;
    const { el, esc } = UI;
    const { fmt, tgl, hitung } = WL;
    const $ = (id) => document.getElementById(id);

    $("ikonKalender").innerHTML = UI.ikon("kalender", 18);
    $("kartuHari").innerHTML =
        UI.kartu({ label: "Penjualan hari ini", ikon: "penjualan", warna: "biru", id: "kPenjHari" }) +
        UI.kartu({ label: "Pengeluaran hari ini", ikon: "pengeluaran", warna: "merah", id: "kPengHari" }) +
        UI.kartu({ label: "Laba sederhana hari ini", ikon: "naik", warna: "hijau", id: "kLabaHari" }) +
        UI.kartu({ label: "Saldo kas terkini", ikon: "dompet", warna: "ungu", id: "kSaldo" });
    $("kartuBulan").innerHTML =
        UI.kartu({ label: "Penjualan bulan ini", ikon: "penjualan", warna: "biru", id: "kPenjBulan" }) +
        UI.kartu({ label: "Pengeluaran bulan ini", ikon: "pengeluaran", warna: "merah", id: "kPengBulan" }) +
        UI.kartu({ label: "Laba sederhana bulan ini", ikon: "naik", warna: "hijau", id: "kLabaBulan" });

    function isiKartu(id, nilai, catatan, kelas) {
        const h = $(id);
        h.textContent = fmt.rupiah(nilai);
        h.className = kelas || "";
        $(id + "Cat").textContent = catatan;
    }
    const statusLaba = (n) => (n > 0 ? "Untung" : n < 0 ? "Rugi" : "Impas") + " · penjualan − pengeluaran";

    // Mengembalikan [teks rupiah, teks persen atau ""]
    function selisihTeks(ini, lalu, tampilPersen) {
        const d = ini - lalu;
        const tanda = d > 0 ? "+" : d < 0 ? "−" : "";
        let persen = "";
        if (tampilPersen && lalu > 0) {
            const p = (d / lalu) * 100;
            persen = (p > 0 ? "+" : p < 0 ? "−" : "") + fmt.persen(Math.abs(p));
        }
        return [tanda + fmt.rupiah(Math.abs(d)), persen];
    }

    function tabelBanding(ini, lalu) {
        // kelas warna: penjualan & laba naik = baik; pengeluaran naik = kurang baik
        const baris = [
            { n: "Penjualan", i: ini.penjualan, l: lalu.penjualan, baikNaik: true, persen: true },
            { n: "Pengeluaran", i: ini.pengeluaran, l: lalu.pengeluaran, baikNaik: false, persen: true },
            { n: "Laba sederhana", i: ini.labaSederhana, l: lalu.labaSederhana, baikNaik: true, persen: false }
        ];
        const t = el("table", { class: "responsif padat" });
        t.append(
            el("thead", {}, el("tr", {}, el("th", { teks: "" }), el("th", { class: "nominal", teks: "Bulan ini" }), el("th", { class: "nominal", teks: "Bulan lalu" }), el("th", { class: "nominal", teks: "Selisih" }))),
            el("tbody", {}, baris.map((b) => {
                const d = b.i - b.l;
                const baik = b.baikNaik ? d > 0 : d < 0;
                const buruk = b.baikNaik ? d < 0 : d > 0;
                const td = (lbl, isi, kls) => el("td", { "data-label": lbl, class: kls || false, teks: isi });
                return el("tr", {},
                    td("", b.n),
                    td("Bulan ini", fmt.rupiah(b.i), "nominal"),
                    td("Bulan lalu", fmt.rupiah(b.l), "nominal"),
                    (() => {
                        const [rp, pr] = selisihTeks(b.i, b.l, b.persen);
                        const c = el("td", { "data-label": "Selisih", class: "nominal " + (baik ? "positif" : buruk ? "negatif" : "") }, rp);
                        if (pr) c.append(el("br"), el("small", { teks: pr }));
                        return c;
                    })());
            }))
        );
        return el("div", { class: "tabel-bungkus" }, t);
    }

    function daftarTerbaru(ctx) {
        const w = $("terbaru");
        w.replaceChildren();
        const semua = WL.data.gabungan(ctx).sort(WL.data.urutTerbaru).slice(0, 8);
        if (!semua.length) {
            w.innerHTML = '<div class="keadaan-kosong"><strong>Belum ada transaksi</strong>Catatan yang Anda simpan akan muncul di sini.</div>';
            return;
        }
        const t = el("table", { class: "responsif" });
        t.append(
            el("thead", {}, el("tr", {}, el("th", { teks: "Tanggal" }), el("th", { teks: "Jenis" }), el("th", { teks: "Keterangan" }), el("th", { class: "nominal", teks: "Nominal" }))),
            el("tbody", {}, semua.map((r) => {
                const masuk = r.arah === "masuk";
                const ket = [r.kategori, r.keterangan].filter(Boolean).join(" · ") || "—";
                return el("tr", {},
                    el("td", { "data-label": "Tanggal", class: "tanggal-sel", teks: fmt.tanggal(r.tanggal) }),
                    el("td", { "data-label": "Jenis" }, el("span", { class: "lencana " + r.jenis, teks: WL.JENIS_LABEL[r.jenis] })),
                    el("td", { "data-label": "Keterangan", teks: ket }),
                    el("td", { "data-label": "Nominal", class: "nominal " + (masuk ? "masuk" : "keluar"), teks: (masuk ? "+" : "−") + fmt.rupiah(r.nominal) }));
            }))
        );
        w.append(el("div", { class: "tabel-bungkus" }, t));
    }

    function bannerPeringatan(ctx, adaData) {
        const w = $("areaBanner");
        w.replaceChildren();
        if (!adaData) return;
        if (WL.data.bacaTeks(WL.KUNCI.profil) === null) {
            const isi = el("span", {}, "Saldo kas awal belum diisi, jadi saldo kas dianggap mulai dari Rp0. ", el("a", { href: "profil.html", teks: "Isi di Profil Usaha" }), ".");
            w.append(UI.banner({ tipe: "peringatan", ikon: "info", isi }));
        }
        const t = WL.cadangan.terakhir();
        const hari = t ? (Date.now() - Date.parse(t)) / 86400000 : Infinity;
        if (hari > 14) {
            const teks = t ? "Cadangan terakhir diunduh lebih dari 2 minggu lalu. " : "Anda belum pernah mengunduh cadangan data. ";
            const isi = el("span", {}, teks + "Data hanya ada di browser ini, jadi sebaiknya dicadangkan. ", el("a", { href: "profil.html", teks: "Buka Cadangan Data" }), ".");
            w.append(UI.banner({ tipe: "peringatan", ikon: "peringatan", isi }));
        }
    }

    function render() {
        const ctx = WL.data.muat();
        const adaData = WL.data.adaData(ctx);
        const hari = tgl.hariIni();
        const { y, m } = tgl.pecah(hari);
        $("tanggalHariIni").textContent = fmt.tanggalLengkap(hari);
        $("sambutan").hidden = adaData;
        bannerPeringatan(ctx, adaData);

        // --- Hari ini
        const rh = hitung.ringkasan(hari, hari, ctx);
        isiKartu("kPenjHari", rh.penjualan, rh.jumlahCatatan.penjualan + " catatan");
        isiKartu("kPengHari", rh.pengeluaran, rh.jumlahCatatan.pengeluaran + " catatan");
        isiKartu("kLabaHari", rh.labaSederhana, statusLaba(rh.labaSederhana), UI.kelasLaba(rh.labaSederhana));
        const saldo = hitung.saldoKasTerkini(ctx);
        isiKartu("kSaldo", saldo, "Saldo awal + penjualan + modal − pengeluaran − prive", UI.kelasLaba(saldo));

        // --- Bulan berjalan & bulan lalu
        const g = tgl.geserBulan(y, m, -1);
        const rb = hitung.ringkasan(tgl.awalBulan(y, m), tgl.akhirBulan(y, m), ctx);
        const rl = hitung.ringkasan(tgl.awalBulan(g.y, g.m), tgl.akhirBulan(g.y, g.m), ctx);
        $("judulBulan").textContent = "Bulan ini · " + fmt.bulanTahun(y, m);
        isiKartu("kPenjBulan", rb.penjualan, rb.jumlahCatatan.penjualan + " catatan");
        isiKartu("kPengBulan", rb.pengeluaran, rb.jumlahCatatan.pengeluaran + " catatan");
        isiKartu("kLabaBulan", rb.labaSederhana, statusLaba(rb.labaSederhana), UI.kelasLaba(rb.labaSederhana));

        const info = $("infoHpp");
        if (rb.hpp > 0) {
            info.hidden = false;
            info.textContent = "Estimasi HPP bulan ini (pembelian bahan baku): " + fmt.rupiah(rb.hpp) +
                (rb.persenHpp !== null ? " atau " + fmt.persen(rb.persenHpp) + " dari penjualan" : "") + ". Rincian ada di Laporan → Laba Rugi.";
        } else info.hidden = true;

        // --- Perbandingan
        $("subBanding").textContent = "Bulan ini sampai " + fmt.tanggal(hari) + " · bulan lalu satu bulan penuh";
        const wb = $("banding");
        wb.replaceChildren(tabelBanding(rb, rl));
        wb.append(el("p", { class: "teks-bantu", style: "margin-top:12px", teks: "Di awal bulan, angka bulan ini wajar lebih kecil karena baru berjalan beberapa hari." }));

        // --- Grafik 6 bulan
        const label = [], pj = [], pg = [];
        for (let i = 5; i >= 0; i--) {
            const b = tgl.geserBulan(y, m, -i);
            const r = hitung.ringkasan(tgl.awalBulan(b.y, b.m), tgl.akhirBulan(b.y, b.m), ctx);
            label.push(WL.BULAN_SINGKAT[b.m - 1] + (b.y !== y ? " " + String(b.y).slice(2) : ""));
            pj.push(r.penjualan); pg.push(r.pengeluaran);
        }
        const wg = $("grafik");
        if (pj.every((v) => v === 0) && pg.every((v) => v === 0)) {
            wg.innerHTML = '<div class="keadaan-kosong"><strong>Belum ada data untuk digambar</strong>Grafik muncul otomatis setelah ada penjualan atau pengeluaran dalam 6 bulan terakhir.</div>';
        } else {
            wg.innerHTML = UI.grafikBatang({
                label,
                seri: [{ nama: "Penjualan", warna: "#2563eb", nilai: pj }, { nama: "Pengeluaran", warna: "#ef6f61", nilai: pg }],
                ringkasan: "Grafik batang penjualan dan pengeluaran per bulan selama 6 bulan terakhir"
            });
        }

        daftarTerbaru(ctx);
    }

    window.addEventListener("storage", render);
    render();
})();
