# Kad Jemputan Walimatul Urus

Kad jemputan perkahwinan satu halaman dalam Bahasa Melayu. Projek ini dibina dengan HTML, CSS dan JavaScript biasa—tanpa kebergantungan atau proses binaan—dan boleh terus dihoskan sebagai laman statik.

**Laman produksi:** [kad-jemputan.vercel.app](https://kad-jemputan.vercel.app)

## Ciri-ciri

- Skrin pembuka dengan animasi pintu dan dekorasi bunga.
- Paparan nama pasangan, keluarga, tarikh, masa dan lokasi melalui satu fail konfigurasi.
- Countdown ke hari majlis.
- Peta, pautan Google Maps/Waze dan kod QR lokasi.
- Atur cara, tema pakaian dan galeri gambar.
- Audio latar, pautan kalendar `.ics`, perkongsian pautan dan RSVP WhatsApp.
- Reka letak responsif untuk desktop dan telefon mudah alih.

## Jalankan secara lokal

Tiada pemasangan pakej diperlukan. Dari folder projek, jalankan:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Kemudian buka `http://127.0.0.1:4173` dalam pelayar.

## Struktur projek

```text
.
├── index.html                  # Struktur dan kandungan statik
├── style.css                   # Reka bentuk dan responsif
├── script.js                   # Interaksi kad
├── config.js                   # Maklumat majlis yang boleh dikemaskini
└── assets/
    ├── audio/                  # Muzik latar
    ├── calendar/               # Fail Save The Date (.ics)
    └── images/                 # Galeri dan pratonton peta
```

## Kemaskini untuk majlis sebenar

Sebelum berkongsi kad ini dengan tetamu, kemaskini `config.js`:

1. Nama pengantin dan monogram.
2. Tarikh, masa dan lokasi majlis.
3. Gunakan offset Malaysia pada `event.dateTime`, contohnya `2026-08-20T11:00:00+08:00`.
4. Nama ibu bapa, nombor WhatsApp, alamat/URL peta sebenar dan imej peta.
5. Tema pakaian serta gambar galeri.

Beberapa elemen juga masih ditulis terus dalam `index.html`: metadata sosial/SEO, kalendar mini, atur cara, dan teks tema ringkas. Pastikan semuanya sepadan dengan `config.js`, termasuk fail `assets/calendar/walimatul-urus.ics`.

## Deployment Vercel

Projek ini telah diimport ke Vercel daripada repositori GitHub dan menggunakan tetapan berikut:

- Framework Preset: `Other`
- Root Directory: `./`
- Build Command: kosong
- Output Directory: kosong

Push baharu ke branch `main` akan mencetuskan deployment produksi automatik pada Vercel. Untuk domain sendiri, tambahkannya melalui tetapan **Domains** projek Vercel.

## Privasi dan penerbitan

Kad ini memaparkan maklumat majlis, nombor WhatsApp dan foto secara terus pada pelayar. Sesiapa yang mempunyai pautan boleh melihatnya. Repositori GitHub juga adalah awam pada masa ini.

Laman menggunakan Google Fonts dan perkhidmatan QR pihak ketiga; QR membawa data lokasi ke perkhidmatan tersebut. Untuk privasi atau kebolehpercayaan yang lebih baik, jana dan hoskan kod QR sendiri sebelum edaran.

## Semakan sebelum edar

- Gantikan semua placeholder seperti `Pasangan` dan `[Nama Bapa]`.
- Semak pautan lokasi, nombor WhatsApp dan fail kalendar pada telefon sebenar.
- Tentukan sama ada kad perlu diindeks enjin carian; ubah `robots` kepada `noindex,nofollow` jika tidak.
- Tetapkan `og:url` dan URL imej Open Graph yang mutlak selepas domain muktamad tersedia.
- Pastikan anda memiliki kebenaran untuk menggunakan semua foto dan audio.
