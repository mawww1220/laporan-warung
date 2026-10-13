/* Halaman Modal & Prive — dua daftar catatan dalam satu menu */
(function () {
    "use strict";
    WL.UI.halamanCatatan({
        jenis: "modal",
        akar: document.getElementById("akarModal"),
        judul: "Modal",
        kata: "modal",
        labelTotal: "Total modal",
        ikon: "modal",
        warna: "hijau",
        labelNominal: "Nominal modal",
        placeholderKet: "Contoh: Tambahan modal dari tabungan",
        teksBantu: "Catat uang pribadi yang Anda masukkan ke usaha. Nilai ini menambah kas, tetapi tidak dihitung sebagai penjualan.",
        teksRiwayat: "Semua modal yang sudah dicatat.",
        teksKosong: "Belum ada catatan modal."
    });
    WL.UI.halamanCatatan({
        jenis: "prive",
        akar: document.getElementById("akarPrive"),
        judul: "Prive",
        kata: "prive",
        labelTotal: "Total prive",
        ikon: "dompet",
        warna: "oranye",
        labelNominal: "Nominal prive",
        placeholderKet: "Contoh: Diambil untuk kebutuhan keluarga",
        teksBantu: "Catat uang usaha yang diambil untuk keperluan pribadi. Nilai ini mengurangi kas, tetapi tidak dihitung sebagai pengeluaran usaha.",
        teksRiwayat: "Semua prive yang sudah dicatat.",
        teksKosong: "Belum ada catatan prive."
    });

    const tabs = { modal: document.getElementById("tab-modal"), prive: document.getElementById("tab-prive") };
    const panel = { modal: document.getElementById("akarModal"), prive: document.getElementById("akarPrive") };
    function pilih(k) {
        Object.keys(tabs).forEach((n) => {
            tabs[n].setAttribute("aria-selected", String(n === k));
            tabs[n].tabIndex = n === k ? 0 : -1;
            panel[n].hidden = n !== k;
        });
        if (history.replaceState) history.replaceState(null, "", "#" + k);
    }
    tabs.modal.addEventListener("click", () => pilih("modal"));
    tabs.prive.addEventListener("click", () => pilih("prive"));
    Object.values(tabs).forEach((t) => t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const k = t === tabs.modal ? "prive" : "modal"; pilih(k); tabs[k].focus(); }
    }));
    pilih(location.hash === "#prive" ? "prive" : "modal");
})();
