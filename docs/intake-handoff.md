# Serahan tempahan kepada pembuat kad

Rujuk [borang tempahan](../README.md#borang-tempahan) untuk pautan pelanggan selepas borang diterbitkan. Borang ini untuk menempah kad baharu, bukan RSVP tetamu.

Butiran asal 73 medan dikumpulkan dalam 14 ruangan berkelompok, bersama satu pengesahan persetujuan. Pelanggan perlu menjawab setiap subperkara dalam ruangan tersebut; tulis “Tidak berkenaan” atau “Belum pasti” jika perlu.

## Cara mengurus satu tempahan

1. Buka tab Responses / Jawapan dalam Google Forms. Salin jawapan seorang pelanggan, atau muat turun CSV dan asingkan jawapan pelanggan itu sahaja. Jangan serahkan semua pelanggan sekali gus.
2. Hantar jawapan tersebut kepada kami melalui saluran peribadi, bersama pautan gambar, cover dan audio yang dipilih. Pastikan kami diberi akses kepada fail yang diperlukan sahaja; tidak perlu membuka seluruh folder kepada umum.
3. Kami semak maklumat yang belum lengkap, sahkan permintaan tambahan dan sediakan projek kad berasingan. Jawapan dipindahkan secara manual ke konfigurasi; bukan semua pilihan borang tersedia secara automatik.
4. Semak draf bersama pelanggan sebelum menerbitkan: ejaan nama, susunan keluarga, tarikh dan masa, tarikh Hijrah yang disahkan, pin peta, nombor penganjur, gambar, muzik dan Save The Date. Terbitkan hanya selepas pelanggan mengesahkan kandungan yang boleh dipaparkan.

## Jawapan masuk ke bahagian mana?

Kunci di bawah berada dalam `config.js` projek kad pelanggan, bukan kad asal.

| Kumpulan jawapan | Tempat digunakan |
| --- | --- |
| 1. Pelanggan dan tempahan; 13. permintaan tambahan; 14. pengesahan | Nota kerja dan kelulusan peribadi. Maklumat hubungan pelanggan tidak dimasukkan pada kad secara automatik. |
| 2. Nama pasangan; 3. ibu bapa dan keluarga | `couple.groom`, `couple.bride`, `couple.displayNames`, `couple.fullNames` dan `family.hosts`. Monogram khas perlu disemak berasingan. |
| 4. Tarikh dan masa | `event.dateTime`, `event.endDateTime`, `event.dateText`, `event.timeText` dan `event.hijriDate`. Zon masa selain Malaysia perlu disahkan dahulu. |
| 5. Lokasi | `event.venue`, `event.address` dan `map`. Semak pin pintu masuk sebelum mengaktifkan peta. |
| 6. Atur cara; 7. penganjur | `schedule` dan `contact.people`, termasuk nama serta senarai nombor setiap penganjur. |
| 8. Teks jemputan dan pakaian | `invitation` dan `dressCode`. |
| 9. Reka bentuk dan gambar; 10. muzik | `cover.image`, `gallery`, `audio.enabled` dan `audio.src`. Warna, font, susunan khas dan fail media disediakan berasingan. |
| 11. RSVP dan ucapan | `rsvp.enabled`. Had tetamu, moderasi dan pilihan paparan disemak dahulu; RSVP menggunakan projek dan database pelanggan sendiri. |
| 12. Pautan dan preview | `metadata.url`, `metadata.title`, `metadata.description`, `metadata.image` dan `metadata.robots`. Domain diurus berasingan. |

Simpan jawapan, CSV, pautan edit borang/jawapan, akses media dan kelulusan pelanggan secara peribadi. Jangan masukkan bahan ini atau kata laluan, token dan rahsia sambungan database ke GitHub. Hanya kandungan kad yang pelanggan benarkan diterbitkan dimasukkan ke projek awam.
