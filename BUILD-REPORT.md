# PRISMWARD — Laporan Rework v1.1 (best-game-01)

**Tanggal:** 16 November 2026, ~21:08–23:xx WIB
**Entry awal:** judge 797.347 (79,73%), rank 163/4.648, cutoff top-10 882.027 (gap ~85k)
**Tujuan rework:** menutup celah terbesar dari analisis pemenang — game ini punya 0 sistem draft
antar ronde, padahal 6/10 top-10 punya draft/permanent pick; layar akhir cuma 1 baris; dan
cover lama menunjukkan musuh berbaris rapi seperti bug.

## Yang berubah

### R1 — "Prism Rites": draft antar wave (dampak terbesar)
- Setelah setiap wave bersih (wave 1–9), game berhenti di layar draft yang menawarkan
  **3 blessing permanen, pilih 1** (klik atau tombol 1/2/3).
- Pool **12 rite** (`game/src/rites.js`, baru, 5.775 byte): Overcharge (+25% damage),
  Wide Beam, Rich Vein, Deep Pockets, Frostbite, Vitality (+2 max HP, heal 2),
  Quad Prism (prism pecah jadi 4 beam — beam putih lurus ikut), Magnifier (lens ×3),
  Bargain (−15% harga tower), Salvage (refund 70% → 90%), Executioner (+30% ke
  Brute & Colossus), Lantern's Grace (sekali per run, leak mematikan jadi HP 1).
  Rite sekali-pakai (`grace`, `quadprism`, `magnifier`) tidak pernah ditawarkan ulang.
- Setiap pick permanen selama run dan **terlihat**: layar draft, daftar "Prism Rites" di
  sidebar (selalu tampil), dan layar hasil akhir.
- Layar draft adalah **screenshot #2** di dossier — judge melihat sistem ini langsung.

### R2 — Perbaikan spawn + retake cover
- Musuh tidak lagi keluar berbaris satu file: tiap musuh punya **stagger 0–96 px** di
  belakang gerbang dan **wobble lateral ±22 px** sepanjang jalur (`world.js`:
  `buildSpawnQueue` + `ox/oy` per musuh). Cover baru (wave 9) menunjukkan musuh
  tersebar organik di sepanjang jalur, bukan garis lurus sempurna.
- Cover = `screenshots/1-cover.jpg` (wave 9, HUD penuh, beam menyala, split prism terlihat).

### R3 — Layar akhir yang kaya
- Mengganti layar akhir 1 baris dengan **report card penuh** (`game/src/results.js`, baru):
  **grade huruf S/A/B/C/D/E** (dari wave yang dilewati, HP Lantern tersisa, efisiensi
  lumens, kills), **10 statistik** (wave, kills, damage, lumens earned/spent, tower
  built/sold, rites, waktu, HP tersisa), daftar rite yang diambil, **next goal**
  ("Beat your best score of X" / "Reach grade X…"), dan **best score + grade yang
  tersimpan di localStorage** dan tampil juga di title screen.
- Screenshot #4 (`4-victory.jpg`) menunjukkan layar ini: grade S, 10 stat, 4 rite chip.

## File yang berubah
- Baru: `game/src/rites.js`, `game/src/results.js`
- Diubah: `game/src/world.js` (rites, spawn stagger/wobble, Lantern's Grace, pelacakan
  statistik), `game/src/main.js` (draft UI, keyboard 1/2/3, endGame kaya, best grade),
  `game/src/render.js` (HP bar pakai `maxHp`), `game/src/config.js` (kunci best grade),
  `game/src/shots.js` (scene `draft` + victory kaya), `game/index.html` (overlay draft,
  seksi Rites di sidebar, panel hasil + CSS), `shots.json` (1-cover, 2-draft, 3-mid,
  4-victory), `main.ts` (2× edit: header rework + guard `checkShots()` dan `checkGame()`),
  `README.md` (bagian v1.1).
- Dihapus: `screenshots/2-title.jpg` (diganti `2-draft.jpg` — dossier tetap tepat 4 shot).

## Verifikasi (semua dijalankan, bukan klaim)

### Playtest interaktif Playwright — 39/39 PASS, 0 console error
`~/workspace/makefun/tools/bg01/playtest.mjs` — load bersih → title → start → pasang
3 tower lewat hotkey+klik (lumens terpotong tepat 140→10) → wave 1 → overlay draft
muncul → 3 kartu rite terisi → pilih pakai tombol 2 → kembali ke play, daftar Rites
di sidebar terisi → pause/resume (P) → mute → layar menang (grade + 10 stat cell +
next goal + daftar rite + best) → Play Again → layar kalah (grade + 10 stat) → Try
Again → semua 5 staging `?shot=` (title/mid/late/draft/victory) siap, termasuk draft
overlay dengan 3 kartu terisi dan victory dengan grade S/A.

