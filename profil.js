/* Halaman Profil Usaha: profil, saldo kas awal, cadangan & pemulihan */
(function () {
    "use strict";
    const WL = window.WL;
    const UI = WL.UI;
    const { el } = UI;
    const $ = (id) => document.getElementById(id);
    const FIELD = ["namaUsaha", "namaPemilik", "alamat", "telepon", "jamOperasional", "tahunMulai"];

    $("ikonPeringatan").innerHTML = UI.ikon("peringatan", 20);
    $("tombolEkspor").innerHTML = UI.ikon("unduh", 18) + "<span>Unduh cadangan data</span>";
    $("tombolImpor").innerHTML = UI.ikon("unggah", 18) + "<span>Pilih file cadangan…</span>";
    $("tombolBatalImpor").innerHTML = UI.ikon("undo", 18) + "<span>Batalkan impor terakhir</span>";
    UI.pasangInputRupiah($("saldoKasAwal"));

    /* ---------- Profil ---------- */
    function isiForm() {
        const p = WL.profil.ambil();
        FIELD.forEach((k) => { $(k).value = p[k]; });
        UI.isiRupiah($("saldoKasAwal"), p.saldoKasAwal);
    }
    function bersihGalat() {
        document.querySelectorAll(".galat-isian").forEach((g) => { g.textContent = ""; });
        document.querySelectorAll('[aria-invalid="true"]').forEach((i) => i.removeAttribute("aria-invalid"));
    }

    let terkunci = false;
    $("formProfil").addEventListener("submit", async (e) => {
        e.preventDefault();
        if (terkunci) return;
        bersihGalat();
        const isi = {};
        FIELD.forEach((k) => { isi[k] = $(k).value; });
        isi.saldoKasAwal = UI.bacaRupiah($("saldoKasAwal"));

        const cek = WL.profil.validasi(isi);
        if (!cek.ok) {
            let pertama = null;
            Object.keys(cek.galat).forEach((k) => {
                $("g-" + k).textContent = cek.galat[k];
                $(k).setAttribute("aria-invalid", "true");
                if (!pertama) pertama = $(k);
            });
            if (pertama) pertama.focus();
            return;
        }

        // Mengubah saldo kas awal memengaruhi seluruh laporan → minta konfirmasi
        const lama = WL.profil.ambil().saldoKasAwal;
        const baru = cek.nilai.saldoKasAwal;
        if (lama !== baru && WL.data.adaData()) {
            const ya = await UI.konfirmasi({
                judul: "Ubah saldo kas awal?",
                pesan: "Saldo kas awal akan berubah dari " + WL.fmt.rupiah(lama) + " menjadi " + WL.fmt.rupiah(baru) + ". Saldo kas di Dashboard dan Laporan Arus Kas untuk semua periode ikut berubah. Transaksi tidak berubah.",
                ya: "Ya, ubah"
            });
            if (!ya) return;
        }

        const h = WL.profil.simpan(isi);
        if (!h.ok) { UI.toast(h.pesan || "Profil belum bisa disimpan.", "galat"); return; }
        terkunci = true;
        $("tombolSimpanProfil").disabled = true;
        setTimeout(() => { terkunci = false; $("tombolSimpanProfil").disabled = false; }, 700);
        isiForm();
        const sub = h.profil.namaUsaha || "Kelola usaha lebih mudah";
        document.querySelectorAll(".logo p, .merek-mobile span").forEach((n) => { n.textContent = sub; });
        UI.toast("Profil usaha berhasil disimpan.");
    });

    /* ---------- Cadangan ---------- */
    function segarkanInfo() {
        const c = WL.data.hitungCatatan();
        const wadah = $("hitungCatatan");
        wadah.replaceChildren();
        WL.JENIS.forEach((j) => {
            wadah.append(el("div", {}, el("span", { teks: "Catatan " + WL.JENIS_LABEL[j].toLowerCase() }), el("strong", { teks: String(c[j]) })));
        });
        const t = WL.cadangan.terakhir();
        if (t) {
            const d = new Date(t);
            const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
            $("infoCadanganTerakhir").textContent = "Cadangan terakhir diunduh pada " + WL.fmt.tanggalLengkap(iso) + ".";
        } else {
            $("infoCadanganTerakhir").textContent = "Belum pernah mengunduh cadangan di browser ini.";
        }
        const s = WL.cadangan.infoSnapshot();
        $("tombolBatalImpor").hidden = !s;
        $("infoSnapshot").textContent = s ? "Ada salinan pengaman dari sebelum impor terakhir (" + new Date(s.waktu).toLocaleString("id-ID") + ")." : "";
    }

    $("tombolEkspor").addEventListener("click", () => {
        const data = WL.cadangan.ekspor();
        UI.unduhTeks("warung-laporan-cadangan-" + WL.tgl.hariIni() + ".json", JSON.stringify(data, null, 2), "application/json;charset=utf-8");
        WL.cadangan.tandai();
        segarkanInfo();
        UI.toast("Cadangan diunduh. Simpan file di tempat yang aman.");
    });

    $("tombolImpor").addEventListener("click", () => $("berkasImpor").click());
    $("berkasImpor").addEventListener("change", async () => {
        const berkas = $("berkasImpor").files[0];
        $("berkasImpor").value = "";
        if (!berkas) return;
        await prosesImpor(berkas);
    });

    function pilihanMode() {
        const buat = (nilai, judul, uraian, dipilih) => {
            const r = el("input", { type: "radio", name: "modeImpor", value: nilai, checked: dipilih });
            return el("label", {}, r, el("span", {}, el("strong", { teks: judul }), el("br"), uraian));
        };
        return el("div", { class: "pilihan-radio" },
            buat("gabung", "Gabungkan (disarankan)", "Menambahkan catatan dari file yang belum ada. Catatan yang sudah ada tidak diubah atau digandakan.", true),
            buat("ganti", "Ganti semua data", "Seluruh catatan dan profil saat ini diganti isi file.", false));
    }

    async function prosesImpor(berkas) {
        if (berkas.size > 5 * 1024 * 1024) {
            await UI.beritahu({ judul: "File terlalu besar", pesan: "File cadangan maksimal 5 MB. Tidak ada data yang diubah." });
            return;
        }
        let obj;
        try { obj = JSON.parse(await berkas.text()); }
        catch (e) {
            await UI.beritahu({ judul: "File tidak dapat dibaca", pesan: "Isi file bukan JSON yang valid. Tidak ada data yang diubah." });
            return;
        }
        const v = WL.cadangan.validasi(obj);
        if (!v.ok) {
            await UI.beritahu({ judul: "File cadangan tidak dapat dipakai", pesan: "Tidak ada data yang diubah. Masalah yang ditemukan:", daftar: v.galat });
            return;
        }
        const j = v.jumlah;
        const tgl = obj.diekspor && !isNaN(Date.parse(obj.diekspor)) ? new Date(obj.diekspor).toLocaleString("id-ID") : "tidak diketahui";
        const mode = await UI.konfirmasi({
            judul: "Pulihkan data dari cadangan?",
            pesan: "File dibuat " + tgl + " dan berisi " + j.penjualan + " penjualan, " + j.pengeluaran + " pengeluaran, " + j.modal + " modal, " + j.prive + " prive.",
            isi: pilihanMode(),
            bacaNilai: (d) => (d.querySelector('input[name="modeImpor"]:checked') || {}).value || "gabung",
            ya: "Lanjutkan"
        });
        if (!mode) return;

        if (mode === "ganti") {
            const yakin = await UI.konfirmasi({
                judul: "Yakin mengganti semua data?",
                pesan: "Semua catatan dan profil yang ada sekarang akan diganti isi file. Salinan pengaman dibuat otomatis, dan Anda bisa memakai \"Batalkan impor terakhir\" jika perlu.",
                ya: "Ya, ganti semua", bahaya: true
            });
            if (!yakin) return;
        }
        const r = WL.cadangan.terapkan(v.data, mode);
        if (!r.ok) { await UI.beritahu({ judul: "Impor tidak berhasil", pesan: r.pesan }); return; }
        isiForm();
        segarkanInfo();
        UI.toast(mode === "ganti"
            ? "Data diganti dari cadangan (" + r.ringkas.ditambah + " catatan)."
            : "Selesai. " + r.ringkas.ditambah + " catatan baru ditambahkan, " + r.ringkas.dilewati + " sudah ada dan dilewati.");
    }

    $("tombolBatalImpor").addEventListener("click", async () => {
        const ya = await UI.konfirmasi({
            judul: "Batalkan impor terakhir?",
            pesan: "Data dikembalikan seperti sebelum impor terakhir. Catatan yang ditambahkan setelah impor tersebut akan hilang.",
            ya: "Ya, kembalikan", bahaya: true
        });
        if (!ya) return;
        const r = WL.cadangan.batalkanImporTerakhir();
        if (!r.ok) { UI.toast(r.pesan, "galat"); return; }
        isiForm();
        segarkanInfo();
        UI.toast("Data dikembalikan seperti sebelum impor.");
    });

    isiForm();
    segarkanInfo();
})();
