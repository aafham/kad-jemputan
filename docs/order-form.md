# Borang tempahan kad jemputan

Borang ini mengumpulkan maklumat **pelanggan yang menempah kad baharu**, bukan kehadiran tetamu. Maklumat yang diterima boleh disemak dan dipindahkan ke `config.js` projek kad berasingan.

**Pautan untuk pelanggan:** [Isi Borang Tempahan Kad Jemputan Perkahwinan Digital](https://docs.google.com/forms/d/e/1FAIpQLSehYhblgWlcPq4z7vWxWSCTB2BbSQ6R9JjJHFC9YEPGOE1y1g/viewform).

Borang telah diterbitkan untuk sesiapa yang mempunyai pautan. Ia menggunakan 14 kumpulan maklumat berbentuk jawapan perenggan dan satu checkbox persetujuan akhir (**15 soalan**). Tiada notifikasi dihantar semasa penerbitan dan tiada jawapan contoh dihantar.

## Kandungan borang

Borang dipaparkan pada satu halaman dengan 14 kumpulan bernombor dan panduan label bagi setiap kumpulan. Setiap kumpulan wajib dijawab; pelanggan boleh menulis “Tidak berkenaan” untuk butiran pilihan yang tidak diperlukan atau “Belum pasti” untuk perkara yang perlu disemak. Isi satu maklumat setiap baris dalam ruangan jawapan.

1. Maklumat pelanggan, email, WhatsApp dan tarikh kad diperlukan.
2. Nama ringkas/penuh pasangan, turutan nama dan monogram pilihan.
3. Nama ibu bapa/keluarga kedua-dua pihak serta arahan paparan.
4. Tarikh Masihi, tarikh Hijrah yang disahkan, masa mula/tamat dan zon masa.
5. Nama tempat, alamat penuh, Google Maps/Waze, pin peta serta arahan lokasi.
6. Atur cara lengkap dan sesi tambahan.
7. Maksimum empat orang penganjur, setiap seorang boleh mempunyai beberapa nombor hubungan.
8. Bismillah, pantun, teks jemputan/penutup, doa dan dress code.
9. Tema warna, font, reference reka bentuk, folder gambar, susunan/caption, cover dan galeri.
10. Muzik, rujukan/fail audio serta kebenaran penggunaannya.
11. Pilihan RSVP, had tetamu, moderasi dan paparan ucapan.
12. Nama pautan/domain, metadata perkongsian dan pilihan enjin carian.
13. Permintaan tambahan, aksesibiliti dan semakan draft.
14. Pengesahan ketepatan maklumat serta persetujuan penerbitan kandungan kad.

Soalan ke-15 ialah checkbox wajib yang mengesahkan persetujuan bagi ketiga-tiga perkara dalam kumpulan 14.

Galeri menyediakan pilihan auto setiap dua saat; ucapan menyediakan pilihan maksimum tiga pada satu masa, bertukar setiap lima saat. Pilihan lain boleh diminta, tetapi sokongan dan skopnya perlu disahkan semasa semakan tempahan.

## Pengurusan jawapan

- Kongsi **pautan responden** sahaja dengan pelanggan. Pautan editor, pautan edit jawapan, jawapan mentah dan fail CSV tidak boleh dimasukkan dalam GitHub awam.
- Maklumat pelanggan pada bahagian pertama adalah untuk urusan tempahan. Hanya maklumat penganjur/kandungan kad yang dipersetujui dimasukkan pada laman jemputan.
- Media dihantar melalui pautan folder/fail. Borang tidak mempunyai soalan upload fail. Tetapan **Collect email addresses** ialah **Do not collect** dan **Limit to 1 response** dimatikan; email pelanggan diminta sebagai teks untuk urusan tempahan dalam kumpulan pertama.
- Tetapan **View results summary** dimatikan. Jawapan tidak dipaparkan sebagai ringkasan awam dan tiada email/notifikasi automatik ditetapkan.
- Semak jawapan melalui tab **Responses** dalam Google Forms milik pemilik borang. Gunakan pilihan muat turun CSV apabila perlu membuat serahan kerja; simpan eksport itu di tempat peribadi.
- Semak ejaan, tarikh Hijrah, waktu pagi/petang, pin pintu masuk, nombor hubungan dan akses folder media sebelum membina draft.
- Jana projek kad baharu untuk setiap pasangan. Jika menggunakan RSVP, gunakan projek Vercel dan database Neon berasingan supaya data tetamu tidak bercampur.
- Jangan meminta connection string, password, token, nombor pengenalan atau maklumat bank melalui borang ini. Akses teknikal diurus secara berasingan.

## Aliran tempahan ke kad baharu

1. Pelanggan mengisi borang dan menghantar pautan media yang dibenarkan.
2. Pembuat kad menyemak jawapan serta perkara yang belum pasti.
3. Jalankan `npm run create:invite -- --output ../kad-baru`, isi konfigurasi projek baharu dan masukkan media.
4. Jalankan build/check, semak draft pada telefon/desktop dan dapatkan pengesahan kandungan pelanggan.
5. Terbitkan kad pada deployment tersendiri dan uji pautan, lokasi, muzik, kalendar serta RSVP jika diaktifkan.

Pemindahan jawapan ke projek belum diautomatikkan: borang ialah intake lengkap, bukannya janji bahawa semua permintaan tersuai boleh dilaksanakan tanpa semakan.

## Generator borang

`scripts/google-form.gs` ialah generator pilihan menggunakan [Google Apps Script Forms Service](https://developers.google.com/apps-script/reference/forms/form). **Ia bukan skrip yang mengurus borang live di atas**: borang live dicipta melalui editor Google Forms. Generator ini menawarkan versi alternatif yang memisahkan maklumat kepada 73 soalan dalam 14 halaman/bahagian; ia tidak perlu dijalankan untuk menggunakan pautan pelanggan sedia ada.

Jika versi berasingan itu diperlukan, jalankan fungsi `createWeddingOrderForm` dalam projek Apps Script milik pemilik borang. Google mungkin meminta pemilik meluluskan akses Forms pada penggunaan pertama; kelulusan itu dilakukan sendiri oleh pemilik akaun. Jangan menggantikan pautan pelanggan sedia ada sebelum borang pengganti disemak dan diterbitkan.

Skrip menyimpan ID borang melalui Script Properties, menyambung binaan yang terhenti jika susunan item masih sepadan, dan tidak memadam rekod. Selepas borang diterbitkan, execution log memberikan pautan responden dan pautan editor; hanya pautan responden patut disalin ke dokumentasi awam.
