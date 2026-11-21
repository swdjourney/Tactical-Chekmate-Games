# Tactical Checkmate: Operation Defuse
**2D Top-Down Tactical Puzzle & Stealth Web Game**

- **Nama Mahasiswa:** Moh. Arlyano Swandaru
- **NIM:** 3012310044
- **Program Studi:** S1 Informatika
- **Mata Kuliah:** Desain Game
- **Genre:** 2D Top-Down Tactical Puzzle & Stealth
- **Platform:** Web Browser (HTML5 Canvas & Web Audio / Construct 3 Architecture)

---

## 🎯 Gambaran Game (High Concept)
**Tactical Checkmate: Operation Defuse** memadukan mekanik pergerakan bidak catur berbasis petak ubin (*grid-based*) dengan misi penyusupan dan penjinakan bom taktis ala *Counter-Strike*. Pemain mengendalikan agen penjinak bom elit berkode **White Pawn** yang menyusup ke fasilitas riset militer bawah tanah **The Grandmaster Facility** untuk melumpuhkan sindikat paramiliter **Black King** dan menjinakkan bom waktu C4 sebelum detonasi.

---

## 🎮 Cara Menjalankan Game
Game ini dirancang murni menggunakan **HTML5 Canvas, CSS3, dan Web Audio API** tanpa perlu instalasi pihak ketiga atau dependensi rumit:

1. **Cara Paling Cepat (Langsung di Browser):**
   - Buka folder `d:\tactical checkmate`.
   - Cukup klik dua kali (double-click) file `index.html`.
   - Game langsung dapat dimainkan di browser modern apa pun (Google Chrome, Microsoft Edge, Mozilla Firefox).

2. **Melalui Local Web Server (Opsional):**
   ```bash
   node server.js
   ```
   Buka browser di `http://localhost:3000`.

---

## 🕹️ Skema Kontrol (Controls)

| Tombol Input | Aksi / Fungsi |
|---|---|
| **W, A, S, D / Tombol Panah** | Gerak per petak (*Rook Mode*) ke 4 arah mata angin (Atas, Bawah, Kiri, Kanan). |
| **Shift** (atau Klik UI Knight Dash) | Mengaktifkan mode lompatan **Knight Dash** (pola huruf "L": 2 lurus + 1 samping). Memiliki cooldown 4 detik. |
| **Spasi / E (Tahan)** | Melakukan penjinakan bom (**Defuse**) saat berada di petak C4 hingga 100%. |
| **R** | Quick Restart seketika mengulang level jika salah perhitungan. |
| **Mouse / Touch Screen** | Klik petak yang disorot (biru/cyan) untuk melompat atau klik petak tetangga untuk melangkah. |

---

## 🛡️ Mekanik Permainan (Core Mechanics)

1. **Sistem Gerak Hybrid Catur:**
   - **Mode Benteng (Rook Mode):** Bergerak 1 petak horizontal atau vertikal, terhalang oleh tembok beton dan peti kayu.
   - **Mode Kuda (Knight Dash):** Melompati rintangan peti kontainer rendah (*Low Cover*) atau melompati koridor pengawasan musuh dengan pola huruf "L". Cooldown 4 detik. Menampilkan visualisasi garis lintasan bercahaya biru/cyan.
2. **Stealth & Line of Sight (LOS):**
   - Setiap musuh dan kamera CCTV memiliki kerucut cahaya merah (*Field of View*).
   - Kerucut pandang terhalang secara fisik oleh tembok solid (*Raycasting Occlusion*).
   - Jika pemain masuk ke area pandang musuh: Alarm menyala dan misi gagal (*Game Over*).
3. **Eliminasi Senyap (Stealth Takedown):**
   - Jika pemain melangkah ke petak musuh dari arah belakang atau titik buta (*blind spot*), musuh akan dilumpuhkan seketika tanpa memicu alarm (+1 Takedown).
4. **Keycard & Pintu Lapis Baja:**
   - Pada Level 2 dan 3, pintu bombsite terkunci rapat. Pemain harus mengambil kartu akses (*Keycard*) di ruang keamanan untuk membukanya.
5. **Penjinakan Bom C4 (Defuse):**
   - Melangkah ke petak bom C4, tahan tombol `[Spasi]` atau `[E]` selama 3 detik hingga meteran penjinakan mencapai 100%.

---

## 🗺️ Struktur & Desain Level

- **Level 1: The Rook’s Corridor (Tutorial & Dasar)**
  - Pengenalan gerak Rook, sembunyi di balik tembok, takedown dari blind spot, dan penjinakan bom C4.
  - Target: Jinakkan 1 bom C4 dalam waktu **90 detik**.
  - Rintangan: 2 penjaga statis satu arah.
- **Level 2: Knight’s Ambush (Menengah)**
  - Pengenalan kemampuan lompatan Knight Dash melompati peti kayu, pengambilan Keycard, dan membuka pintu blast door.
  - Target: Ambil Keycard dan jinakkan bom C4 dalam waktu **75 detik**.
  - Rintangan: 3 penjaga patroli bergerak bolak-balik, peti rendah.
- **Level 3: Checkmate Protocol (Tantangan Akhir)**
  - Penerapan seluruh keahlian taktis: rotasi pandang penjaga elit, kamera CCTV otomatis, dan 2 bom waktu terpisah.
  - Target: Jinakkan 2 bom (Bombsite A & Bombsite B) dalam waktu **60 detik**.
  - Rintangan: 4 penjaga elit berotasi 360°, 2 kamera CCTV dinamis.

---

## 📁 Struktur Berkas Proyek

```
tactical checkmate/
├── index.html              # Antarmuka game, viewport canvas, HUD & modal
├── server.js               # Web server lokal statis (Node.js)
├── README.md               # Ringkasan proyek & panduan bermain
├── DOKUMENTASI_PROYEK.md   # Dokumen perancangan akademik & mapping Construct 3
├── css/
│   └── style.css           # Styling cyber-tactical tema Grandmaster Facility
└── js/
    ├── audio.js            # Synthesizer audio prosedural Web Audio API
    ├── levels.js           # Konfigurasi data Level 1, 2, dan 3
    ├── renderer.js         # Canvas rendering engine, LOS raycasting, visual FX
    └── game.js             # State manager, logika grid catur, stealth & AI
```
