// js/levels.js - Tactical Level Configurations
// Tactical Checkmate: Operation Defuse

const LEVELS = [
  // ==========================================
  // LEVEL 1: The Rook’s Corridor
  // Tutorial & Dasar: 2 Static Guards, Simple Corridor, 1 C4, 90s
  // ==========================================
  {
    id: 1,
    name: "The Rook’s Corridor",
    subtitle: "Level 1: Tutorial & Dasar",
    briefing: "Selamat datang di The Grandmaster Facility, Agen White Pawn. Kenali pergerakan per petak (Rook Mode). Hindari kerucut pandang merah musuh, lakukan takedown dari titik buta (blind spot), dan jinakkan bom C4 sebelum waktu habis.",
    timeLimit: 90,
    width: 16,
    height: 10,
    map: [
      "################",
      "#S....#........#",
      "#..C..#..##....#",
      "#.##..#..#.....#",
      "#.....#..#..##.#",
      "###.###..#..#..#",
      "#........#..#..#",
      "#.######.#..#.B#",
      "#........#.....#",
      "################"
    ],
    playerStart: { x: 1, y: 1, dir: 'right' },
    bombs: [
      { id: 'A', x: 14, y: 7, name: 'BOMBSITE A', defused: false }
    ],
    keycard: null,
    doors: [],
    guards: [
      // Guard 1: Static facing down in corridor
      {
        id: 'g1',
        x: 3,
        y: 4,
        dir: 'down',
        type: 'static',
        alive: true,
        fovDistance: 3.2,
        fovAngle: 70
      },
      // Guard 2: Static facing right near bomb corridor entrance
      {
        id: 'g2',
        x: 8,
        y: 6,
        dir: 'left',
        type: 'static',
        alive: true,
        fovDistance: 3.5,
        fovAngle: 75
      }
    ],
    cameras: []
  },

  // ==========================================
  // LEVEL 2: Knight’s Ambush
  // Menengah: 3 Patrolling Guards, Crates / Knight Dash, Keycard & Blast Door, 75s
  // ==========================================
  {
    id: 2,
    name: "Knight’s Ambush",
    subtitle: "Level 2: Menengah",
    briefing: "Pintu menuju Bombsite A terkunci oleh pintu lapis baja! Gunakan kemampuan Knight Dash [Shift] untuk melompati peti penghalang rendah (Crate), ambil Keycard di ruang keamanan, dan waspadai rute patroli penjaga bersenjata.",
    timeLimit: 75,
    width: 16,
    height: 10,
    map: [
      "################",
      "#S...#....K....#",
      "#....#....#....#",
      "#.CC.#....#....#",
      "#....####.#.##.#",
      "#..C......D....#",
      "#..C.####.#.##.#",
      "#....#.........#",
      "#....#...C...B.#",
      "################"
    ],
    playerStart: { x: 1, y: 1, dir: 'right' },
    bombs: [
      { id: 'A', x: 13, y: 8, name: 'BOMBSITE A', defused: false }
    ],
    keycard: { x: 10, y: 1, collected: false },
    doors: [
      { x: 10, y: 5, locked: true, open: false }
    ],
    guards: [
      // Guard 1: Patrols horizontally in left corridor
      {
        id: 'g1',
        x: 1,
        y: 4,
        dir: 'down',
        type: 'patrol',
        waypoints: [
          { x: 1, y: 4, dir: 'down' },
          { x: 1, y: 7, dir: 'up' }
        ],
        patrolIndex: 0,
        moveInterval: 1.8,
        alive: true,
        fovDistance: 3.2,
        fovAngle: 70
      },
      // Guard 2: Patrols security keycard room
      {
        id: 'g2',
        x: 8,
        y: 2,
        dir: 'right',
        type: 'patrol',
        waypoints: [
          { x: 8, y: 2, dir: 'right' },
          { x: 13, y: 2, dir: 'left' }
        ],
        patrolIndex: 0,
        moveInterval: 1.6,
        alive: true,
        fovDistance: 3.0,
        fovAngle: 70
      },
      // Guard 3: Patrols near bombsite approach
      {
        id: 'g3',
        x: 14,
        y: 5,
        dir: 'down',
        type: 'patrol',
        waypoints: [
          { x: 14, y: 5, dir: 'down' },
          { x: 11, y: 7, dir: 'up' }
        ],
        patrolIndex: 0,
        moveInterval: 1.5,
        alive: true,
        fovDistance: 3.2,
        fovAngle: 70
      }
    ],
    cameras: []
  },

  // ==========================================
  // LEVEL 3: Checkmate Protocol
  // Tantangan Akhir: 4 Rotating Guards, 2 CCTV, 2 Bombs (A & B), 60s
  // ==========================================
  {
    id: 3,
    name: "Checkmate Protocol",
    subtitle: "Level 3: Tantangan Akhir",
    briefing: "Protokol darurat diaktifkan! Black King telah memasang 2 bom (Bombsite A dan Bombsite B). Area dijaga oleh 4 penjaga elit berotasi dan sistem kamera pengawas CCTV otomatis. Waktu tersisa hanya 60 detik!",
    timeLimit: 60,
    width: 16,
    height: 10,
    map: [
      "################",
      "#S...#..B#..K..#",
      "#..C.#...#..#..#",
      "#....#.C.D..#..#",
      "##.###...####..#",
      "#........#.....#",
      "#.##.###.#..##.#",
      "#..#...#....#..#",
      "#..#.B.#.C.....#",
      "################"
    ],
    playerStart: { x: 1, y: 1, dir: 'right' },
    bombs: [
      { id: 'A', x: 8, y: 1, name: 'BOMBSITE A', defused: false },
      { id: 'B', x: 5, y: 8, name: 'BOMBSITE B', defused: false }
    ],
    keycard: { x: 12, y: 1, collected: false },
    doors: [
      { x: 9, y: 3, locked: true, open: false }
    ],
    guards: [
      // 4 rotating elite guards
      {
        id: 'g1',
        x: 3,
        y: 3,
        dir: 'right',
        type: 'rotate',
        rotationSequence: ['right', 'down', 'left', 'up'],
        rotateInterval: 2.2,
        rotateTimer: 0,
        alive: true,
        fovDistance: 3.5,
        fovAngle: 75
      },
      {
        id: 'g2',
        x: 6,
        y: 5,
        dir: 'down',
        type: 'rotate',
        rotationSequence: ['down', 'left', 'up', 'right'],
        rotateInterval: 2.0,
        rotateTimer: 0,
        alive: true,
        fovDistance: 3.5,
        fovAngle: 75
      },
      {
        id: 'g3',
        x: 10,
        y: 7,
        dir: 'up',
        type: 'rotate',
        rotationSequence: ['up', 'right', 'down', 'left'],
        rotateInterval: 2.3,
        rotateTimer: 0,
        alive: true,
        fovDistance: 3.5,
        fovAngle: 75
      },
      {
        id: 'g4',
        x: 14,
        y: 4,
        dir: 'left',
        type: 'rotate',
        rotationSequence: ['left', 'down', 'right', 'up'],
        rotateInterval: 2.1,
        rotateTimer: 0,
        alive: true,
        fovDistance: 3.5,
        fovAngle: 75
      }
    ],
    cameras: [
      // CCTV 1 in central hallway
      {
        id: 'cam1',
        x: 7.5,
        y: 3.5,
        baseAngle: Math.PI / 2, // Down
        sweepAngle: Math.PI / 3, // 60 deg sweep
        sweepSpeed: 1.0,
        fovDistance: 3.8,
        fovAngle: 60,
        angle: Math.PI / 2
      },
      // CCTV 2 in right wing corridor
      {
        id: 'cam2',
        x: 14.5,
        y: 1.5,
        baseAngle: Math.PI, // Left
        sweepAngle: Math.PI / 3.5,
        sweepSpeed: 1.2,
        fovDistance: 4.0,
        fovAngle: 55,
        angle: Math.PI
      }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.LEVELS = LEVELS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVELS };
}
