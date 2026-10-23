# Templat Kad Jemputan Perkahwinan

Kad jemputan Bahasa Melayu dengan tema krim dan emas, animasi buka kad, galeri berlapis, kalendar, peta, hubungan serta RSVP pilihan. Adam dan Hawa, tarikh 21 Disember 2030, nama ibu bapa dan gambar dalam projek ini ialah **contoh untuk diganti**.

## Mulakan kad baharu

Daripada repository sumber, jana projek baharu dalam folder berasingan:

```powershell
npm run create:invite -- --output ../kad-baru
```

Dalam folder projek yang dijana:

```powershell
npm install
```

Edit `config.js`, kemudian jalankan:

```powershell
npm run build
npm run check
python -m http.server 4173 --bind 127.0.0.1
```

Buka `http://127.0.0.1:4173` dalam pelayar. Server Python ini sesuai untuk preview frontend; fungsi RSVP memerlukan deployment Vercel yang dikonfigurasi.

`npm run build` menyelaraskan kandungan statik `index.html`, metadata perkongsian, cover monogram dan fail `assets/calendar/walimatul-urus.ics` daripada konfigurasi. Jalankan semula selepas mengubah kandungan supaya nama, tarikh dan lokasi pada kad, preview pautan dan kalendar kekal sepadan. Jangan edit fail kalendar secara berasingan.

## Isi kandungan melalui config.js

| Bahagian | Kandungan yang perlu diganti |
| --- | --- |
| `couple` | Nama ringkas `groom`/`bride` dan nama penuh. Nama lelaki dipaparkan dahulu; tambah `displayNames` hanya jika mahu susunan tersendiri. |
| `event` | Tarikh mula/tamat, tempat dan alamat. Gunakan tarikh ISO dengan offset Malaysia, contohnya `2030-12-21T11:00:00+08:00`. |
| `family.hosts` | Nama ibu bapa atau keluarga yang menjemput. |
| `invitation` | Pantun, ayat jemputan dan penutup. |
| `schedule` | Masa dan acara; selaraskan dengan masa mula/tamat majlis. |
| `map` | Pautan sebenar Google Maps/Waze dan embed peta. |
| `contact.people` | Nama penganjur dan nombor yang dibenarkan untuk dihubungi. |
| `gallery` | Laluan gambar tempatan, penerangan `alt` dan susunan foto. |
| `audio` | Sama ada muzik diaktifkan dan laluan fail audio tempatan. |
| `metadata` | URL deployment baharu, tajuk/penerangan dan imej perkongsian jika diperlukan. |

`event.dateText` dan `event.timeText` boleh dikosongkan untuk dijana daripada waktu mula/tamat semasa build. `hijriDate` dibiarkan kosong sehingga tarikh disahkan oleh penganjur. Tajuk/penerangan metadata yang kosong turut dijana semasa build.

Countdown menggunakan hari Malaysia: sebelum majlis ia mengira detik, pada hari majlis ia memaparkan “Majlis Hari Ini”, dan selepas hari majlis bahagian itu disembunyikan.

### Gambar dan cover

Ganti tiga placeholder SVG dalam `assets/images/` dengan foto sendiri, kemudian ubah `gallery[].src` dan `alt`. Anda boleh menambah atau mengurangkan item galeri. Format WebP dengan dimensi dan saiz fail yang munasabah membantu paparan telefon dimuatkan lebih cepat.

`cover.image` yang kosong menggunakan monogram neutral yang dijana daripada nama ringkas pasangan semasa. Untuk menggunakan cover sendiri, simpan fail dalam `assets/images/` dan isi laluannya pada `cover.image`.

Contoh muzik pilihan:

```javascript
audio: {
  enabled: true,
  src: "assets/audio/lagu-majlis.mp3"
}
```

Simpan fail itu pada laluan yang dinyatakan. Muzik bermula selepas tetamu membuka kad dan tersedia dengan kawalan main/jeda. Gunakan media yang anda mempunyai kebenaran untuk diterbitkan.

### Peta dan hubungan

