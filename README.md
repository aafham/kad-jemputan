# Kad Jemputan Perkahwinan Nabil & Hani

Kad jemputan perkahwinan satu halaman dalam Bahasa Melayu untuk majlis Nabil dan Hani pada Sabtu, 3 Oktober 2026 di Rantau Panjang, Klang.

**Laman produksi:** [kad-jemputan.vercel.app](https://kad-jemputan.vercel.app)

Frontend dibina dengan HTML, CSS dan JavaScript biasa tanpa framework atau proses binaan. Satu Vercel Function digunakan hanya untuk RSVP dan ucapan tetamu yang disimpan dalam Neon PostgreSQL.

## Fungsi semasa

| Bahagian | Fungsi |
| --- | --- |
| Pembukaan kad | Cover floral, animasi pintu, fokus papan kekunci yang betul dan muzik yang bermula selepas tetamu menekan **Buka Jemputan**. |
| Maklumat majlis | Nama pasangan, keluarga, pantun, tarikh Masihi/Hijrah, countdown, atur cara dan lokasi dipacu oleh `config.js`. |
| Lokasi | Peta Google terbenam, alamat, serta ikon pautan terus ke Google Maps dan Waze. |
| Save the Date | Muat turun fail `.ics` untuk kalendar tetamu. |
| RSVP | Nama, status kehadiran, jumlah tetamu dan ucapan; nombor telefon tidak dikumpul. |
| Ucapan & Doa | Maksimum tiga ucapan dipaparkan pada satu masa dan bertukar setiap lima saat. |
| Galeri | Carousel berlapis 3D, klik kad sisi, keyboard, swipe, autoplay setiap dua saat dan loop semula. Autoplay berhenti sementara ketika hover, fokus atau interaksi. |
| Hubungi kami | Aksi WhatsApp dan panggilan terus untuk setiap nombor penganjur. |

## Struktur projek

```text
.
├── index.html                         # Struktur halaman, metadata statik dan audio
├── style.css                          # Tema, responsif dan aksesibiliti visual
├── script.js                          # Konfigurasi UI, RSVP, galeri dan interaksi
├── config.js                          # Sumber utama kandungan majlis
├── api/
│   ├── rsvp.js                        # Endpoint GET/POST RSVP pada Vercel
│   └── _lib/rsvp.cjs                  # Validasi, had kadar dan akses Neon
├── neon/
│   ├── schema.sql                     # Schema RSVP baharu tanpa nombor telefon
│   └── migrations/                    # Migrasi database sekali guna
├── assets/
│   ├── audio/                         # Muzik latar
│   ├── calendar/                      # Fail Save the Date (.ics)
│   └── images/                        # Cover, galeri dan ikon navigasi
├── vercel.json                        # Header keselamatan
└── .env.example                       # Nama pemboleh ubah server sahaja
```

`supabase/schema.sql` disimpan sebagai rekod sistem lama sahaja. Runtime semasa tidak menggunakan Supabase.

## Jalankan secara lokal

Untuk menyemak reka bentuk frontend sahaja, tiada pemasangan pakej diperlukan:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Kemudian buka `http://127.0.0.1:4173`. Endpoint `/api/rsvp` tidak tersedia pada server statik ini; gunakan deployment Vercel dengan environment variables untuk menguji RSVP sebenar.

Pakej Node hanya diperlukan oleh Vercel Function RSVP:

```powershell
npm install
```

## Kemaskini kandungan majlis

Gunakan `config.js` sebagai sumber utama untuk kandungan yang dipaparkan:

1. `couple` — nama ringkas, nama penuh, turutan paparan dan monogram.
2. `event` — tarikh, masa, tempat, alamat dan offset masa. Gunakan format seperti `2026-10-03T11:00:00+08:00`.
3. `family.hosts` — keluarga yang menjemput.
4. `invitation` — tajuk, Bismillah, pantun, ayat jemputan dan penutup.
5. `schedule`, `map`, `contact` dan `gallery` — atur cara, pautan navigasi, hubungan serta foto.
6. `metadata` — tajuk, penerangan, canonical URL dan imej perkongsian.

Perkara yang perlu dikemas kini secara berasingan:

- `<head>` statik dalam `index.html` untuk `title`, description, canonical dan Open Graph/Twitter. Crawler WhatsApp/Facebook tidak menjalankan `config.js`.
- `assets/calendar/walimatul-urus.ics` apabila nama, masa atau alamat berubah.
- Sumber muzik dalam elemen `<audio>` di `index.html`.

`metadata.image` kini kosong. Tambah imej Open Graph mutlak bersaiz kira-kira **1200 × 630 px** sebelum berkongsi pautan secara meluas supaya preview WhatsApp/Facebook kelihatan kemas.

## RSVP dan Neon PostgreSQL

Frontend hanya bercakap dengan endpoint same-origin `/api/rsvp`. Browser tidak menerima connection string atau secret Neon.

### Database baharu

1. Cipta database Neon.
2. Jalankan [neon/schema.sql](neon/schema.sql) sekali melalui **Neon SQL Editor**.
3. Dalam **Vercel Project Settings → Environment Variables**, tetapkan untuk Production, Preview dan Development:

   - `DATABASE_URL` — pooled Neon connection string.
   - `RSVP_HASH_SECRET` — secret rawak sekurang-kurangnya 32 aksara.

4. Redeploy Vercel dan uji `GET /api/rsvp` tanpa menghantar RSVP palsu.

Lihat [.env.example](.env.example) untuk nama pemboleh ubah sahaja. Jangan letakkan secret dalam `config.js`, HTML atau GitHub.

### Moderasi dan penyelenggaraan

- Lalai: `RSVP_WISH_MODE=published`; ucapan baharu terus dipaparkan.
- Moderasi: tetapkan `RSVP_WISH_MODE=pending`, kemudian ubah `wish_status` kepada `published` di Neon selepas diluluskan.
- Bekukan penghantaran semasa penyelenggaraan: tetapkan `RSVP_WRITE_ENABLED=false`, redeploy, kemudian aktifkan semula dengan unset atau `true`.
- Migrasi dari schema lama yang masih mempunyai nombor telefon: ikut [neon/migrations/20260815_remove_phone_from_rsvp.sql](neon/migrations/20260815_remove_phone_from_rsvp.sql) semasa penghantaran dibekukan. Jangan jalankan migrasi itu pada database kosong.

Sistem menyimpan HMAC alamat IP bersama rekod RSVP dan jadual had kadar baca/hantar; IP mentah dan nombor telefon tidak disimpan. Rekod had kadar ini belum mempunyai pembersihan automatik, jadi tetapkan polisi retention atau tugas pembersihan Neon jika kad digunakan untuk tempoh lama.

## Deployment Vercel

Tetapan projek:

- **Framework Preset:** `Other`
- **Root Directory:** `./`
- **Build Command / Output Directory:** kosong
- **Runtime Node:** `>=20` seperti dalam `package.json`
- **Headers keselamatan:** [vercel.json](vercel.json)

Push ke `main` mencetuskan deployment produksi automatik. Selepas deployment, semak laman live, `/api/rsvp`, Google Maps, Waze, `Save The Date`, audio dan preview pautan sosial.

## Semakan teknikal yang disyorkan

```powershell
node --check config.js
node --check script.js
node --check api\rsvp.js
node --check api\_lib\rsvp.cjs
npm audit --omit=dev
git diff --check
```

Tiada test runner automatik dalam projek ini lagi. Sebelum majlis, uji aliran sebenar pada telefon: buka kad, audio, RSVP, paparan ucapan, galeri, navigasi peta dan pautan panggilan/WhatsApp.

## Privasi, hak media dan penerbitan

- Repositori dan laman ini adalah awam; alamat, nombor hubungan serta foto boleh dilihat oleh sesiapa yang mempunyai pautan.
- `robots` ditetapkan kepada `noindex,nofollow`, tetapi ini bukan kawalan akses.
- Google Fonts dan Google Maps ialah perkhidmatan pihak ketiga. Peta terbenam boleh menghantar maklumat pelawat kepada Google apabila dimuatkan.
- Pastikan kebenaran foto dan lesen muzik mencukupi, khususnya untuk muzik komersial yang dimuat naik ke laman awam.

## Checklist sebelum edar

- Sahkan tarikh Hijrah, masa, alamat, atur cara dan nombor hubungan dengan penganjur.
- Pastikan kandungan `.ics` sepadan dengan `config.js`.
- Tambah dan uji imej Open Graph melalui WhatsApp/Facebook Debugger selepas domain muktamad dipilih.
- Pilih sama ada ucapan perlu terus diterbitkan atau melalui moderasi.
- Semak saiz foto/audio dan optimumkan WebP/AVIF atau audio bitrate rendah untuk tetamu menggunakan data mudah alih.
- Uji pada Android, iPhone dan desktop sebelum pautan diedarkan.
