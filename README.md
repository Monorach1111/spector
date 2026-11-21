# Spector — Periksa Chat & Label

**Spector** adalah satu app pemeriksa untuk dua hal yang dipakai tiap hari, tapi
jarang ada yang memeriksanya dengan AI yang privat:

1. **Scan Chat — Cek Penipuan**: unggah screenshot / tempel teks chat WA/SMS,
   dapatkan verdict **Aman / Waspada / Berbahaya**, skor risiko, alasan, dan
   tanda bahaya (minta OTP, link mencurigakan, iming-iming hadiah, ancaman
   rekening diblokir, minta transfer/deposit).
2. **Scan Label — Makanan & Obat**: unggah foto / tempel teks label, dapatkan
   gula, alergen, status halal, tanggal kedaluwarsa, dan ringkasan berbahasa
   sederhana + peringatan.

Dibangun untuk **#BuildHybridAI 2026** (Firebase Hybrid AI Hackathon,
Devpost — deadline 30 Nov 2026 17:00 ET, total hadiah $30.000).

## Bahasa — Language (ID / EN)

UI default **Bahasa Indonesia**, dengan tombol toggle **ID / EN** yang
menonjol di header. Pilihan tersimpan di `localStorage`
(`spector-lang`) dan diterapkan lagi saat app dibuka — termasuk
`<html lang>` dan judul halaman.

Beralih bahasa menerjemahkan semua chrome UI: judul, tab Scan Chat /
Scan Label, label upload/tempel teks, tombol, label hasil (verdict
Aman/Safe, Waspada/Caution, Berbahaya/Dangerous, Perlu Perhatian/Needs
Attention; skor, alasan, tanda, gula/sugar, alergen/allergens, halal,
kedaluwarsa/expiry), riwayat, dan catatan privasi. Isi contoh kasus
tetap Bahasa Indonesia (itu memang teks penipuan/label Indonesia),
tapi label contohnya ikut diterjemahkan. AI (Firebase) diminta menjawab
dalam bahasa yang dipilih; demo analyser juga menghasilkan alasan
dalam bahasa yang dipilih — dan verdict hasil scan lama tetap
diterjemahkan saat bahasa diganti (lihat `src/lib/i18n.ts`).

## Cara kerja — Hybrid Inference

Spector memakai **Firebase AI Logic Hybrid Inference SDK** (Web):

```ts
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai'

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: 'gemini-2.5-flash' },
})

// generateContent() dipanggil dari klik tombol Scan (setelah gesture pengguna).
// SDK merutekan on-device vs cloud secara internal (ChromeAdapter);
// result.response.inferenceSource ('on_device' | 'in_cloud') memberitahu
// jalur yang benar-benar dipakai — Spector menampilkannya di UI.
const result = await model.generateContent([prompt, imagePart])
```

- **On-device dulu**: Gemini Nano 4 lewat Chrome Prompt API (Chrome Desktop
  139+, flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`).
  Scan chat yang privat tidak keluar dari perangkat.
- **Fallback ke cloud**: bila on-device tidak tersedia, SDK otomatis memakai
  model Gemini di cloud (Gemini Developer API).
- Model diminta menjawab **JSON only**, lalu diparse dan divalidasi di
  `src/lib/ai.ts`.

Lihat implementasi lengkap di `src/lib/ai.ts` — Firebase AI Logic di-import
**dan benar-benar dipanggil saat runtime**, bukan cuma disebut di README.

### Produk Firebase lain

- **App Check** — wajib untuk Firebase AI Logic; lihat `src/lib/firebase.ts`.
  Lokal: debug provider (`self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`, lalu
  daftarkan token debug yang tercetak di console ke Firebase console >
  Security > App Check > Apps > Manage debug tokens). Produksi: isi
  `VITE_FIREBASE_RECAPTCHA_SITE_KEY` untuk reCAPTCHA v3.
- **Authentication (Anonymous)** — sign-in anonim agar riwayat bisa dikaitkan
  ke perangkat tanpa email/password.
- **Firestore** — riwayat scan (`scans`). Bila Firestore tidak tersedia /
  offline, riwayat jatuh ke `localStorage`.

Contoh Firestore Rules (sesuaikan di console):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scans/{docId} {
      allow read, write: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build produksi (tsc + vite)
```

### Mode Demo (tanpa Firebase)

Tanpa config Firebase, app tetap jalan end-to-end dalam **Mode Demo** yang
diberi label jelas di UI: analisis lokal berbasis aturan Bahasa Indonesia
(`src/lib/demoAnalyzer.ts`) — kata kunci penipuan + parsing label. Cocok
untuk mencoba UI, kedua mode, contoh, dan riwayat tanpa setup apa pun.
Catatan: di Mode Demo, gambar tanpa teks tidak bisa dibaca (tidak ada OCR
lokal) — tempel teksnya, atau isi config Firebase untuk analisis gambar
multimodal asli.

### Dengan Firebase asli

1. Buat proyek di Firebase console, aktifkan **AI Logic** (pilih Gemini
   Developer API), **App Check**, **Authentication (Anonymous)**, **Firestore**.
2. Salin `.env.example` ke `.env`, isi `VITE_FIREBASE_*` dari console.
3. (Lokal) aktifkan flag Chrome di atas, jalankan `npm run dev`, buka DevTools
   untuk melihat token debug App Check dan daftarkan di console.
4. Klik contoh (4 contoh per mode, Bahasa Indonesia) atau unggah gambar +
   tempel teks, lalu **Periksa Sekarang**.

## Struktur

```
src/
  App.tsx            UI: mode switcher, upload/drag-drop, hasil, riwayat, ID/EN toggle
  types.ts           Mode, ScanResult, HistoryItem
  lib/
    firebase.ts      init Firebase + App Check + Anonymous Auth + Firestore
    ai.ts            Firebase AI Logic hybrid inference (jalur utama; prompt ID/EN)
    demoAnalyzer.ts  Analisis lokal berbasis aturan (Mode Demo; alasan ID/EN)
    i18n.ts          Strings ID/EN, verdict & detail translation, localStorage
    samples.ts       4 contoh per mode (isi Bahasa Indonesia, label ID/EN)
    history.ts       Riwayat: Firestore dulu, localStorage sebagai fallback
docs/
  SUBMISSION.md      Draf teks Devpost (English) + shot list video demo
```

## Privasi

Scan on-device tidak pernah meninggalkan perangkat. Bila fallback ke cloud,
hanya teks/gambar yang dikirim untuk scan itu yang diproses. Spector bukan
nasihat medis/hukum: untuk obat ikuti dokter/apoteker; untuk penipuan laporkan
ke bank/kanal resmi.

## Lisensi

Apache License 2.0 — lihat `LICENSE`.