### Balance sim — game tetap bisa menang DAN bisa kalah, draft membantu tanpa merusak
`~/workspace/makefun/tools/bg01/sim.mjs` (5 seed per skenario, dunia asli headless):
| Skenario | Hasil |
|---|---|
| STRONG, tanpa draft | Menang 5/5, HP 20/20/20/20/20 |
| STRONG + draft | Menang 5/5, HP 20/20/20/20/20 |
| REALISTIC (urutan beli), tanpa draft | Menang 5/5, HP 20/20/20/20/20 |
| REALISTIC + draft | Menang 5/5, HP 20/20/20/20/20 |
| WEAK (4 tower), tanpa draft | Menang 5/5, HP 7/8/9/5/5 |
| WEAK (4 tower) + draft | Menang 5/5, HP 10/20/10/10/20 |
| 2 emitter saja | Kalah 0/5, selalu wave 4 |
| Tanpa tower | Kalah 0/5, selalu wave 2 |

Draft jelas memperkuat (layout lemah HP 5–9 → 10–20) tapi tidak meremehkan: layout
lemah + draft masih kehilangan 10 HP di 3/5 seed. Grace terverifikasi: leak mematikan
di HP 1 → HP tetap 1, grace terpakai, game tidak berakhir.

### Persistensi best score
Setelah menang lalu reload halaman, title screen menampilkan
"Best score: 2840 · Grade S". Skor 0 tidak pernah tercatat sebagai best (edge case
diperbaiki di `results.js`).

### Screenshot (1280×720 JPEG, semua ≤256 KiB)
| File | Ukuran | Isi |
|---|---|---|
| `1-cover.jpg` | 158.311 B | Wave 9, musuh tersebar, beam + split prism |
| `2-draft.jpg` | 63.838 B | Layar Prism Rites, 3 kartu (Magnifier / Overcharge / Quad Prism) |
| `3-mid.jpg` | 134.128 B | Wave 3, musuh tersebar, beam menyala |
| `4-victory.jpg` | 69.610 B | Grade S + 10 stat + 4 rite + next goal |

Keempat shot dilihat langsung dan dibaca dengan jelas.

### Dossier
`main.ts` dijalankan 2× → output **byte-identik**. Dossier text **98.153 byte**
(cap 163.840), 4 gambar, `images[0]` = `1-cover.jpg`, `game/` 10 file (cap 993).
`main.ts` sekarang juga menolak set screenshot yang rusak (bukan 3–4 file, ada yang
>256 KiB, atau bukan `1-cover.jpg` duluan) dan menolak file sumber yang tidak bisa
di-parse — gagal di depan, bukan di grader.

## Yang sengaja TIDAK dilakukan
- **Tidak menambah wave/tower/musuh baru.** Analisis pemenang jelas: lebih banyak
  konten bukan jalannya (CHROMAKEEP 40 wave/8 spire/4 boss cuma rank 25). Yang
  ditambah adalah lapisan sistem yang terlihat (draft + hasil), bukan volume.
- **Tidak mengubah angka damage/HP musuh.** Balance asli dipertahankan; rite adalah
  satu-satunya penguat baru, dan sim membuktikan game tetap bisa kalah.
- **Tidak mengubah palet atau peta.** Palet gelap + cahaya sudah jadi identitas game;
  perbaikan visual difokuskan ke yang judge keluhkan (spawn stacking).
- **Tidak submit / push / buat repo.** Itu tugas parent agent.

## Catatan untuk resubmit (untuk parent)
- **Bundle HARUS menyertakan usage rows sesi builder ORIGINAL (yang menulis game
  dasar) DAN sesi rework ini** (yang menulis R1/R2/R3). Kalau hanya sesi rework yang
  dibundel, file-file dasar terhitung tidak ditulis dan `thinking_reproduces` gagal
  — persis pola kegagalan resubmit markdown round 8.
- `main.ts` sudah diedit 2× dalam sesi ini (header + guard, lalu guard `checkGame`),
  dan README juga diedit dalam sesi — entrypoint memenuhi aturan revisi ≥2 pesan.
- Kuota best-game-01 saat rework dipilih: day cap 3, terpakai 1, sisa 2; hard limit
  sisa 19. Resubmit menggantikan submission `01a1e24d` (Force_Last) — skor lama
  797.347 akan hilang dan diganti skor baru (bisa lebih tinggi ATAU lebih rendah).
