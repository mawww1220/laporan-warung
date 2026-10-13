/* =====================================================================
   ui.js — Komponen tampilan yang dipakai semua halaman:
   menu samping, notifikasi, dialog konfirmasi, input Rupiah,
   grafik batang (SVG, tanpa internet), dan unduh CSV.
   ===================================================================== */
(function () {
    "use strict";
    const WL = window.WL;
    const UI = WL.UI;

    /* ---------- Pembantu DOM ---------- */
    function esc(t) {
        return String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    // el("div", {class:"x", teks:"halo"}, anak1, anak2) — selalu aman dari HTML injeksi
    function el(tag, atribut, ...anak) {
        const e = document.createElement(tag);
        Object.entries(atribut || {}).forEach(([k, v]) => {
            if (v === false || v == null) return;
            if (k === "class") e.className = v;
            else if (k === "teks") e.textContent = v;
            else if (k === "html") e.innerHTML = v;
            else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
            else e.setAttribute(k, v === true ? "" : v);
        });
        anak.flat().forEach((a) => {
            if (a == null || a === false) return;
            e.append(a.nodeType ? a : document.createTextNode(String(a)));
        });
        return e;
    }

    /* ---------- Ikon (SVG garis, konsisten) ---------- */
    const IKON = {
        dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
        penjualan: '<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
        pengeluaran: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
        modal: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
        laporan: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h7"/>',
        profil: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
        kalender: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
        ubah: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
        hapus: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
        tambah: '<path d="M12 5v14M5 12h14"/>',
        unduh: '<path d="M12 4v11"/><path d="M7.5 11L12 15.5 16.5 11"/><path d="M5 20h14"/>',
        unggah: '<path d="M12 16V5"/><path d="M7.5 9L12 4.5 16.5 9"/><path d="M5 20h14"/>',
        cetak: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
        ceklis: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        peringatan: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        dompet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M16 13.5h.01"/>',
        naik: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
        tutup: '<path d="M6 6l12 12M18 6L6 18"/>',
        grafik: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
        catatan: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
        undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'
    };
    function ikon(nama, ukuran) {
        const u = ukuran || 20;
        return '<svg width="' + u + '" height="' + u + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IKON[nama] || "") + "</svg>";
    }

    /* ---------- Kerangka halaman: menu + merek ---------- */
    const MENU = [
        { k: "dashboard", href: "index.html", label: "Dashboard", ikon: "dashboard" },
        { k: "penjualan", href: "penjualan.html", label: "Penjualan", ikon: "penjualan" },
        { k: "pengeluaran", href: "pengeluaran.html", label: "Pengeluaran", ikon: "pengeluaran" },
        { k: "modal-prive", href: "modal-prive.html", label: "Modal & Prive", ikon: "modal" },
        { k: "laporan", href: "laporan.html", label: "Laporan", ikon: "laporan" },
        { k: "profil", href: "profil.html", label: "Profil Usaha", ikon: "profil" }
    ];

    function pasangKerangka() {
        const aktif = document.body.dataset.halaman;
        const profil = WL.profil.ambil();
        const sub = profil.namaUsaha || "Kelola usaha lebih mudah";

        const sb = document.getElementById("sidebar");
        if (sb) {
            sb.setAttribute("aria-label", "Menu utama");
            sb.innerHTML =
                '<div class="logo"><span class="logo-ikon" aria-hidden="true">🍛</span><div><h2>Warung Laporan</h2><p>' + esc(sub) + "</p></div></div>" +
                '<p class="label-menu">Menu utama</p>' +
                '<nav class="menu" aria-label="Menu utama">' +
                MENU.map((m) => '<a href="' + m.href + '" class="menu-item' + (m.k === aktif ? " aktif" : "") + '"' + (m.k === aktif ? ' aria-current="page"' : "") + ">" + ikon(m.ikon, 20) + "<span>" + esc(m.label) + "</span></a>").join("") +
                "</nav>" +
                '<div class="sidebar-footer"><strong>Catatan usaha lebih rapi</strong>Data tersimpan di browser perangkat ini. Unduh cadangan secara berkala di menu Profil Usaha.</div>';
        }
        const mm = document.getElementById("merekMobile");
        if (mm) {
            mm.className = "merek-mobile";
            mm.innerHTML = '<span class="logo-ikon" aria-hidden="true">🍛</span><div><strong>Warung Laporan</strong><span>' + esc(sub) + "</span></div>";
        }
        const konten = document.querySelector(".konten");
        if (konten && !WL.penyimpananTersedia) {
            const b = banner({ tipe: "bahaya", ikon: "peringatan", isi: "Browser memblokir penyimpanan data, sehingga catatan tidak bisa disimpan. Buka aplikasi di Chrome biasa (bukan mode samaran/Incognito) dan izinkan penyimpanan situs." });
            konten.insertBefore(b, document.querySelector(".header") || konten.firstChild);
        }
        const mi = WL.infoMigrasi;
        if (konten && mi && mi.dijalankan && (mi.dipindah || mi.ditolak || mi.galat)) {
            let teks = "Data lama Anda sudah dipindahkan ke format baru dan semua transaksi tetap ada.";
            if (mi.dipindah) teks += " " + mi.dipindah + " catatan pengeluaran dimasukkan ke kategori baru; periksa di halaman Pengeluaran.";
            if (mi.ditolak) teks += " " + mi.ditolak + " catatan tidak dapat dibaca (tanggal/nominal rusak) dan disimpan terpisah, tidak dihapus.";
            if (mi.galat) teks += " Catatan: " + mi.galat;
            konten.insertBefore(banner({ tipe: "sukses", ikon: "ceklis", isi: teks, tutup: true }), document.querySelector(".header") || konten.firstChild);
        }
    }

    function banner(o) {
        const isi = el("div", { class: "isi" });
        if (o.isi && o.isi.nodeType) isi.append(o.isi); else isi.textContent = o.isi || "";
        const b = el("div", { class: "banner " + (o.tipe || ""), role: o.tipe === "bahaya" ? "alert" : "status" });
        b.insertAdjacentHTML("afterbegin", ikon(o.ikon || "info", 20));
        b.append(isi);
        if (o.tutup) {
            const t = el("button", { class: "tutup-banner", type: "button", "aria-label": "Tutup pesan", onclick: () => { b.remove(); if (o.padaTutup) o.padaTutup(); } });
            t.innerHTML = ikon("tutup", 18);
            b.append(t);
        }
        return b;
    }

    /* ---------- Notifikasi singkat ---------- */
    function lapisToast() {
        let w = document.getElementById("lapisToast");
        if (!w) {
            w = el("div", { id: "lapisToast", class: "lapis-toast", "aria-live": "polite" });
            document.body.append(w);
        }
        return w;
    }
    function toast(teks, tipe) {
        const t = el("div", { class: "toast " + (tipe || "sukses"), role: tipe === "galat" ? "alert" : "status" });
        t.insertAdjacentHTML("afterbegin", ikon(tipe === "galat" ? "peringatan" : "ceklis", 18));
        t.append(el("span", { teks }));
        lapisToast().append(t);
        setTimeout(() => t.remove(), tipe === "galat" ? 7000 : 4000);
    }

    /* ---------- Dialog konfirmasi (pengganti confirm bawaan) ---------- */
    // opsi: {judul, pesan, daftar[], isi(node), bacaNilai(dialog), ya, batal(null = tanpa tombol batal), bahaya}
    function konfirmasi(o) {
        return new Promise((resolve) => {
            if (typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") {
                resolve(window.confirm((o.judul || "") + "\n" + (o.pesan || "")));
                return;
            }
            const d = el("dialog", { class: "dialog" });
            const f = el("form", { method: "dialog" });
            f.append(el("h3", { teks: o.judul }));
            if (o.pesan) f.append(el("p", { teks: o.pesan }));
            if (o.daftar) f.append(el("ul", {}, o.daftar.map((t) => el("li", { teks: t }))));
            if (o.isi) f.append(o.isi);
            const aksi = el("div", { class: "aksi-dialog" });
            if (o.batal !== null) aksi.append(el("button", { class: "tombol sekunder", type: "submit", value: "batal", autofocus: o.bahaya ? true : false, teks: o.batal || "Batal" }));
            aksi.append(el("button", { class: "tombol" + (o.bahaya ? " bahaya" : ""), type: "submit", value: "ya", autofocus: o.bahaya ? false : true, teks: o.ya || "Ya" }));
            f.append(aksi);
            d.append(f);
            d.addEventListener("close", () => {
                const ya = d.returnValue === "ya";
                const nilai = ya && o.bacaNilai ? o.bacaNilai(d) : ya;
                d.remove();
                resolve(nilai);
            });
            document.body.append(d);
            d.showModal();
        });
    }
    function beritahu(o) {
        return konfirmasi({ judul: o.judul, pesan: o.pesan, daftar: o.daftar, ya: o.tombol || "Mengerti", batal: null });
    }

    /* ---------- Input Rupiah (titik ribuan otomatis) ---------- */
    function pasangInputRupiah(input) {
        input.setAttribute("inputmode", "numeric");
        input.setAttribute("autocomplete", "off");
        input.addEventListener("input", () => {
            const d = input.value.replace(/\D/g, "").slice(0, 12).replace(/^0+(?=\d)/, "");
            input.value = d ? WL.fmt.angka(Number(d)) : "";
        });
    }
    function bacaRupiah(input) {
        const d = input.value.replace(/\D/g, "");
        return d === "" ? null : Number(d);
    }
    function isiRupiah(input, n) { input.value = n ? WL.fmt.angka(n) : ""; }

    /* ---------- Rentang tanggal cepat ---------- */
    function rentang(nama) {
        const h = WL.tgl.hariIni();
        const { y, m } = WL.tgl.pecah(h);
        switch (nama) {
            case "hariIni": return { dari: h, sampai: h };
            case "bulanIni": return { dari: WL.tgl.awalBulan(y, m), sampai: WL.tgl.akhirBulan(y, m) };
            case "bulanLalu": { const g = WL.tgl.geserBulan(y, m, -1); return { dari: WL.tgl.awalBulan(g.y, g.m), sampai: WL.tgl.akhirBulan(g.y, g.m) }; }
            case "tahunIni": return { dari: y + "-01-01", sampai: y + "-12-31" };
            default: return { dari: "", sampai: "" };
        }
    }
    const NAMA_RENTANG = { semua: "Semua tanggal", hariIni: "Hari ini", bulanIni: "Bulan ini", bulanLalu: "Bulan lalu", tahunIni: "Tahun ini" };
    // Membuat deretan tombol pilihan cepat. Mengembalikan {tandai(dari, sampai)}.
    function buatChips(wadah, daftar, padaPilih) {
        wadah.classList.add("chips");
        wadah.setAttribute("role", "group");
        wadah.setAttribute("aria-label", "Pilihan periode cepat");
        const tombol = {};
        daftar.forEach((k) => {
            const t = el("button", { type: "button", class: "chip", "aria-pressed": "false", teks: NAMA_RENTANG[k], onclick: () => padaPilih(k, rentang(k)) });
            tombol[k] = t;
            wadah.append(t);
        });
        return {
            tandai(dari, sampai) {
                daftar.forEach((k) => {
                    const r = rentang(k);
                    tombol[k].setAttribute("aria-pressed", String(r.dari === dari && r.sampai === sampai));
                });
            }
        };
    }

    /* ---------- Grafik batang (SVG) ---------- */
    function ringkas(n) {
        const f = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
        if (n >= 1e9) return f(n / 1e9) + " M";
        if (n >= 1e6) return f(n / 1e6) + " jt";
        if (n >= 1e3) return f(n / 1e3) + " rb";
        return String(n);
    }
    function puncakRapi(maks) {
        if (maks <= 0) return 4;
        const mentah = maks / 4;
        const mag = Math.pow(10, Math.floor(Math.log10(mentah)));
        const langkah = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => x >= mentah);
        return langkah * 4;
    }
    // opsi: {label[], seri:[{nama, warna, nilai[]}], ringkasan}
    function grafikBatang(opsi) {
        const W = 640, H = 270, kiri = 58, kanan = 10, atas = 12, bawah = 30;
        const pw = W - kiri - kanan, ph = H - atas - bawah;
        const n = opsi.label.length;
        const maks = Math.max(0, ...opsi.seri.flatMap((s) => s.nilai));
        const puncak = puncakRapi(maks);
        const grup = pw / n;
        const lebar = Math.min(26, (grup * 0.78) / opsi.seri.length);
        let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opsi.ringkasan || "Grafik batang") + '">';
        for (let i = 0; i <= 4; i++) {
            const y = atas + ph - (ph * i) / 4;
            s += '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y + '" y2="' + y + '" stroke="#e3e8f0" stroke-width="1"/>';
            s += '<text class="sumbu-teks" x="' + (kiri - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + ringkas((puncak * i) / 4) + "</text>";
        }
        opsi.label.forEach((lb, i) => {
            const gx = kiri + i * grup + grup / 2;
            const mulai = gx - (lebar * opsi.seri.length + 3 * (opsi.seri.length - 1)) / 2;
            opsi.seri.forEach((sr, j) => {
                const v = sr.nilai[i];
                const h = v > 0 ? Math.max(2, (v / puncak) * ph) : 0;
                const x = mulai + j * (lebar + 3);
                if (h > 0) {
                    s += '<rect x="' + x.toFixed(1) + '" y="' + (atas + ph - h).toFixed(1) + '" width="' + lebar.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + sr.warna + '"><title>' + esc(lb + " – " + sr.nama + ": " + WL.fmt.rupiah(v)) + "</title></rect>";
                }
            });
            s += '<text class="sumbu-teks" x="' + gx.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(lb) + "</text>";
        });
        s += "</svg>";
        const legenda = '<div class="legenda">' + opsi.seri.map((sr) => '<span><i style="background:' + sr.warna + '"></i>' + esc(sr.nama) + "</span>").join("") + "</div>";
        return '<div class="grafik">' + s + "</div>" + legenda;
    }

    /* ---------- CSV & unduh file ---------- */
    function csvSel(v) {
        if (v == null) return "";
        if (typeof v === "number") return String(v);
        let s = String(v).replace(/\r?\n/g, " ");
        if (/^[=+\-@\t]/.test(s)) s = "'" + s;           // cegah rumus berbahaya di Excel
        return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    function buatCsv(baris) {
        // Pemisah titik koma = standar Excel versi Indonesia. BOM agar huruf terbaca benar.
        return "\uFEFF" + baris.map((b) => b.map(csvSel).join(";")).join("\r\n");
    }
    function unduhTeks(namaFile, isi, mime) {
        const blob = new Blob([isi], { type: mime || "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = el("a", { href: url, download: namaFile });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    /* ---------- Kartu ringkasan ---------- */
    function kartu(o) {
        return '<div class="kartu"><div class="kartu-atas"><span>' + esc(o.label) + '</span><span class="ikon ' + (o.warna || "biru") + '">' + ikon(o.ikon, 19) + "</span></div>" +
            '<h2 id="' + o.id + '">Rp0</h2><p id="' + o.id + 'Cat">' + esc(o.catatan || "") + "</p></div>";
    }
    function kelasLaba(n) { return n > 0 ? "positif" : n < 0 ? "negatif" : ""; }

    Object.assign(UI, {
        esc, el, ikon, banner, toast, konfirmasi, beritahu,
        pasangInputRupiah, bacaRupiah, isiRupiah,
        rentang, buatChips, grafikBatang, buatCsv, unduhTeks, kartu, kelasLaba, NAMA_RENTANG
    });

    pasangKerangka();
})();
