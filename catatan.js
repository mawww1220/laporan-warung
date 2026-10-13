/* =====================================================================
   catatan.js — Halaman catatan serbaguna (tambah, lihat, ubah, hapus,
   filter, total) yang dipakai oleh Penjualan, Pengeluaran, Modal, dan Prive.
   Satu kode untuk keempatnya = perilaku pasti sama.
   ===================================================================== */
(function () {
    "use strict";
    const WL = window.WL;
    const { el, esc, ikon } = WL.UI;
    const UI = WL.UI;

    UI.halamanCatatan = function (cfg) {
        const akar = cfg.akar;
        const J = cfg.jenis;
        const bisaKategori = !!cfg.kategori;
        const id = (n) => "f-" + J + "-" + n;
        const state = { ubahId: null, dari: "", sampai: "", kategori: "", terkunci: false, tanggalTerakhir: WL.tgl.hariIni() };

        /* ---------- Kerangka HTML (tanpa data pengguna) ---------- */
        akar.innerHTML =
            '<div data-k="banner"></div>' +
            '<section class="ringkasan dua">' +
            UI.kartu({ label: cfg.labelTotal, ikon: cfg.ikon, warna: cfg.warna, id: id("total"), catatan: "" }) +
            UI.kartu({ label: "Jumlah catatan", ikon: "catatan", warna: "ungu", id: id("jumlah"), catatan: "" }) +
            "</section>" +

            '<section class="panel" data-k="panelForm">' +
            '<h3 data-k="judulForm"></h3>' +
            '<p class="teks-bantu">' + esc(cfg.teksBantu) + "</p>" +
            '<form class="formulir" data-k="form" novalidate>' +
            '<div class="isian"><label for="' + id("tanggal") + '">Tanggal</label>' +
            '<input type="date" data-k="tanggal" id="' + id("tanggal") + '" min="2000-01-01" max="' + WL.tgl.hariIni() + '" required>' +
            '<div class="galat-isian" data-g="tanggal" id="' + id("g-tanggal") + '" role="alert"></div></div>' +

            (bisaKategori
                ? '<div class="isian"><label for="' + id("kategori") + '">Kategori</label>' +
                  '<select data-k="kategori" id="' + id("kategori") + '" required><option value="">Pilih kategori</option>' +
                  WL.KATEGORI.map((k) => "<option>" + esc(k) + "</option>").join("") + "</select>" +
                  '<div class="galat-isian" data-g="kategori" id="' + id("g-kategori") + '" role="alert"></div></div>'
                : "") +

            '<div class="isian"><label for="' + id("nominal") + '">' + esc(cfg.labelNominal) + "</label>" +
            '<div class="awalan"><span aria-hidden="true">Rp</span><input type="text" data-k="nominal" id="' + id("nominal") + '" placeholder="Contoh: 150.000" required></div>' +
            '<div class="galat-isian" data-g="nominal" id="' + id("g-nominal") + '" role="alert"></div></div>' +

            '<div class="isian penuh"><label for="' + id("ket") + '">Keterangan <span class="opsional">(boleh dikosongkan)</span></label>' +
            '<input type="text" data-k="keterangan" id="' + id("ket") + '" maxlength="120" placeholder="' + esc(cfg.placeholderKet) + '" autocomplete="off">' +
            '<div class="galat-isian" data-g="keterangan" id="' + id("g-keterangan") + '" role="alert"></div></div>' +

            '<div class="aksi-formulir penuh">' +
            '<button type="submit" class="tombol" data-k="simpan"></button>' +
            '<button type="button" class="tombol sekunder" data-k="batalUbah" hidden>Batal ubah</button></div>' +
            "</form>" +
            '<p class="pesan-inline galat" data-k="pesan" role="alert"></p>' +
            "</section>" +

            '<section class="panel">' +
            '<div class="panel-header"><div><h3>Riwayat ' + esc(cfg.kata) + "</h3><p>" + esc(cfg.teksRiwayat) + "</p></div></div>" +
            '<div data-k="chips" style="margin-top:14px"></div>' +
            '<div class="filter">' +
            '<div class="isian"><label for="' + id("dari") + '">Dari tanggal</label><input type="date" data-k="dari" id="' + id("dari") + '"></div>' +
            '<div class="isian"><label for="' + id("sampai") + '">Sampai tanggal</label><input type="date" data-k="sampai" id="' + id("sampai") + '"></div>' +
            (bisaKategori
                ? '<div class="isian lebar"><label for="' + id("fkat") + '">Kategori</label><select data-k="fkategori" id="' + id("fkat") + '"><option value="">Semua kategori</option>' +
                  WL.KATEGORI.map((k) => "<option>" + esc(k) + "</option>").join("") + "</select></div>"
                : "") +
            "</div>" +
            '<p class="info-filter" data-k="infoFilter" role="status"></p>' +
            '<div data-k="rekap"></div>' +
            '<div class="tabel-bungkus" data-k="tabelUtama"><table class="responsif"><thead><tr>' +
            "<th>Tanggal</th>" + (bisaKategori ? "<th>Kategori</th>" : "") + "<th>Keterangan</th>" +
            '<th class="nominal">Nominal</th><th><span class="sr-only">Aksi</span></th></tr></thead>' +
            '<tbody data-k="tubuh"></tbody></table></div>' +
            '<p class="kosong" data-k="kosong" hidden></p>' +
            "</section>";

        const $ = (n) => akar.querySelector('[data-k="' + n + '"]');
        const $g = (n) => akar.querySelector('[data-g="' + n + '"]');
        const elTotal = akar.querySelector("#" + id("total"));
        const elJumlah = akar.querySelector("#" + id("jumlah"));
        const elTotalCat = akar.querySelector("#" + id("total") + "Cat");
        const elJumlahCat = akar.querySelector("#" + id("jumlah") + "Cat");

        UI.pasangInputRupiah($("nominal"));
        const chips = UI.buatChips($("chips"), ["semua", "hariIni", "bulanIni", "bulanLalu", "tahunIni"], (kode, r) => {
            state.dari = r.dari; state.sampai = r.sampai;
            $("dari").value = r.dari; $("sampai").value = r.sampai;
            render();
        });

        /* ---------- Formulir ---------- */
        function bersihGalat() {
            akar.querySelectorAll("[data-g]").forEach((g) => { g.textContent = ""; });
            akar.querySelectorAll('[aria-invalid="true"]').forEach((i) => i.removeAttribute("aria-invalid"));
            $("pesan").textContent = "";
        }
        function tampilkanGalat(galat) {
            let pertama = null;
            ["tanggal", "kategori", "nominal", "keterangan"].forEach((k) => {
                if (!galat[k]) return;
                const g = $g(k);
                const input = $(k);
                if (g) g.textContent = galat[k];
                if (input) { input.setAttribute("aria-invalid", "true"); if (g) input.setAttribute("aria-describedby", g.id); if (!pertama) pertama = input; }
            });
            if (pertama) pertama.focus();
        }
        function aturForm() {
            const ubah = !!state.ubahId;
            $("judulForm").textContent = (ubah ? "Ubah " : "Tambah ") + cfg.kata;
            $("simpan").textContent = ubah ? "Simpan perubahan" : "Simpan " + cfg.kata;
            $("batalUbah").hidden = !ubah;
            $("panelForm").classList.toggle("mode-ubah", ubah);
        }
        function resetForm() {
            state.ubahId = null;
            $("tanggal").value = state.tanggalTerakhir;
            $("nominal").value = "";
            $("keterangan").value = "";
            if (bisaKategori) $("kategori").value = "";
            bersihGalat();
            aturForm();
        }

        $("form").addEventListener("submit", (e) => {
            e.preventDefault();
            if (state.terkunci) return;
            bersihGalat();
            const isi = {
                tanggal: $("tanggal").value,
                nominal: UI.bacaRupiah($("nominal")),
                keterangan: $("keterangan").value
            };
            if (bisaKategori) isi.kategori = $("kategori").value;

            const sedangUbah = !!state.ubahId;
            const hasil = sedangUbah ? WL.data.ubah(J, state.ubahId, isi) : WL.data.tambah(J, isi);
            if (!hasil.ok) {
                if (hasil.galat) tampilkanGalat(hasil.galat);
                else { $("pesan").textContent = hasil.pesan; UI.toast(hasil.pesan, "galat"); }
                return;
            }
            // cegah pengiriman ganda
            state.terkunci = true;
            $("simpan").disabled = true;
            setTimeout(() => { state.terkunci = false; $("simpan").disabled = false; }, 700);

            state.tanggalTerakhir = hasil.rec.tanggal;
            UI.toast(sedangUbah ? "Perubahan " + cfg.kata + " berhasil disimpan." : cfg.judul + " berhasil disimpan.");
            resetForm();
            render();
        });

        $("batalUbah").addEventListener("click", () => { resetForm(); });

        function mulaiUbah(r) {
            state.ubahId = r.id;
            bersihGalat();
            $("tanggal").value = r.tanggal;
            UI.isiRupiah($("nominal"), r.nominal);
            $("keterangan").value = r.keterangan || "";
            if (bisaKategori) $("kategori").value = r.kategori;
            aturForm();
            const kurang = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            $("panelForm").scrollIntoView({ behavior: kurang ? "auto" : "smooth", block: "start" });
            $("nominal").focus({ preventScroll: true });
        }

        async function mintaHapus(r) {
            const ya = await UI.konfirmasi({
                judul: "Hapus " + cfg.kata + "?",
                pesan: WL.fmt.tanggal(r.tanggal) + " · " + WL.fmt.rupiah(r.nominal) + (r.keterangan ? " · " + r.keterangan : "") + ". Catatan yang dihapus tidak bisa dikembalikan, dan semua laporan ikut berubah.",
                ya: "Hapus", bahaya: true
            });
            if (!ya) return;
            const h = WL.data.hapus(J, r.id);
            if (!h.ok) { UI.toast(h.pesan, "galat"); render(); return; }
            if (state.ubahId === r.id) resetForm();
            UI.toast(cfg.judul + " berhasil dihapus.");
            render();
        }

        /* ---------- Filter ---------- */
        $("dari").addEventListener("change", () => { state.dari = $("dari").value; render(); });
        $("sampai").addEventListener("change", () => { state.sampai = $("sampai").value; render(); });
        if (bisaKategori) $("fkategori").addEventListener("change", () => { state.kategori = $("fkategori").value; render(); });

        /* ---------- Tampilan daftar ---------- */
        function sel(label, isi, kelas) {
            const td = el("td", { "data-label": label, class: kelas || false });
            if (isi && isi.nodeType) td.append(isi); else td.textContent = isi;
            return td;
        }

        function tampilBanner(semua) {
            const w = $("banner");
            w.replaceChildren();
            if (!bisaKategori) return;
            const n = semua.filter((r) => r.perluDitinjau).length;
            if (!n) return;
            const isi = el("div", {}, el("span", { teks: n + " catatan lama dimasukkan ke kategori baru dan ditandai \"Dulu: …\". Periksa, lalu ubah kategorinya jika kurang tepat. " }),
                el("button", { type: "button", class: "tautan", teks: "Tandai semua sudah diperiksa", onclick: () => { const h = WL.data.tandaiDiperiksa(); if (h.ok) { UI.toast("Penanda dihapus."); render(); } else UI.toast(h.pesan, "galat"); } }));
            w.append(UI.banner({ tipe: "peringatan", ikon: "info", isi }));
        }

        function tampilRekap(dalamTanggal) {
            const w = $("rekap");
            w.replaceChildren();
            if (!cfg.rekap) return;
            const total = WL.hitung.jumlah(dalamTanggal);
            const baris = WL.KATEGORI.map((k) => {
                const n = WL.hitung.jumlah(dalamTanggal.filter((r) => r.kategori === k));
                return { k, n, p: total > 0 ? (n / total) * 100 : 0 };
            });
            const tabel = el("table", { class: "responsif" });
            tabel.append(
                el("thead", {}, el("tr", {}, el("th", { teks: "Kategori" }), el("th", { class: "nominal", teks: "Nominal" }), el("th", { class: "nominal", teks: "Porsi" }))),
                el("tbody", {}, baris.map((b) => el("tr", {}, sel("Kategori", b.k), sel("Nominal", WL.fmt.rupiah(b.n), "nominal"), sel("Porsi", total > 0 ? WL.fmt.persen(b.p) : "—", "nominal")))),
                el("tfoot", {}, el("tr", {}, sel("Kategori", "Total"), sel("Nominal", WL.fmt.rupiah(total), "nominal"), sel("Porsi", total > 0 ? "100%" : "—", "nominal")))
            );
            w.append(el("h3", { class: "sub-judul", teks: "Rekap per kategori" }), el("p", { class: "teks-bantu", teks: "Mengikuti filter tanggal di atas." }), el("div", { class: "tabel-bungkus" }, tabel));
        }

        function render() {
            const semua = WL.data.ambil(J).map((r, i) => Object.assign({ urut: i }, r));
            tampilBanner(semua);
            chips.tandai(state.dari, state.sampai);

            const rentangSalah = state.dari && state.sampai && state.dari > state.sampai;
            const dalamTanggal = rentangSalah ? [] : WL.hitung.dalamRentang(semua, state.dari, state.sampai);
            const tampil = (bisaKategori && state.kategori ? dalamTanggal.filter((r) => r.kategori === state.kategori) : dalamTanggal).slice().sort(WL.data.urutTerbaru);
            const total = WL.hitung.jumlah(tampil);

            elTotal.textContent = WL.fmt.rupiah(total);
            elJumlah.textContent = String(tampil.length);
            const periodeTeks = WL.fmt.periode(state.dari, state.sampai);
            elTotalCat.textContent = periodeTeks + (state.kategori ? " · " + state.kategori : "");
            elJumlahCat.textContent = tampil.length === semua.length ? "Seluruh catatan" : "Dari " + semua.length + " catatan";

            const info = $("infoFilter");
            if (rentangSalah) info.textContent = "Tanggal awal tidak boleh setelah tanggal akhir. Perbaiki rentang tanggal.";
            else info.textContent = "Menampilkan " + tampil.length + " catatan · " + periodeTeks + (state.kategori ? " · " + state.kategori : "");

            tampilRekap(dalamTanggal);

            const tubuh = $("tubuh");
            tubuh.replaceChildren();
            tampil.forEach((r) => {
                const tr = el("tr");
                tr.append(sel("Tanggal", WL.fmt.tanggal(r.tanggal), "tanggal-sel"));
                if (bisaKategori) {
                    const k = el("span", { teks: r.kategori });
                    const wrap = el("div", {}, k);
                    if (r.perluDitinjau && r.kategoriAsli) wrap.append(el("span", { class: "catatan-ubah", teks: "Dulu: " + r.kategoriAsli + " — periksa" }));
                    tr.append(sel("Kategori", wrap));
                }
                tr.append(sel("Keterangan", r.keterangan || "—"));
                tr.append(sel("Nominal", WL.fmt.rupiah(r.nominal), "nominal"));
                const ringkasan = cfg.kata + " " + WL.fmt.tanggal(r.tanggal) + " " + WL.fmt.rupiah(r.nominal);
                const aksi = el("td", { class: "aksi" }, el("div", { class: "aksi-baris" },
                    el("button", { type: "button", class: "tombol-ikon", "aria-label": "Ubah " + ringkasan, html: ikon("ubah", 16) + "<span>Ubah</span>", onclick: () => mulaiUbah(r) }),
                    el("button", { type: "button", class: "tombol-ikon hapus", "aria-label": "Hapus " + ringkasan, html: ikon("hapus", 16) + "<span>Hapus</span>", onclick: () => mintaHapus(r) })));
                tr.append(aksi);
                tubuh.append(tr);
            });

            const k = $("kosong");
            k.hidden = tampil.length > 0 || rentangSalah;
            if (!k.hidden) k.textContent = semua.length === 0 ? cfg.teksKosong : "Tidak ada catatan yang cocok dengan filter. Ubah tanggal atau pilih \"Semua tanggal\".";
            $("tabelUtama").hidden = tampil.length === 0;
        }

        window.addEventListener("storage", render);   // jika data diubah di tab lain
        resetForm();
        render();
        return { render };
    };
})();
