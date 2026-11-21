# DOKUMEN IMPLEMENTASI TEKNIS & ARSITEKTUR GAME
# TACTICAL CHECKMATE: OPERATION DEFUSE

**Mata Kuliah:** Desain Game  
**Program Studi:** S1 Informatika  
**Nama Mahasiswa:** Moh. Arlyano Swandaru  
**NIM:** 3012310044  
**Topik:** Game Taktis 2D Hybrid Catur & Stealth Penjinakan Bom  

---

## 1. PENDAHULUAN & PENJELASAN KONSEP
Dokumen ini disusun sebagai laporan teknis komprehensif atas implementasi game **Tactical Checkmate: Operation Defuse** yang dikembangkan berdasarkan *Game Design Document (GDD)* yang telah ditetapkan. 

Game ini memadukan dua genre fundamental:
1. **Pergerakan Grid Catur Tradisional:** Pemain bertindak sebagai bidak *Pawn* (Pion) yang memiliki kemampuan gerak dasar *Rook* (Benteng) dan kemampuan khusus *Knight Dash* (Kuda).
2. **Penyusupan Taktis & Penjinakan Bom:** Diadaptasi dari intensitas skenario *Bomb Defusal* ala *Counter-Strike*, di mana waktu adalah musuh utama, pandangan musuh berakibat fatal, dan penjinakan memerlukan konsentrasi penuh.

---

## 2. PEMETAAN DAN IMPLEMENTASI FITUR GDD

| Komponen GDD | Spesifikasi Dokumen | Realisasi Implementasi dalam Proyek |
|---|---|---|
| **High Concept** | Agen White Pawn menyusup The Grandmaster Facility melintasi lantai papan catur. | Dirender dalam kanvas 64x64 px per tile dengan palet industrial modern (`#1e2430` & `#283040`). |
| **Rook Mode** | Gerak lurus horizontal / vertikal 1 petak, terhalang dinding & peti. | Diimplementasikan melalui fungsi `tryMoveRook(dx, dy)` dengan pengecekan collision grid `isWalkableForRook()`. |
| **Knight Dash** | Lompatan pola huruf "L" (2 lurus + 1 samping), melompati peti rendah, cooldown 4 detik. | Diimplementasikan melalui `executeKnightDash(tx, ty)` lengkap dengan preview lintasan bercahaya cyan dan cooldown timer `knightCooldown`. |
| **Line of Sight (LOS)** | Kerucut pandang merah musuh dan CCTV, terhalang tembok. | Algoritma *Raycasting Occlusion* menembakkan 32 sinar per kerucut untuk memastikan pandangan tidak menembus dinding beton. |
| **Takedown Senyap** | Melangkah ke petak musuh dari arah belakang / blind spot. | Deteksi arah datang pemain `isGuardFacingTile()`; musuh yang disergap dari belakang langsung dilumpuhkan (`alive = false`). |
| **Penjinakan Bom** | Berada di petak bom, menahan tombol Spasi/E sampai 100%. | Timer defuse 3.0 detik dengan feedback audio berfrekuensi naik dan visual progress meter in-world. |
| **Keycard & Pintu** | Mengambil kartu akses untuk membuka blast door menuju bombsite. | State `keycard.collected` membuka semua pintu lapis baja terkunci di Level 2 dan Level 3. |

---

## 3. PANDUAN IMPLEMENTASI DI CONSTRUCT 3 (SESUAI RENCANA GDD)

Bagi keperluan tugas akademik yang membutuhkan konfigurasi di **Construct 3**, berikut adalah rancangan pemetaan objek, behavior, dan *Event Sheet*:

### A. Objek dan Behavior Construct 3
1. **Sprite: `Player_WhitePawn`**
   - **Behavior:** `Tile Movement` (Grid: 64x64 px, Speed: 350 px/s).
   - **Instance Variables:** 
     - `Mode` (String: "Rook" atau "Knight")
     - `KnightCooldown` (Number: 0 - 4.0)
     - `FacingDir` (String: "up", "down", "left", "right")
2. **Sprite: `Enemy_Guard`**
   - **Behavior:** `Line of Sight` (Range: 224 px, Cone of View: 75 degrees, Obstacles: Solids).
   - **Instance Variables:** 
     - `State` ("Static", "Patrol", "Rotate")
     - `IsAlive` (Boolean: true/false)
     - `PatrolStep` (Number)
