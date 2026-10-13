/* =====================================================================
   laporan.js — Laporan Penjualan, Pengeluaran, Laba Rugi, Arus Kas,
   dan Arsip Bulanan. Setiap laporan dibuat sebagai "model" data lalu
   ditampilkan, dicetak, dan diekspor ke CSV dari model yang SAMA,
   sehingga isi layar, cetakan, dan CSV tidak bisa berbeda.
   ===================================================================== */
(function () {
    "use strict";
    const WL = window.WL;
    const UI = WL.UI;
    const { esc } = UI;
    const { fmt, tgl, hitung } = WL;
    const $ = (id) => document.getElementById(id);

    const TAB = {
        penjualan: "Laporan Penjualan",
        pengeluaran: "Laporan Pengeluaran",
        labarugi: "Laporan Laba Rugi Sederhana",
        aruskas: "Laporan Arus Kas",
        arsip: "Arsip Bulanan"
    };

    const awal = UI.rentang("bulanIni");
    const hariIni = tgl.pecah(tgl.hariIni());
    const state = {
        tab: "penjualan",
        dari: awal.dari, sampai: awal.sampai,
        bulan: hariIni.m, tahun: hariIni.y,
        model: null
    };
    const hash = location.hash.replace("#", "");
    if (TAB[hash]) state.tab = hash;

    $("tombolCetak").innerHTML = UI.ikon("cetak", 18) + "<span>Cetak / Simpan PDF</span>";
    $("tombolCsv").innerHTML = UI.ikon("unduh", 18) + "<span>Unduh CSV</span>";

    /* ---------- Pembantu ---------- */
    const denganUrut = (arr) => arr.map((r, i) => Object.assign({ urut: i }, r));
    const kelasLaba = UI.kelasLaba;

    /* ---------- Model laporan ---------- */
    function modelPenjualan(ctx) {
        const data = hitung.dalamRentang(denganUrut(ctx.P), state.dari, state.sampai).sort(WL.data.urutLama);
        return {
            judul: TAB.penjualan, periode: fmt.periode(state.dari, state.sampai),
            bagian: [{
                tipe: "tabel",
                kolom: [{ label: "Tanggal", jenis: "tanggal" }, { label: "Keterangan", jenis: "teks" }, { label: "Nominal", jenis: "rupiah" }],
                baris: data.map((r) => [r.tanggal, r.keterangan, r.nominal]),
                jumlah: ["Total penjualan (" + data.length + " catatan)", "", hitung.jumlah(data)],
                kosong: "Tidak ada penjualan pada periode ini."
            }]
        };
    }

    function tabelRekapKategori(r) {
        return {
            tipe: "tabel", judul: "Rekap per kategori",
            kolom: [{ label: "Kategori", jenis: "teks" }, { label: "Nominal", jenis: "rupiah" }, { label: "Porsi", jenis: "persen" }],
            baris: r.perKategori.map((k) => [k.kategori, k.nominal, r.pengeluaran > 0 ? k.persen : null]),
            jumlah: ["Total", r.pengeluaran, r.pengeluaran > 0 ? 100 : null]
        };
    }

    function modelPengeluaran(ctx) {
        const data = hitung.dalamRentang(denganUrut(ctx.E), state.dari, state.sampai).sort(WL.data.urutLama);
        const r = hitung.ringkasan(state.dari, state.sampai, ctx);
        return {
            judul: TAB.pengeluaran, periode: fmt.periode(state.dari, state.sampai),
            bagian: [
                {
                    tipe: "tabel",
                    kolom: [{ label: "Tanggal", jenis: "tanggal" }, { label: "Kategori", jenis: "teks" }, { label: "Keterangan", jenis: "teks" }, { label: "Nominal", jenis: "rupiah" }],
                    baris: data.map((x) => [x.tanggal, x.kategori, x.keterangan, x.nominal]),
                    jumlah: ["Total pengeluaran (" + data.length + " catatan)", "", "", hitung.jumlah(data)],
                    kosong: "Tidak ada pengeluaran pada periode ini."
                },
                tabelRekapKategori(r)
            ]
        };
    }

    function modelLabaRugi(ctx) {
        const r = hitung.ringkasan(state.dari, state.sampai, ctx);
        const lain = r.perKategori.slice(1);
        const bagian = [
            {
                tipe: "kv", judul: "Laba rugi sederhana",
                baris: [
                    { label: "Total penjualan", nilai: r.penjualan, gaya: "tebal" },
                    { label: "Pengeluaran operasional", gaya: "judul-baris" }
                ].concat(
                    r.perKategori.map((k) => ({ label: k.kategori, nilai: k.nominal, gaya: "sub" })),
                    [
                        { label: "Total pengeluaran operasional", nilai: r.pengeluaran, gaya: "tebal" },
                        { label: "Laba / Rugi sederhana", nilai: r.labaSederhana, gaya: "total", warna: true }
                    ]
                )
            },
            {
                tipe: "catatan",
                teks: "Laba sederhana = total penjualan − total pengeluaran operasional (semua 7 kategori). Modal (" + fmt.rupiah(r.modal) + ") dan prive (" + fmt.rupiah(r.prive) + ") pada periode ini tidak dihitung di sini karena modal bukan penjualan dan prive bukan pengeluaran operasional."
            },
            {
                tipe: "kv", judul: "Laba setelah HPP (estimasi)",
                baris: [
                    { label: "Total penjualan", nilai: r.penjualan, gaya: "tebal" },
                    { label: "HPP: pembelian bahan baku", nilai: r.hpp, gaya: "sub" },
                    { label: "Laba kotor (penjualan − HPP)", nilai: r.labaKotor, gaya: "tebal", warna: true },
                    { label: "Biaya operasional lain (" + lain.map((k) => k.kategori).join(", ") + ")", nilai: r.biayaLain, gaya: "sub" },
                    { label: "Laba setelah HPP", nilai: r.labaSetelahHpp, gaya: "total", warna: true },
                    { label: "HPP sebagai persen dari penjualan", nilai: r.persenHpp, jenis: "persen", gaya: "sub" }
                ]
            },
            {
                tipe: "catatan",
                teks: "HPP di sini adalah ESTIMASI: seluruh pembelian bahan baku pada periode dianggap terpakai pada periode yang sama (stok bahan di awal dan akhir periode tidak dihitung). Pembelian bahan baku hanya dihitung satu kali, sebagai HPP; karena itu laba setelah HPP bernilai sama dengan laba sederhana, hanya cara penyajiannya yang berbeda. Gunanya untuk melihat berapa persen penjualan terserap bahan baku."
            }
        ];
        return { judul: TAB.labarugi, periode: fmt.periode(state.dari, state.sampai), bagian };
    }

    function modelArusKas(ctx) {
        const r = hitung.ringkasan(state.dari, state.sampai, ctx);
        const profil = ctx.profil;
        const masuk = r.penjualan + r.modal;
        const keluar = r.pengeluaran + r.prive;
        const penjelasanAwal = state.dari
            ? "Saldo awal periode = Saldo Kas Awal di Profil Usaha (" + fmt.rupiah(profil.saldoKasAwal) + ") ditambah seluruh transaksi sebelum " + fmt.tanggal(state.dari) + ". Saldo akhir periode ini otomatis menjadi saldo awal periode berikutnya."
            : "Karena periode dimulai dari awal pencatatan, saldo awal = Saldo Kas Awal di Profil Usaha (" + fmt.rupiah(profil.saldoKasAwal) + ").";
        return {
            judul: TAB.aruskas, periode: fmt.periode(state.dari, state.sampai),
            bagian: [
                {
                    tipe: "kv", judul: "Arus kas",
                    baris: [
                        { label: "Saldo awal periode", nilai: r.saldoAwal, gaya: "tebal" },
                        { label: "Kas masuk", gaya: "judul-baris" },
                        { label: "Penjualan", nilai: r.penjualan, gaya: "sub" },
                        { label: "Modal", nilai: r.modal, gaya: "sub" },
                        { label: "Total kas masuk", nilai: masuk, gaya: "tebal" },
                        { label: "Kas keluar", gaya: "judul-baris" },
                        { label: "Pengeluaran operasional", nilai: r.pengeluaran, gaya: "sub" },
                        { label: "Prive", nilai: r.prive, gaya: "sub" },
                        { label: "Total kas keluar", nilai: keluar, gaya: "tebal" },
                        { label: "Perubahan kas (masuk − keluar)", nilai: masuk - keluar, gaya: "tebal", warna: true },
                        { label: "Saldo akhir periode", nilai: r.saldoAkhir, gaya: "total", warna: true }
                    ]
                },
                { tipe: "catatan", teks: "Saldo akhir = saldo awal + penjualan + modal − pengeluaran operasional − prive. " + penjelasanAwal }
            ]
        };
    }

    function modelArsip(ctx) {
        const y = state.tahun, m = state.bulan;
        const dari = tgl.awalBulan(y, m), sampai = tgl.akhirBulan(y, m);
        const r = hitung.ringkasan(dari, sampai, ctx);
        const pb = hitung.perBulan(y, ctx);

        const rata = hitung.rataHarian(r.penjualan, y, m);
        const hariDipakai = tgl.hariTerhitung(y, m);
        const berdata = pb.filter((b) => b.penjualan > 0);
        let tertinggi = null;
        if (berdata.length >= 2) tertinggi = berdata.reduce((a, b) => (b.penjualan > a.penjualan ? b : a));

        const transaksi = WL.data.gabungan(ctx, dari, sampai).sort(WL.data.urutLama);
        const totMasuk = transaksi.filter((t) => t.arah === "masuk").reduce((a, t) => a + t.nominal, 0);
        const totKeluar = transaksi.filter((t) => t.arah === "keluar").reduce((a, t) => a + t.nominal, 0);

        return {
            judul: "Arsip Bulanan: " + fmt.bulanTahun(y, m), periode: fmt.bulanTahun(y, m),
            bagian: [
                {
                    tipe: "kv", judul: "Ringkasan " + fmt.bulanTahun(y, m),
                    baris: [
                        { label: "Saldo awal bulan", nilai: r.saldoAwal, gaya: "tebal" },
                        { label: "Penjualan", nilai: r.penjualan, gaya: "sub" },
                        { label: "Pengeluaran", nilai: r.pengeluaran, gaya: "sub" },
                        { label: "Laba / Rugi sederhana", nilai: r.labaSederhana, gaya: "tebal", warna: true },
                        { label: "Modal", nilai: r.modal, gaya: "sub" },
                        { label: "Prive", nilai: r.prive, gaya: "sub" },
                        { label: "Saldo akhir bulan", nilai: r.saldoAkhir, gaya: "total", warna: true }
                    ]
                },
                {
                    tipe: "statistik",
                    item: [
                        {
                            label: "Rata-rata penjualan harian",
                            teks: rata === null ? "—" : fmt.rupiah(rata), nilai: rata === null ? null : Math.round(rata),
                            catatan: rata === null ? "Bulan ini belum dimulai." : "Total penjualan bulan ÷ " + hariDipakai + " hari" + (y === hariIni.y && m === hariIni.m ? " (bulan berjalan: dihitung sampai hari ini)" : " (jumlah hari dalam bulan)") + ". Hari tanpa penjualan tetap dihitung."
                        },
                        {
                            label: "Bulan penjualan tertinggi tahun " + y,
                            teks: tertinggi ? WL.BULAN[tertinggi.bulan - 1] + " · " + fmt.rupiah(tertinggi.penjualan) : "Belum cukup data",
                            nilai: tertinggi ? tertinggi.penjualan : null,
                            catatan: tertinggi ? "Dari " + berdata.length + " bulan yang punya penjualan." : "Perlu penjualan di minimal 2 bulan pada tahun " + y + "."
                        }
                    ]
                },
                {
                    tipe: "grafik", judul: "Tren bulanan " + y,
                    label: WL.BULAN_SINGKAT.slice(),
                    seri: [{ nama: "Penjualan", warna: "#2563eb", nilai: pb.map((b) => b.penjualan) }, { nama: "Pengeluaran", warna: "#ef6f61", nilai: pb.map((b) => b.pengeluaran) }],
                    kosong: "Belum ada penjualan atau pengeluaran pada tahun " + y + "."
                },
                {
                    tipe: "tabel", judul: "Perbandingan antarbulan " + y,
                    kolom: [{ label: "Bulan", jenis: "teks" }, { label: "Penjualan", jenis: "rupiah" }, { label: "Pengeluaran", jenis: "rupiah" }, { label: "Laba sederhana", jenis: "rupiah", warna: true }],
                    baris: pb.map((b) => [WL.BULAN[b.bulan - 1], b.penjualan, b.pengeluaran, b.labaSederhana]),
                    jumlah: ["Total " + y, pb.reduce((a, b) => a + b.penjualan, 0), pb.reduce((a, b) => a + b.pengeluaran, 0), pb.reduce((a, b) => a + b.labaSederhana, 0)]
                },
                {
                    tipe: "tabel", judul: "Riwayat transaksi " + fmt.bulanTahun(y, m),
                    kolom: [{ label: "Tanggal", jenis: "tanggal" }, { label: "Jenis", jenis: "teks" }, { label: "Kategori / Keterangan", jenis: "teks" }, { label: "Masuk", jenis: "rupiah" }, { label: "Keluar", jenis: "rupiah" }],
                    baris: transaksi.map((t) => [t.tanggal, WL.JENIS_LABEL[t.jenis], [t.kategori, t.keterangan].filter(Boolean).join(" · "), t.arah === "masuk" ? t.nominal : null, t.arah === "keluar" ? t.nominal : null]),
                    jumlah: ["Total", "", "", totMasuk, totKeluar],
                    kosong: "Tidak ada transaksi pada " + fmt.bulanTahun(y, m) + "."
                }
            ]
        };
    }

    function buatModel(ctx) {
        return { penjualan: modelPenjualan, pengeluaran: modelPengeluaran, labarugi: modelLabaRugi, aruskas: modelArusKas, arsip: modelArsip }[state.tab](ctx);
    }

    /* ---------- Tampilan model ---------- */
    function teksSel(kol, v, adalahJumlah) {
        if (v === null || v === undefined || v === "") return adalahJumlah ? "" : (kol.jenis === "teks" ? "—" : "");
        if (typeof v === "number") return kol.jenis === "persen" ? fmt.persen(v) : fmt.rupiah(v);
        if (kol.jenis === "tanggal" && tgl.isoValid(v)) return fmt.tanggal(v);
        return String(v);
    }
    function htmlSel(kol, v, adalahJumlah) {
        const angka = kol.jenis === "rupiah" || kol.jenis === "persen";
        const kelas = [angka ? "nominal" : "", kol.jenis === "tanggal" ? "tanggal-sel" : "", kol.warna && typeof v === "number" ? kelasLaba(v) : ""].filter(Boolean).join(" ");
        return '<td data-label="' + esc(kol.label) + '"' + (kelas ? ' class="' + kelas + '"' : "") + ">" + esc(teksSel(kol, v, adalahJumlah)) + "</td>";
    }

    function htmlBagian(b) {
        const judul = b.judul ? '<h3 class="sub-judul">' + esc(b.judul) + "</h3>" : "";
        if (b.tipe === "tabel") {
            let h = judul + '<div class="tabel-bungkus"><table class="responsif"><thead><tr>' +
                b.kolom.map((k) => "<th" + (k.jenis === "rupiah" || k.jenis === "persen" ? ' class="nominal"' : "") + ">" + esc(k.label) + "</th>").join("") +
                "</tr></thead><tbody>" +
                b.baris.map((r) => "<tr>" + r.map((v, i) => htmlSel(b.kolom[i], v, false)).join("") + "</tr>").join("") + "</tbody>";
            if (b.jumlah) h += "<tfoot><tr>" + b.jumlah.map((v, i) => htmlSel(b.kolom[i], v, true)).join("") + "</tr></tfoot>";
            h += "</table></div>";
            if (!b.baris.length && b.kosong) h += '<p class="kosong">' + esc(b.kosong) + "</p>";
            return h;
        }
        if (b.tipe === "kv") {
            return judul + '<div class="tabel-bungkus"><table class="tabel-kv"><tbody>' + b.baris.map((r) => {
                const nilai = r.nilai === undefined || r.nilai === null ? "" : (r.jenis === "persen" ? fmt.persen(r.nilai) : fmt.rupiah(r.nilai));
                const warna = r.warna && typeof r.nilai === "number" ? kelasLaba(r.nilai) : "";
                return '<tr class="' + esc(r.gaya || "") + '"><td>' + esc(r.label) + '</td><td class="kv-nilai ' + warna + '">' + esc(nilai) + "</td></tr>";
            }).join("") + "</tbody></table></div>";
        }
        if (b.tipe === "catatan") return '<p class="catatan-laporan">' + esc(b.teks) + "</p>";
        if (b.tipe === "statistik") {
            return '<div class="statistik">' + b.item.map((s) => '<div class="kartu"><div class="kartu-atas"><span>' + esc(s.label) + "</span></div><h2>" + esc(s.teks) + "</h2><p>" + esc(s.catatan) + "</p></div>").join("") + "</div>";
        }
        if (b.tipe === "grafik") {
            const kosong = b.seri.every((s) => s.nilai.every((v) => v === 0));
            return judul + (kosong
                ? '<div class="keadaan-kosong"><strong>Belum ada data untuk digambar</strong>' + esc(b.kosong) + "</div>"
                : UI.grafikBatang({ label: b.label, seri: b.seri, ringkasan: b.judul + ": penjualan dan pengeluaran per bulan" }));
        }
        return "";
    }

    function kepalaCetak(model, profil) {
        return '<div class="kepala-cetak"><h1>' + esc(profil.namaUsaha || "Warung Laporan") + "</h1>" +
            (profil.alamat ? "<p>" + esc(profil.alamat) + "</p>" : "") +
            (profil.telepon ? "<p>Telp. " + esc(profil.telepon) + "</p>" : "") +
            '<p style="margin-top:8px"><strong>' + esc(model.judul) + "</strong> · Periode: " + esc(model.periode) + "</p>" +
            "<p>Dicetak pada " + esc(fmt.tanggalPanjang(tgl.hariIni())) + "</p></div>";
    }

    /* ---------- Render ---------- */
    function sinkronkanFilter() {
        const arsip = state.tab === "arsip";
        $("filterRentang").hidden = arsip;
        $("filterArsip").hidden = !arsip;
        document.querySelectorAll("#tabLaporan .tab").forEach((t) => {
            const aktif = t.dataset.tab === state.tab;
            t.setAttribute("aria-selected", String(aktif));
            t.tabIndex = aktif ? 0 : -1;
        });
        $("rDari").value = state.dari;
        $("rSampai").value = state.sampai;
        chips.tandai(state.dari, state.sampai);
    }

    function render() {
        sinkronkanFilter();
        const ctx = WL.data.muat();
        const area = $("areaLaporan");
        const rentangSalah = state.tab !== "arsip" && state.dari && state.sampai && state.dari > state.sampai;
        $("infoRentang").textContent = rentangSalah
            ? "Tanggal awal tidak boleh setelah tanggal akhir. Perbaiki rentang tanggal."
            : "Laporan untuk: " + fmt.periode(state.dari, state.sampai);
        $("tombolCetak").disabled = $("tombolCsv").disabled = !!rentangSalah;

        if (rentangSalah) {
            state.model = null;
            area.innerHTML = '<div class="keadaan-kosong"><strong>Rentang tanggal belum benar</strong>Tanggal awal harus sebelum atau sama dengan tanggal akhir.</div>';
            return;
        }
        // daftar tahun untuk Arsip
        if (state.tab === "arsip") isiPilihanArsip(ctx);

        const model = buatModel(ctx);
        state.model = model;
        area.setAttribute("aria-label", model.judul);
        area.innerHTML = kepalaCetak(model, ctx.profil) +
            '<h2 class="sub-judul" style="font-size:19px;margin-top:0">' + esc(model.judul) + "</h2>" +
            '<p class="teks-bantu tanpa-cetak" style="margin-bottom:14px">Periode: ' + esc(model.periode) + "</p>" +
            model.bagian.map(htmlBagian).join("");
    }

    /* ---------- Kontrol ---------- */
    const chips = UI.buatChips($("chipsLaporan"), ["hariIni", "bulanIni", "bulanLalu", "tahunIni", "semua"], (kode, r) => {
        state.dari = r.dari; state.sampai = r.sampai; render();
    });
    $("rDari").addEventListener("change", () => { state.dari = $("rDari").value; render(); });
    $("rSampai").addEventListener("change", () => { state.sampai = $("rSampai").value; render(); });

    $("aBulan").innerHTML = WL.BULAN.map((b, i) => '<option value="' + (i + 1) + '">' + b + "</option>").join("");
    function isiPilihanArsip(ctx) {
        const tahun = WL.data.tahunTersedia(ctx);
        if (tahun.indexOf(state.tahun) < 0) tahun.push(state.tahun);
        tahun.sort((a, b) => b - a);
        $("aTahun").innerHTML = tahun.map((t) => '<option value="' + t + '">' + t + "</option>").join("");
        $("aTahun").value = String(state.tahun);
        $("aBulan").value = String(state.bulan);
    }
    $("aBulan").addEventListener("change", () => { state.bulan = Number($("aBulan").value); render(); });
    $("aTahun").addEventListener("change", () => { state.tahun = Number($("aTahun").value); render(); });

    function pilihTab(k) {
        state.tab = k;
        if (history.replaceState) history.replaceState(null, "", "#" + k);
        render();
    }
    document.querySelectorAll("#tabLaporan .tab").forEach((t) => {
        t.addEventListener("click", () => pilihTab(t.dataset.tab));
        t.addEventListener("keydown", (e) => {
            const urut = Object.keys(TAB);
            const i = urut.indexOf(t.dataset.tab);
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const k = urut[(i + (e.key === "ArrowRight" ? 1 : urut.length - 1)) % urut.length];
                pilihTab(k);
                document.querySelector('#tabLaporan .tab[data-tab="' + k + '"]').focus();
            }
        });
    });

    /* ---------- Cetak ---------- */
    $("tombolCetak").addEventListener("click", () => {
        if (!state.model) return;
        const judulLama = document.title;
        document.title = state.model.judul + " - " + state.model.periode;
        const pulih = () => { document.title = judulLama; window.removeEventListener("afterprint", pulih); };
        window.addEventListener("afterprint", pulih);
        window.print();
    });

    /* ---------- CSV ---------- */
    function nilaiCsv(kol, v) {
        if (v === null || v === undefined) return "";
        if (typeof v === "number") return kol && kol.jenis === "persen" ? Math.round(v * 10) / 10 : v;
        return v;
    }
    function barisCsv(model, profil) {
        const baris = [[profil.namaUsaha || "Warung Laporan"], [model.judul], ["Periode", model.periode], ["Dibuat pada", tgl.hariIni()], []];
        model.bagian.forEach((b) => {
            if (b.tipe === "tabel") {
                if (b.judul) baris.push([b.judul]);
                baris.push(b.kolom.map((k) => k.label));
                b.baris.forEach((r) => baris.push(r.map((v, i) => nilaiCsv(b.kolom[i], v))));
                if (b.jumlah) baris.push(b.jumlah.map((v, i) => nilaiCsv(b.kolom[i], v)));
                baris.push([]);
            } else if (b.tipe === "kv") {
                if (b.judul) baris.push([b.judul]);
                b.baris.forEach((r) => baris.push([r.label, r.nilai === undefined ? "" : nilaiCsv({ jenis: r.jenis }, r.nilai)]));
                baris.push([]);
            } else if (b.tipe === "statistik") {
                b.item.forEach((s) => baris.push([s.label, s.nilai === null ? s.teks : s.nilai, s.catatan]));
                baris.push([]);
            } else if (b.tipe === "catatan") {
                baris.push(["Catatan", b.teks]);
                baris.push([]);
            }
        });
        return baris;
    }
    $("tombolCsv").addEventListener("click", () => {
        if (!state.model) return;
        const ctx = WL.data.muat();
        const akhiran = state.tab === "arsip" ? state.tahun + "-" + String(state.bulan).padStart(2, "0") : (state.dari || "awal") + "_sd_" + (state.sampai || "akhir");
        UI.unduhTeks("warung-laporan-" + state.tab + "-" + akhiran + ".csv", UI.buatCsv(barisCsv(state.model, ctx.profil)), "text/csv;charset=utf-8");
        UI.toast("File CSV diunduh.");
    });

    window.addEventListener("hashchange", () => {
        const k = location.hash.replace("#", "");
        if (TAB[k] && k !== state.tab) { state.tab = k; render(); }
    });
    window.addEventListener("storage", render);
    render();
})();
