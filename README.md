# Template Kad Jemputan Perkahwinan

Template kad jemputan perkahwinan satu halaman dalam Bahasa Melayu. Kad Nabil dan Hani dalam root ialah contoh lengkap; gunakan generator untuk menghasilkan kad pasangan lain dengan kandungan dan sambungan tersendiri.

**Laman produksi:** [kad-jemputan.vercel.app](https://kad-jemputan.vercel.app)

Frontend dibina dengan HTML, CSS dan JavaScript biasa tanpa framework atau proses binaan. Satu Vercel Function digunakan hanya untuk RSVP dan ucapan tetamu yang disimpan dalam Neon PostgreSQL.

## Guna semula sebagai template

Projek ini kini juga mempunyai generator untuk menghasilkan **kad baharu dalam folder berasingan**. Reka bentuk dan fungsi dikongsi; kandungan pasangan, gambar, muzik, database dan domain ditetapkan untuk setiap kad.

```powershell
npm run create:invite -- --output ../kad-pasangan-baru
cd ../kad-pasangan-baru
```

Edit `config.js` dalam folder yang dijana, kemudian:

```powershell
npm run build
npm run check
python -m http.server 4173 --bind 127.0.0.1
```

Build menjana HTML statik, `invitation.generated.js`, cover inisial, favicon serta fail kalendar daripada satu konfigurasi. Sumber `config.js` kekal boleh diedit. Kandungan contoh ialah Adam & Hawa; ganti butiran sebelum kad diedarkan. Lihat [panduan template](templates/README.md) dan [contoh konfigurasi](templates/default.config.js).

Generator menolak folder output yang sudah wujud. Ia hanya menyalin fail yang diperlukan: tiada foto/lagu pasangan lama, data tetamu, `.env`, sambungan Vercel atau sejarah Git disalin. RSVP, muzik dan peta dimatikan secara lalai. Galeri menggunakan tiga gambar placeholder.

Untuk RSVP kad baharu, gunakan projek Vercel dan database Neon tersendiri. Schema dan API kosong disertakan; tiada operasi database dijalankan oleh generator. Sambungan database lama tidak digunakan secara automatik.

Kod generator berada dalam `scripts/` dan fail starter neutral berada dalam `templates/`. Laman asal dalam root kekal sebagai contoh kad yang lengkap. Ujian template meliputi eksport bersih, penjanaan semula untuk pasangan berlainan, konsistensi kalendar/metadata dan perlindungan folder output.

## Fungsi semasa

| Bahagian | Fungsi |
| --- | --- |
| Pembukaan kad | Cover floral, animasi pintu, fokus papan kekunci yang betul dan muzik yang bermula selepas tetamu menekan **Buka Jemputan**. |
| Maklumat majlis | Nama pasangan, keluarga, pantun, tarikh Masihi/Hijrah, atur cara dan lokasi dipacu oleh `config.js`; pautan pantas ke RSVP, Lokasi dan Hubungi. |
| Countdown | Sebelum tarikh majlis: kira detik. Sepanjang 3 Oktober 2026: **Majlis Hari Ini** tanpa nombor. Mulai 4 Oktober 2026: bahagian countdown disembunyikan. Semua sempadan hari mengikut **Asia/Kuala_Lumpur**, bukan zon masa telefon tetamu. |
| Lokasi | Peta Google terbenam, alamat, serta ikon pautan terus ke Google Maps dan Waze. |
| Save the Date | Muat turun fail `.ics` untuk kalendar tetamu. |
| RSVP | Nama, status kehadiran, jumlah tetamu termasuk pengisi dan ucapan; nombor telefon tidak dikumpul. Ada ringkasan berjaya, cegahan klik hantar berganda, timeout 12 saat, mesej ralat dan cuba semula. Input dikekalkan jika gagal. |
| Ucapan & Doa | Maksimum tiga ucapan dipaparkan pada satu masa dan bertukar setiap lima saat. Ada butang sebelum/seterusnya serta Jeda/Main automatik. Halaman terakhir boleh mengandungi kurang daripada tiga ucapan. |
| Galeri | Semua 12 gambar kekal dalam carousel berlapis 3D, klik kad sisi, keyboard, swipe, autoplay setiap dua saat dan loop semula; dengan kawalan Jeda/Main automatik. |
| Hubungi kami | Aksi WhatsApp dan panggilan terus untuk setiap nombor penganjur. |
| Aksesibiliti | Saiz kawalan sentuh sekurang-kurangnya 44px, fokus keyboard, sokongan reduced motion, paparan telefon kecil dan ruang safe-area. Reduced motion mematikan autoplay awal tetapi semua foto/ucapan masih boleh dilihat secara manual. |

Galeri dan ucapan dijeda sementara ketika halaman tidak aktif, pengguna berinteraksi atau fokus papan kekunci berada pada kawalan. Tinggi senarai ucapan dikekalkan mengikut halaman paling tinggi supaya bahagian bawah tidak melonjak semasa pertukaran. Data RSVP hanya dimuatkan selepas kad dibuka; tiada polling automatik berkala. Muzik P. Ramlee yang sedia ada dikekalkan, dengan kawalan main/jeda.

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
├── tests/                             # Ujian Node tanpa akses database sebenar
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

`metadata.image` dan metadata statik kini menggunakan cover floral WebP sedia ada (1254 × 1254). Preview pautan mungkin mengambil masa untuk berubah kerana cache aplikasi perkongsian. Imej sosial khusus 1200 × 630 boleh ditambah kemudian tanpa menukar cover kad.

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

## Ujian dan semakan

```powershell
npm ci
npm run check
npm test
npm audit --omit=dev
git diff --check
```

Ujian menggunakan `node:test` dan tidak menulis ke database. Liputan termasuk:

- Konsistensi aset, nama Hani, metadata dan fail kalendar (masa UTC, alamat, lipatan baris).
- Sempadan hari Malaysia untuk countdown; galeri 2 saat dan ucapan 5 saat, jeda, keyboard dan reduced motion.
- RSVP: validasi, emoji gabungan, had saiz JSON, timeout, cegah double-submit dan ringkasan berjaya.
- Pertanyaan database berparameter dan penapisan data awam melalui mock; secret atau ralat dalaman tidak didedahkan.

Semakan UI 3 Oktober 2026 menggunakan Chromium pada viewport 320px, 390px dan 1440px. Aliran hantar RSVP diuji dengan respons lokal tiruan, bukan rekod tetamu produksi. Ujian Node/Chromium tidak menggantikan semakan pada iPhone Safari dan Android sebenar, khususnya polisi autoplay audio, aplikasi peta serta perkongsian native.

Untuk QA manual: buka kad → semak audio → gunakan pautan pantas → buka/tutup RSVP dan cuba validasi → semak pertukaran ucapan dan galeri → peta/panggilan/WhatsApp → muat turun kalendar. Jangan hantar RSVP palsu ke produksi.

Jika penghantaran RSVP timeout, status penerimaan mungkin belum diketahui: semak paparan ucapan/kehadiran atau hubungi penganjur sebelum menghantar semula. Sistem kini bersifat insert-only, bukan kemas kini rekod lama.

## Privasi, hak media dan penerbitan

- Repositori dan laman ini adalah awam; alamat, nombor hubungan serta foto boleh dilihat oleh sesiapa yang mempunyai pautan.
- `robots` ditetapkan kepada `noindex,nofollow`, tetapi ini bukan kawalan akses.
- Google Fonts dan Google Maps ialah perkhidmatan pihak ketiga. Peta terbenam boleh menghantar maklumat pelawat kepada Google apabila dimuatkan.
- Pastikan kebenaran foto dan lesen muzik mencukupi, khususnya untuk muzik komersial yang dimuat naik ke laman awam.

## Checklist sebelum edar

- Sahkan tarikh Hijrah, masa, alamat, atur cara dan nombor hubungan dengan penganjur.
- Pastikan kandungan `.ics` sepadan dengan `config.js`.
- Uji preview cover Open Graph selepas domain muktamad dipilih.
- Pilih sama ada ucapan perlu terus diterbitkan atau melalui moderasi.
- Media aktif sudah dioptimumkan: galeri WebP sekitar 1 MB, cover sekitar 157 KB dan audio MP3 sekitar 4.7 MB. Kekalkan versi teroptimum apabila menukar media.
- Uji pada Android, iPhone dan desktop sebelum pautan diedarkan.