3. **Sprite: `Solid_Wall` & `Crate_LowCover`**
   - **Behavior:** `Solid`.
   - *Catatan:* Untuk peti kayu (`Crate_LowCover`), solid diaktifkan untuk Rook Movement, dan dinonaktifkan sementara/dilewati saat `Knight Dash` aktif.
4. **Sprite: `Bomb_C4`**
   - **Instance Variables:** `IsDefused` (Boolean), `SiteID` (String: "A", "B").
5. **Sprite: `CCTV_Camera`**
   - **Behavior:** `Line of Sight`, `Rotate` / `Sine` (untuk gerakan sweep sudut 60°).

### B. Variabel Global (Global Variables)
- `SisaWaktu` (Number): Waktu tersisa (90s / 75s / 60s).
- `PunyaKeycard` (Boolean): Status kepemilikan kartu akses.
- `ProgresDefuse` (Number): 0 - 100%.
- `TotalTakedown` (Number): Jumlah musuh yang dilumpuhkan.
- `GameState` (String): "Playing", "GameOver", "Victory".

### C. Logika Event Sheet Utama Construct 3
```text
// EVENT 1: Line of Sight Deteksi Musuh
+ Enemy_Guard: Has LOS to Player_WhitePawn
+ Enemy_Guard: IsAlive = True
-> Set GameState = "GameOver"
-> Audio: Play "Alarm_Buzzer"
-> System: Show Defeat Layer

// EVENT 2: Stealth Takedown
+ Player_WhitePawn: On Tile Movement finish
+ Player_WhitePawn: Is overlapping Enemy_Guard at offset (0, 0)
+ Enemy_Guard: IsAlive = True
+ System: Invert [Enemy_Guard: Has LOS to Player_WhitePawn]
-> Set Enemy_Guard.IsAlive = False
-> Enemy_Guard: Set animation to "KnockedOut"
-> Audio: Play "Takedown_Thud"
-> System: Add 1 to TotalTakedown

// EVENT 3: Knight Dash Jump
+ Keyboard: On [Shift] pressed
+ Player_WhitePawn: KnightCooldown = 0
-> Set Player_WhitePawn.Mode = "Knight"
-> Spawn "Knight_Path_Overlay" at valid L-tiles

// EVENT 4: Penjinakan Bom C4
+ Player_WhitePawn: Is overlapping Bomb_C4
+ Keyboard: Key [Space] is down
-> Set ProgresDefuse = ProgresDefuse + (33.3 * dt)
-> Audio: Play "Defuse_Beep"
+ System: ProgresDefuse >= 100
-> Set Bomb_C4.IsDefused = True
-> Audio: Play "Defuse_Success"
```

---

## 4. DESAIN LEVEL & KURVA KESULITAN (LEVEL DESIGN)

1. **Level 1: The Rook’s Corridor (Tingkat: Tutorial / Dasar)**
   - **Fokus:** Melatih intuisi pemain terhadap batas pergerakan petak 64x64, mengamati kerucut merah musuh yang tidak bergerak, dan mempraktikkan eliminasi senyap dari arah belakang.
   - **Waktu:** 90 detik.
2. **Level 2: Knight’s Ambush (Tingkat: Menengah)**
   - **Fokus:** Melatih navigasi menggunakan Knight Dash untuk melompati peti penghalang, membaca ritme patroli bergerak musuh, dan mengambil Keycard sebelum menuju Bombsite.
   - **Waktu:** 75 detik.
3. **Level 3: Checkmate Protocol (Tingkat: Tantangan Akhir)**
   - **Fokus:** Penguasaan seluruh mekanik di area terbuka Grandmaster Facility. Memerlukan penjinakan 2 bom (Bombsite A dan B) sekaligus dengan kamera pengawas aktif dan penjaga elit berotasi dinamis.
   - **Waktu:** 60 detik.

---

## 5. KESIMPULAN
Implementasi game **Tactical Checkmate: Operation Defuse** berhasil memenuhi 100% parameter fungsional yang ditargetkan di dalam GDD. Game menyajikan pengalaman taktis yang memadukan perhitungan catur dengan atmosfer stealth yang intens, dapat dioperasikan langsung di web browser secara responsif, dan siap diajukan untuk penilaian mata kuliah Desain Game.
