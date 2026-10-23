/**
 * Generator PILIHAN untuk borang alternatif 73 soalan / 14 bahagian.
 * Borang live dalam docs/order-form.md dicipta melalui editor Google Forms;
 * skrip ini tidak mengubah borang live tersebut.
 * Jalankan createWeddingOrderForm dalam projek Apps Script tersendiri jika perlu.
 * Hanya pautan responden boleh dimasukkan ke repository awam.
 * Tiada email dihantar, tiada jawapan contoh, tiada perkongsian jawapan awam.
 * Rujukan API: https://developers.google.com/apps-script/reference/forms/form
 */
function createWeddingOrderForm() {
  var properties = PropertiesService.getScriptProperties();
  var existingId = properties.getProperty('WEDDING_ORDER_FORM_ID');
  var form = existingId ? FormApp.openById(existingId) : FormApp.create('Borang Tempahan Kad Jemputan Perkahwinan Digital', false);
  if (!existingId) properties.setProperty('WEDDING_ORDER_FORM_ID', form.getId());
  var specification = weddingOrderQuestions();

  // Resume hanya dengan struktur/tajuk sepadan; jangan padam borang atau jawapan.
  var existingItems = form.getItems();
  if (existingItems.length > specification.length) throw new Error('Struktur borang telah berubah. Semak borang sedia ada sebelum menjana semula.');
  existingItems.forEach(function (item, index) {
    if (item.getTitle() !== specification[index].title) throw new Error('Tajuk item ' + index + ' berubah. Semak borang sedia ada; tiada item dipadam.');
  });

  form.setDescription('Sila lengkapkan maklumat untuk menghasilkan kad jemputan anda. Anggaran 15–20 minit; sediakan tarikh, alamat, pautan lokasi dan folder media. Ruangan bertanda * wajib. Jika belum pasti, nyatakan dengan jelas supaya boleh disahkan sebelum kad diterbitkan.\n\nBorang ini untuk TEMPAHAN kad, bukan RSVP tetamu. Nama, email dan telefon pelanggan digunakan untuk urusan tempahan sahaja. Hanya kandungan kad yang dipersetujui akan dipaparkan pada laman jemputan. Jangan masukkan nombor kad pengenalan, kata laluan, connection string database, akaun bank atau maklumat sulit.');
  form.setIsQuiz(false).setCollectEmail(false).setLimitOneResponsePerUser(false);
  form.setPublishingSummary(false).setShowLinkToRespondAgain(false).setAllowResponseEdits(true);
  form.setProgressBar(true).setShuffleQuestions(false);
  form.setConfirmationMessage('Terima kasih! Maklumat tempahan anda telah diterima. Semakan maklumat dan draft kad dibuat sebelum penerbitan. Simpan pautan edit jawapan jika dipaparkan untuk membetulkan maklumat; hubungi pembuat kad untuk sebarang perubahan selepas kad diluluskan.');

  for (var index = existingItems.length; index < specification.length; index++) {
    var question = specification[index];
    var item;
    if (question.type === 'section') {
      item = index === 0 ? form.addSectionHeaderItem() : form.addPageBreakItem();
    } else if (question.type === 'paragraph') {
      item = form.addParagraphTextItem().setRequired(Boolean(question.required));
    } else if (question.type === 'choice') {
      item = form.addMultipleChoiceItem().setChoiceValues(question.options).setRequired(Boolean(question.required));
    } else if (question.type === 'checkbox') {
      item = form.addCheckboxItem().setChoiceValues(question.options).setRequired(Boolean(question.required));
    } else if (question.type === 'date') {
      item = form.addDateItem().setIncludesYear(true).setRequired(Boolean(question.required));
    } else if (question.type === 'time') {
      item = form.addTimeItem().setRequired(Boolean(question.required));
    } else {
      item = form.addTextItem().setRequired(Boolean(question.required));
      if (question.validation === 'email') item.setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Masukkan alamat email yang sah.').build());
      if (question.validation === 'url') item.setValidation(FormApp.createTextValidation().requireTextIsUrl().setHelpText('Masukkan pautan penuh bermula dengan https://').build());
      if (question.validation === 'phone') item.setValidation(FormApp.createTextValidation().requireTextMatchesPattern('^\\+?[0-9][0-9 ()-]{7,20}$').setHelpText('Masukkan nombor telefon yang sah, termasuk kod negara jika di luar Malaysia.').build());
    }
    item.setTitle(question.title);
    if (question.help) item.setHelpText(question.help);
  }

  if (form.supportsAdvancedResponderPermissions()) form.setPublished(true);
  form.setAcceptingResponses(true);
  properties.setProperty('WEDDING_ORDER_FORM_READY', 'true');
  var result = {
    respondentUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
    sections: specification.filter(function (item) { return item.type === 'section'; }).length,
    questions: specification.filter(function (item) { return item.type !== 'section'; }).length,
    responseSummaryPublished: form.isPublishingSummary()
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function weddingOrderQuestions() {
  return [
    { type: 'section', title: '1. Maklumat pelanggan & tempahan', help: 'Maklumat hubungan dalam bahagian ini untuk pengurusan tempahan sahaja, bukan untuk dipaparkan pada kad.' },
    { title: 'Nama pelanggan / wakil tempahan', required: true },
    { title: 'Email untuk urusan tempahan', required: true, validation: 'email' },
    { title: 'Nombor WhatsApp pelanggan', required: true, validation: 'phone', help: 'Digunakan oleh pembuat kad untuk semakan dan penghantaran draft.' },
    { type: 'choice', title: 'Hubungan dengan pengantin', required: true, options: ['Pengantin lelaki', 'Pengantin perempuan', 'Ibu / bapa / keluarga', 'Wakil / rakan / perancang majlis'] },
    { type: 'date', title: 'Tarikh kad diperlukan / mula edar', required: true },

    { type: 'section', title: '2. Nama pasangan & susunan paparan', help: 'Ejaan nama akan digunakan pada cover, kandungan kad dan kalendar. Sila semak huruf besar/kecil, bin/binti dan gelaran.' },
    { title: 'Nama ringkas pengantin lelaki', required: true },
    { title: 'Nama ringkas pengantin perempuan', required: true },
    { title: 'Nama penuh pengantin lelaki', required: true },
    { title: 'Nama penuh pengantin perempuan', required: true },
    { type: 'choice', title: 'Susunan nama pada cover dan dalam kad', required: true, options: ['Lelaki dahulu / kiri / atas', 'Perempuan dahulu / kiri / atas', 'Susunan khas — jelaskan di ruangan berikut'] },
    { type: 'paragraph', title: 'Susunan / ejaan paparan khas', help: 'Jika ada perbezaan antara cover dan bahagian dalam, nyatakan kedua-duanya.' },
    { title: 'Initial / monogram pilihan', help: 'Pilihan. Contoh A & H; kosongkan untuk menggunakan huruf pertama nama ringkas.' },

    { type: 'section', title: '3. Ibu bapa & keluarga yang menjemput', help: 'Bahagian ini akan dipaparkan kepada tetamu. Masukkan gelaran dan ejaan tepat. Jika tidak berkenaan, tulis “Tidak berkenaan”.' },
    { type: 'choice', title: 'Pihak yang menjemput', required: true, options: ['Keluarga pengantin lelaki', 'Keluarga pengantin perempuan', 'Kedua-dua keluarga', 'Pengantin sendiri / pihak lain'] },
    { type: 'paragraph', title: 'Nama ibu bapa / penjaga pihak lelaki', required: true, help: 'Satu nama setiap baris; sertakan gelaran En./Puan/Dato\' jika diperlukan.' },
    { type: 'paragraph', title: 'Nama ibu bapa / penjaga pihak perempuan', required: true, help: 'Satu nama setiap baris. Jika nama pihak ini tidak mahu dipaparkan, nyatakan di bawah.' },
    { type: 'paragraph', title: 'Nama keluarga / wakil tambahan & arahan paparan', help: 'Nyatakan keluarga mana yang perlu dipaparkan, turutan nama, nama arwah (jika ingin dinyatakan) atau gelaran khas.' },

    { type: 'section', title: '4. Tarikh & masa majlis', help: 'Tarikh Masihi menjadi asas countdown dan Save The Date. Masa tamat mesti selepas masa mula; untuk majlis melangkaui tengah malam, isi tarikh tamat.' },
    { type: 'date', title: 'Tarikh majlis — Masihi', required: true },
    { title: 'Tarikh Hijrah untuk dipaparkan', help: 'Pilihan. Salin hanya tarikh yang telah disahkan; kosongkan jika belum pasti.' },
    { type: 'choice', title: 'Pengesahan tarikh Hijrah', required: true, options: ['Telah disahkan — gunakan tarikh yang saya isi', 'Belum disahkan — jangan paparkan dahulu', 'Tidak perlu paparkan tarikh Hijrah'] },
    { type: 'time', title: 'Masa majlis bermula', required: true, help: 'Pilih waktu pagi/petang dengan teliti.' },
    { type: 'time', title: 'Masa majlis tamat', required: true },
    { type: 'date', title: 'Tarikh tamat jika berlainan daripada tarikh majlis', help: 'Kosongkan jika majlis bermula dan tamat pada hari yang sama.' },
    { type: 'choice', title: 'Zon masa majlis', required: true, options: ['Malaysia — Asia/Kuala_Lumpur (UTC+08:00)', 'Singapura — Asia/Singapore (UTC+08:00)', 'Zon masa lain — nyatakan di bawah'] },
    { title: 'Zon masa lain / nota tarikh dan masa', help: 'Jika di luar Malaysia/Singapura, nyatakan bandar, negara dan zon masa; pembuat kad akan sahkan sokongan.' },

    { type: 'section', title: '5. Lokasi, alamat & pin peta', help: 'Semak pin di pintu masuk yang betul, bukan sekadar nama kawasan. Alamat dan pautan lokasi ini akan dipaparkan pada kad.' },
    { title: 'Nama dewan / tempat majlis', required: true },
    { type: 'paragraph', title: 'Alamat penuh lokasi majlis', required: true, help: 'Sertakan nombor rumah/lot, jalan, taman/kampung, poskod, bandar dan negeri.' },
    { title: 'Pautan Google Maps lokasi majlis', required: true, validation: 'url', help: 'Pautan Share daripada Google Maps. Pastikan pin tepat.' },
    { title: 'Pautan Waze lokasi majlis', validation: 'url' },
    { title: 'Pautan embed Google Maps / koordinat pin', help: 'Pilihan. Isi URL embed atau latitud,longitud. Jangan tampal kod yang mengandungi maklumat sulit.' },
    { type: 'choice', title: 'Adakah pin lokasi sudah disemak?', required: true, options: ['Ya, pin dan pintu masuk betul', 'Belum — perlu semakan sebelum diterbitkan'] },
    { type: 'paragraph', title: 'Arahan parkir / mercu tanda / akses lokasi', help: 'Pilihan, hanya jika perlu dipaparkan kepada tetamu.' },

    { type: 'section', title: '6. Atur cara majlis', help: 'Satu baris bagi setiap acara: MASA — NAMA ACARA. Nyatakan pagi/tengah hari/petang/malam untuk mengelakkan kekeliruan.' },
    { type: 'paragraph', title: 'Senarai lengkap atur cara', required: true, help: 'Contoh: 11.00 pagi — Majlis Bermula\n12.00 tengah hari — Ketibaan Pengantin\n4.00 petang — Majlis Tamat' },
    { type: 'paragraph', title: 'Catatan acara / sesi tambahan', help: 'Akad nikah, jamuan, bersanding atau lokasi lain; nyatakan tarikh dan tempat jika berlainan. Sokongan akan disahkan semasa semakan.' },

    { type: 'section', title: '7. Hubungi penganjur — maksimum 4 orang', help: 'Nombor di sini untuk paparan awam pada kad dengan butang WhatsApp dan panggilan. Pastikan pemilik nombor bersetuju. Seorang boleh mempunyai lebih daripada satu nombor; tulis pada baris berasingan.' },
    { title: 'Penganjur 1 — nama / gelaran untuk paparan', required: true },
    { type: 'paragraph', title: 'Penganjur 1 — nombor telefon / WhatsApp', required: true, help: 'Sertakan kod negara jika bukan nombor Malaysia.' },
    { title: 'Penganjur 2 — nama / gelaran untuk paparan' },
    { type: 'paragraph', title: 'Penganjur 2 — nombor telefon / WhatsApp' },
    { title: 'Penganjur 3 — nama / gelaran untuk paparan' },
    { type: 'paragraph', title: 'Penganjur 3 — nombor telefon / WhatsApp' },
    { title: 'Penganjur 4 — nama / gelaran untuk paparan' },
    { type: 'paragraph', title: 'Penganjur 4 — nombor telefon / WhatsApp' },

    { type: 'section', title: '8. Teks jemputan & pilihan kandungan', help: 'Kosongkan ruangan pilihan untuk menggunakan teks templat. Teks khusus akan disemak sebelum diterbitkan.' },
    { type: 'choice', title: 'Paparan Bismillah', required: true, options: ['Kekalkan Bismillah sedia ada', 'Tidak perlu Bismillah', 'Teks khas — masukkan di ruangan nota'] },
    { type: 'paragraph', title: 'Pantun pilihan', help: 'Pilihan; satu baris bagi setiap rangkap/baris pantun. Kosongkan untuk pantun templat.' },
    { type: 'paragraph', title: 'Ayat jemputan / kata alu-aluan', help: 'Pilihan. Nyatakan gelaran tetamu yang dikehendaki seperti Dato\' | Datin | Tuan | Puan | Encik | Cik.' },
    { type: 'paragraph', title: 'Ayat penutup / doa / nota teks khas' },
    { title: 'Dress code / tema pakaian tetamu', help: 'Pilihan. Kosongkan jika tidak perlu dipaparkan.' },

    { type: 'section', title: '9. Reka bentuk, gambar & galeri', help: 'Hantar media melalui pautan folder Drive/Dropbox dan beri akses hanya kepada pembuat kad. Tiada upload fail dalam borang supaya responden tidak perlu login Google. Jangan beri pautan folder yang mengandungi dokumen peribadi lain.' },
    { type: 'choice', title: 'Pilihan gaya reka bentuk', required: true, options: ['Kekalkan templat floral krim & emas', 'Ubah warna / font daripada templat', 'Ada reference sendiri — isi pautan dan nota di bawah', 'Perlukan cadangan pembuat kad'] },
    { title: 'Warna tema pilihan', help: 'Nama warna / kod HEX jika ada. Pilihan.' },
    { type: 'paragraph', title: 'Pilihan font / gaya nama / nota reka bentuk' },
    { title: 'Pautan reference reka bentuk', validation: 'url' },
    { title: 'Pautan folder gambar galeri / cover', validation: 'url', help: 'Pastikan pembuat kad mempunyai akses; jangan kongsi dokumen lain. Media tidak dimuat turun secara automatik oleh borang.' },
    { type: 'paragraph', title: 'Susunan gambar, caption & pilihan cover', help: 'Contoh: 01.jpg — Cover; 02.jpg — Caption; 03.jpg — Caption. Nyatakan gambar yang tidak boleh dipaparkan. Gambar menegak/melintang diterima.' },
    { type: 'choice', title: 'Galeri automatik', required: true, options: ['Auto bertukar setiap 2 saat dengan kawalan jeda / manual', 'Manual sahaja', 'Tidak perlu galeri', 'Tetapan lain — jelaskan dalam nota tambahan'] },

    { type: 'section', title: '10. Muzik latar', help: 'Muzik dimainkan selepas tetamu membuka kad. Pautan YouTube hanya sebagai rujukan lagu; ia bukan fail audio dan bukan bukti lesen.' },
    { type: 'choice', title: 'Pilihan muzik', required: true, options: ['Tiada muzik', 'Saya sediakan fail audio yang dibenarkan', 'Perlukan cadangan muzik berlesen'] },
    { title: 'Tajuk lagu / nama penyanyi' },
    { title: 'Pautan rujukan lagu atau folder fail audio', validation: 'url', help: 'Jika menyediakan fail, beri pautan fail/folder yang boleh diakses pembuat kad. Gunakan MP3 yang anda dibenarkan terbitkan.' },
    { type: 'choice', title: 'Kebenaran penggunaan muzik', required: true, options: ['Tiada muzik diperlukan', 'Saya mempunyai hak / kebenaran untuk muzik yang diberikan', 'Hak belum disahkan — jangan terbitkan muzik dahulu'] },

    { type: 'section', title: '11. RSVP & ucapan tetamu', help: 'Ini tetapan fungsi kad, bukan borang RSVP tetamu. RSVP mengumpul nama, kehadiran, jumlah tetamu dan ucapan pilihan; tiada nombor telefon tetamu. Data setiap pasangan disimpan berasingan.' },
    { type: 'choice', title: 'Aktifkan RSVP pada kad?', required: true, options: ['Ya — borang RSVP & ucapan', 'Tidak — kad jemputan sahaja', 'Belum pasti — bincang dahulu'] },
    { type: 'choice', title: 'Had jumlah tetamu bagi satu penghantaran RSVP', required: true, options: ['1 orang', '2 orang', '3 orang', '4 orang', '5 orang', '6 orang', '7 orang', '8 orang', '9 orang', '10 orang', 'Tidak berkenaan / ikut cadangan'] },
    { type: 'choice', title: 'Cara terbitkan ucapan', required: true, options: ['Terus dipaparkan selepas dihantar', 'Semak dahulu sebelum diterbitkan (moderasi)', 'RSVP tanpa ucapan awam', 'Tidak berkenaan'] },
    { type: 'choice', title: 'Paparan ucapan & doa', required: true, options: ['Maksimum 3 ucapan, bertukar setiap 5 saat dengan jeda / manual', 'Manual sahaja', 'Tidak perlu bahagian ucapan', 'Tetapan lain — nyatakan dalam nota tambahan'] },
    { type: 'paragraph', title: 'Nota pengurusan RSVP / ucapan', help: 'Contoh: wakil yang akan menyemak ucapan atau tarikh tutup. Jangan masukkan password, token atau connection string database.' },

    { type: 'section', title: '12. Pautan kad & preview perkongsian', help: 'Nama pautan tertakluk kepada ketersediaan. Domain tersuai atau fungsi tambahan akan disahkan berasingan sebelum dilaksanakan.' },
    { title: 'Cadangan nama pautan kad', help: 'Contoh format: adam-hawa. Jangan masukkan kata laluan / token.' },
    { title: 'Domain sendiri jika sudah ada', help: 'Pilihan. Nama domain sahaja; akses akaun/domain akan diurus secara berasingan.' },
    { title: 'Tajuk preview WhatsApp / media sosial', help: 'Pilihan; kosongkan untuk tajuk berdasarkan nama pasangan.' },
    { type: 'paragraph', title: 'Penerangan ringkas preview pautan', help: 'Pilihan; kosongkan untuk ayat ringkas berdasarkan butiran majlis.' },
    { title: 'Nama fail gambar untuk preview perkongsian', help: 'Gunakan nama fail dalam folder media yang anda beri; kosongkan untuk cover.' },
    { type: 'choice', title: 'Paparan pada enjin carian', required: true, options: ['Tidak perlu diindeks (noindex)', 'Mahukan kad boleh dicari — bincang dahulu'] },

    { type: 'section', title: '13. Permintaan tambahan & semakan draft', help: 'Templat ialah asas; permintaan di luar fungsi sedia ada akan disemak dahulu. Tiada pembayaran, akaun bank atau dokumen identiti diperlukan dalam borang ini.' },
    { type: 'paragraph', title: 'Permintaan tambahan / aksesibiliti / perkara yang perlu dielakkan' },
    { type: 'paragraph', title: 'Nota tarikh siap, urusan semakan & perubahan', help: 'Jika ada tarikh khusus untuk draft/kelulusan, nyatakan di sini. Maklumat belum lengkap boleh ditandakan untuk semakan.' },

    { type: 'section', title: '14. Pengesahan & persetujuan', help: 'Kad yang diterbitkan boleh dibuka oleh sesiapa yang mempunyai pautan. noindex bukan kata laluan. Jawapan tempahan ini tidak diterbitkan sebagai senarai awam.' },
    { type: 'checkbox', title: 'Persetujuan penerbitan kandungan kad', required: true, options: ['Saya mempunyai kebenaran daripada pihak berkaitan untuk menerbitkan nama, alamat majlis, nombor penganjur dan foto yang dipilih pada kad jemputan awam.'] },
    { type: 'checkbox', title: 'Pengesahan maklumat & semakan', required: true, options: ['Saya akan menyemak ejaan nama, tarikh, masa, tarikh Hijrah, pin peta dan nombor hubungan pada draft; maklumat yang belum pasti telah dinyatakan.'] },
    { type: 'checkbox', title: 'Penggunaan maklumat tempahan', required: true, options: ['Saya bersetuju maklumat hubungan dan jawapan borang digunakan untuk mengurus tempahan serta menghasilkan kad; jawapan dan pautan edit tidak dikongsi dalam repository awam.'] }
  ];
}