Peta disembunyikan sehingga `map.enabled` ditetapkan kepada `true`. Isi pautan Google Maps, Waze dan `embedUrl` untuk lokasi majlis sebenar. Contoh ini tidak mengandungi koordinat atau lokasi majlis terdahulu.

Senarai hubungan kosong pada permulaan. Tambah penganjur dengan format:

```javascript
contact: {
  whatsapp: "",
  rsvpName: "",
  people: [
    {
      name: "Nama Penganjur",
      phones: [
        {
          display: "Gantikan dengan nombor untuk paparan",
          number: "Gantikan dengan nombor antarabangsa tanpa + atau ruang"
        }
      ]
    }
  ]
}
```

Gantikan semua teks contoh sebelum digunakan. Untuk nombor Malaysia, gunakan awalan `60` tanpa `0` awal dalam `number`. Setiap nombor mempunyai pautan WhatsApp dan panggilan terus.

## RSVP untuk pasangan baharu

RSVP dimatikan secara lalai (`rsvp.enabled: false`). Templat ini tidak membawa rekod tetamu, connection string atau secret daripada kad lain.

Gunakan **deployment Vercel dan database Neon baharu untuk setiap pasangan**. Endpoint semasa menggunakan satu dataset bagi satu kad; berkongsi database akan mencampurkan rekod kehadiran dan ucapan.

1. Cipta database Neon baharu dan jalankan `neon/schema.sql` yang disertakan melalui SQL Editor.
2. Cipta projek Vercel baharu untuk folder/repository kad tersebut.
3. Tetapkan `DATABASE_URL` dan `RSVP_HASH_SECRET` (secret rawak sekurang-kurangnya 32 aksara) dalam environment projek Vercel. Lihat `.env.example` untuk nama pemboleh ubah.
4. Aktifkan `rsvp.enabled: true`, kekalkan endpoint `/api/rsvp`, jalankan build dan deploy semula.
5. Semak `GET /api/rsvp` dan paparan RSVP pada deployment baharu.

Connection string dan secret hanya berada pada server. Jangan masukkan nilainya dalam `config.js`, HTML atau GitHub. Jika projek Vercel mewarisi integration/environment daripada projek lain, gantikan dengan database baharu sebelum mengaktifkan RSVP.

Form mengumpulkan nama, kehadiran, jumlah tetamu dan ucapan pilihan. Nombor telefon tetamu tidak dikumpul. Ucapan diterbitkan terus secara lalai; tetapkan `RSVP_WISH_MODE=pending` dalam environment Vercel jika mahu menyemak ucapan terlebih dahulu. Mod paparan pending memerlukan kelulusan `wish_status` kepada `published` melalui database.

## Terbitkan di Vercel

Gunakan projek/repository berasingan untuk kad baharu. Tetapan projek:

- Framework: `Other`.
- Jalankan `npm run build` sebagai Build Command.
- Root Directory: folder projek yang dijana.
- Kekalkan `vercel.json` dan folder `api/` yang disertakan.

Selepas memperoleh domain, isi `metadata.url` dalam `config.js`, jalankan build dan deploy semula supaya pautan perkongsian menggunakan domain kad tersebut.

## Semakan sebelum edar

- Ganti semua nama dan butiran contoh; sahkan turutan nama serta tarikh Hijrah.
- Semak tarikh/masa, atur cara, peta, Google Maps/Waze dan nombor hubungan.
- Pastikan Save The Date menggunakan nama, masa dan lokasi yang sama seperti kad.
- Cuba galeri, muzik, perkongsian dan borang RSVP yang diaktifkan pada telefon serta desktop.
- Semak preview pautan selepas domain dimuktamadkan; aplikasi perkongsian mungkin menyimpan cache.
- Pastikan database kad baharu kosong dan menggunakan environment yang betul sebelum menerima tetamu.

`npm run check` memeriksa sintaks JavaScript. Projek yang dijana tidak menjanjikan ujian browser atau database automatik; lakukan semakan aliran sebenar sebelum pautan diedarkan.
