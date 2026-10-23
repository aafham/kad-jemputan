// Kandungan contoh sahaja. Tukar butiran ini sebelum mengedarkan jemputan.
window.invitationConfig = {
  metadata: {
    // Kosongkan title/description untuk dijana melalui npm run build.
    title: "",
    description: "",
    robots: "noindex,nofollow",
    // Masukkan URL deployment projek baharu selepas diterbitkan.
    url: "",
    image: "",
    imageAlt: "Monogram pasangan pengantin"
  },
  couple: {
    bride: "Hawa",
    groom: "Adam",
    // displayNames pilihan; jika tiada, turutan nama ialah groom kemudian bride.
    fullNames: ["Nama Penuh Pengantin Lelaki", "Nama Penuh Pengantin Perempuan"],
  },
  event: {
    title: "Undangan Majlis Perkahwinan",
    // dateText dan timeText kosong dijana daripada dateTime/endDateTime semasa build.
    dateText: "",
    hijriDate: "", // Isi hanya selepas tarikh Hijrah disahkan.
    dateTime: "2030-12-21T11:00:00+08:00",
    endDateTime: "2030-12-21T16:00:00+08:00",
    timeText: "",
    venue: "Nama Dewan / Lokasi Majlis",
    address: "Alamat penuh lokasi majlis"
  },
  family: {
    hosts: [{ label: "", people: ["Bapa Pengantin", "Ibu Pengantin"] }]
  },
  invitation: {
    heading: "Undangan Majlis Perkahwinan",
    bismillah: "بِسۡـــــــــمِ ٱللهِ ٱلرَّحۡـمَـٰنِ ٱلرَّحِـــــــيمِ",
    pantun:
      "Bunga melur di atas para,\nHarum mewangi sepanjang laman,\nDengan penuh takzim kami bicara,\nSudilah hadir ke majlis perkahwinan.",
    intro:
      "Dengan penuh kesyukuran, kami menjemput Dato' | Datin | Tuan | Puan | Encik | Cik ke majlis perkahwinan anakanda kami.",
    closing: "Kehadiran anda amat kami alu-alukan, terima kasih."
  },
  cover: {
    // Kosong: gunakan cover monogram neutral daripada nama pasangan semasa build.
    image: ""
  },
  map: {
    enabled: false,
    query: "",
    googleMapsUrl: "",
    wazeUrl: "",
    embedUrl: ""
  },
  contact: {
    whatsapp: "",
    rsvpName: "",
    people: []
  },
  calendar: {
    title: "Tarikh Majlis",
    locale: "ms-MY",
    weekStartsOn: 0
  },
  schedule: [
    { time: "11.00 pagi", title: "Majlis Bermula" },
    { time: "12.00 tgh.", title: "Ketibaan Pengantin" },
    { time: "4.00 petang", title: "Majlis Tamat" }
  ],
  // Aktifkan hanya setelah database dan environment projek baharu tersedia.
  rsvp: {
    enabled: false,
    endpoint: "/api/rsvp"
  },
  dressCode: {},
  gallery: [
    {
      src: "assets/images/photo-01.svg",
      alt: "Gambar contoh galeri 01 — gantikan dengan gambar anda",
      layout: "portrait"
    },
    {
      src: "assets/images/photo-02.svg",
      alt: "Gambar contoh galeri 02 — gantikan dengan gambar anda",
      layout: "portrait"
    },
    {
      src: "assets/images/photo-03.svg",
      alt: "Gambar contoh galeri 03 — gantikan dengan gambar anda",
      layout: "portrait"
    }
  ],
  audio: {
    enabled: false,
    src: ""
  }
};
