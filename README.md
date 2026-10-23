# Template Kad Jemputan Perkahwinan

**[Lihat template](https://kad-jemputan.vercel.app/)**

Laman pada link ini ialah template kosong. Nama pengantin, ibu bapa, tarikh, masa dan gambar menggunakan placeholder. Tiada gambar, lagu, nombor hubungan, alamat atau ucapan pasangan lama dipaparkan.

## Sediakan kad baharu

1. Salin projek ini atau gunakan `npm run create:invite -- --output ../kad-baru` untuk menghasilkan folder kad baharu.
2. Isi butiran dalam `config.js`: nama, keluarga, tarikh/masa, lokasi, aturcara dan hubungan.
3. Masukkan gambar dan audio sendiri; kemas kini laluan media dalam konfigurasi.
4. Tukar `isTemplate` kepada `false` selepas butiran majlis lengkap.
5. Jalankan `npm install`, `npm run build` dan `npm run check`.
6. Terbitkan kad pada projek/domain pelanggan tersebut.

Build menyelaraskan nama, kandungan HTML, cover inisial, favicon, metadata dan fail kalendar daripada konfigurasi. Tarikh majlis belum diisi pada template; countdown dan muat turun kalendar hanya digunakan selepas tarikh sebenar ditetapkan.

## Kandungan konfigurasi

| Bahagian | Maklumat |
| --- | --- |
| `couple` | Nama ringkas dan nama penuh pengantin |
| `family` | Nama ibu bapa / keluarga yang menjemput |
| `event` | Tarikh, masa, tempat dan alamat |
| `invitation` | Bismillah, pantun, ayat jemputan dan penutup |
| `schedule` | Aturcara majlis |
| `map`, `contact` | Google Maps, Waze dan nombor penganjur |
| `gallery`, `cover`, `audio` | Gambar dan muzik |
| `rsvp` | Aktifkan borang kehadiran dan ucapan |
| `metadata` | Tajuk, penerangan, URL dan imej perkongsian |

## RSVP dan data

Dalam mod template, endpoint RSVP memulangkan senarai kosong dan menolak penghantaran. Ia tidak membaca atau menulis ke database. Untuk kad pelanggan yang menggunakan RSVP, sediakan database Neon baharu dan environment Vercel pelanggan tersebut, kemudian jalankan `neon/schema.sql` sekali pada database baharu.

Tetapkan `DATABASE_URL` dan `RSVP_HASH_SECRET` hanya pada server. Jangan letakkan rahsia atau rekod tetamu dalam konfigurasi awam atau GitHub. Gunakan database berasingan untuk setiap pasangan.

## Preview dan semakan

```powershell
npm run build
npm run check
npm test
python -m http.server 4173 --bind 127.0.0.1
```

Server Python ialah preview paparan sahaja. API sebenar dijalankan melalui Vercel. Projek menggunakan HTML, CSS dan JavaScript biasa, dengan satu fungsi server untuk RSVP.

## Borang tempahan

[Pautan borang sedia ada](https://docs.google.com/forms/d/e/1FAIpQLSehYhblgWlcPq4z7vWxWSCTB2BbSQ6R9JjJHFC9YEPGOE1y1g/viewform). Pembetulan borang ditangguhkan sementara template disiapkan.
