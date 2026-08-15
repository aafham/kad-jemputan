# Kad Jemputan Perkahwinan Nabil & Hanis

Kad jemputan perkahwinan satu halaman dalam Bahasa Melayu untuk majlis Nabil dan Hanis pada Sabtu, 3 Oktober 2026 di Rantau Panjang, Klang. Projek ini dibina dengan HTML, CSS dan JavaScript biasa—tanpa kebergantungan atau proses binaan—dan boleh terus dihoskan sebagai laman statik.

**Laman produksi:** [kad-jemputan.vercel.app](https://kad-jemputan.vercel.app)

## Ciri-ciri

- Skrin pembuka dengan animasi pintu dan dekorasi bunga.
- Paparan nama penuh pasangan, keluarga yang menjemput, tarikh Masihi/Hijrah, masa dan lokasi melalui satu fail konfigurasi.
- Countdown ke hari majlis.
- Peta, pautan Google Maps/Waze dan kod QR lokasi.
- Atur cara, senarai nombor untuk dihubungi, pautan kalendar `.ics` dan perkongsian pautan.
- RSVP sebenar, kiraan kehadiran dan paparan ucapan tetamu melalui Vercel Function + Supabase.
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
├── vercel.json                  # Header keselamatan deployment
├── api/                         # Endpoint RSVP Vercel
├── supabase/schema.sql           # Jadual RSVP dan ucapan
├── .env.example                 # Nama pemboleh ubah server
└── assets/
    ├── audio/                  # Muzik latar
    ├── calendar/               # Fail Save The Date (.ics)
    └── images/                 # Galeri dan pratonton peta
```

## Kemaskini untuk majlis sebenar

Sebelum berkongsi kad ini dengan tetamu, kemaskini `config.js`:

1. Nama pengantin, nama penuh, turutan paparan dan monogram dalam `couple`.
2. Tarikh, masa, alamat serta pautan peta dalam `event` dan `map`.
3. Gunakan offset Malaysia pada `event.dateTime` dan `event.endDateTime`, contohnya `2026-10-03T11:00:00+08:00`.
4. Keluarga yang menjemput dalam `family.hosts`, serta penerima RSVP utama dan senarai nombor dalam `contact`.
5. Tambah tema pakaian, galeri atau audio hanya apabila bahan dan kebenaran penggunaannya sudah tersedia.
6. Maklumat perkongsian: `metadata.title`, `metadata.description`, `metadata.url`, `metadata.image` dan `metadata.imageAlt`.

Kalendar mini, atur cara, keluarga dan kontak dijana daripada `config.js`. Metadata dalam `config.js` dikemas kini pada pelayar, tetapi crawler media sosial biasanya membaca `<head>` statik dalam `index.html`; jika menggunakan domain sendiri, kemaskini kedua-dua tempat tersebut dengan URL mutlak baharu. Fail `assets/calendar/walimatul-urus.ics` masih perlu dikemaskini secara manual apabila tarikh, masa atau lokasi berubah.

## Deployment Vercel

Projek ini telah diimport ke Vercel daripada repositori GitHub dan menggunakan tetapan berikut:

- Framework Preset: `Other`
- Root Directory: `./`
- Build Command: kosong
- Output Directory: kosong
- Header keselamatan: dikonfigurasi dalam `vercel.json`

Push baharu ke branch `main` akan mencetuskan deployment produksi automatik pada Vercel. Untuk domain sendiri, tambahkannya melalui tetapan **Domains** projek Vercel.

## RSVP dan ucapan tetamu

RSVP tidak disimpan dalam WhatsApp atau pelayar. Ia menggunakan endpoint dalaman `/api/rsvp` pada Vercel dan jadual Supabase supaya kehadiran serta ucapan boleh dilihat semula pada kad.

Sebelum mengaktifkannya di Vercel:

1. Cipta projek Supabase dan jalankan [supabase/schema.sql](supabase/schema.sql) dalam **SQL Editor** projek tersebut.
2. Tambah pemboleh ubah berikut dalam **Vercel Project Settings → Environment Variables** untuk Production, Preview dan Development: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RSVP_HASH_SECRET`.
3. Jana `RSVP_HASH_SECRET` rawak sekurang-kurangnya 32 aksara. Jangan masukkan apa-apa secret ke dalam `config.js` atau GitHub.
4. Redeploy projek. Contoh nama pemboleh ubah tersedia dalam [.env.example](.env.example).

Secara lalai ucapan terus dipaparkan seperti rujukan. Jika mahu semak dahulu, tetapkan `RSVP_WISH_MODE=pending` di Vercel; kemudian ubah `wish_status` kepada `published` dalam dashboard Supabase untuk menerbitkannya. Nombor telefon tidak pernah dipulangkan oleh API awam atau dipaparkan pada kad.

## Privasi dan penerbitan

Kad ini memaparkan maklumat majlis, nombor WhatsApp dan foto secara terus pada pelayar. Sesiapa yang mempunyai pautan boleh melihatnya. Repositori GitHub juga adalah awam pada masa ini.

Laman menggunakan Google Fonts dan perkhidmatan QR pihak ketiga; QR membawa data lokasi ke perkhidmatan tersebut. Untuk privasi atau kebolehpercayaan yang lebih baik, jana dan hoskan kod QR sendiri sebelum edaran.

## Semakan sebelum edar

- Sahkan tarikh Hijrah dengan penganjur sebelum edaran.
- Semak pautan lokasi, penerima RSVP utama, semua nombor WhatsApp dan fail kalendar pada telefon sebenar.
- `robots` kini menggunakan `noindex,nofollow`; tukar hanya jika anda memang mahu kad muncul dalam carian.
- Tetapkan `metadata.url` dan URL imej Open Graph mutlak selepas domain muktamad tersedia; imej Open Graph sengaja dikosongkan sehingga gambar yang betul dibekalkan.
- Pastikan anda memiliki kebenaran untuk menggunakan semua foto dan audio yang ditambah kemudian.
