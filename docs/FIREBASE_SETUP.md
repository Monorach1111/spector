# Spector — Firebase + Deploy (setup)

Status 2026-11-21 ~13:40 WIB: proyek Firebase SUDAH DIBUAT lewat browser
di akun Google elisumarlina2@gmail.com.

- Proyek: `spector` — **Project ID: `spector-94b66`**
  (ID `spector` dan `spector-app` sudah dipakai orang lain)
- Nomor proyek: `968634961142`, Analytics: tidak diaktifkan, tanpa billing / Blaze.
- Web app: `spector-web`, config sudah disalin ke `.env` lokal
  (file `.env` tidak di-commit) dan build sudah lolos dengan config itu.
- Firebase AI Logic: AKTIF (Gemini Developer API, bukan Vertex AI).
- Anonymous Auth: AKTIF.
- Firestore: database `(default)`, Standard, `asia-southeast1`, mode
  produksi. Aturan default-nya `allow read, write: if false` — file
  `firestore.rules` di repo ini sudah disiapkan (anon user boleh
  baca/tulis koleksi `scans`), dan akan ikut ter-deploy lewat
  `npm run deploy`.
- App Check: BELUM DIAKTIFKAN — konsol butuh reCAPTCHA key yang dibuat di
  luar Firebase, dan reCAPTCHA Classic sudah deprecated. AI Logic belum
  menegakkan App Check, jadi scan kemungkinan tetap jalan tanpa itu;
  verifikasi setelah deploy live.

## 1. Buat proyek Firebase (di console, ~5 menit)

1. Buka https://console.firebase.google.com/ → **Add project** → nama
   misalnya `spector` → lanjutkan (Google Analytics boleh dimatikan).
2. Di proyek itu, **Build → Firebase AI Logic** → **Get started** →
   pilih **Gemini Developer API** → buat / pilih API key-nya.
3. **Build → Authentication → Get started → Sign-in method → Anonymous →
   Enable.**
4. **Build → Firestore Database → Create database** → lokasi terdekat
   (mis. `asia-southeast1`) → mode production, aturan default dulu.
5. **Build → App Check** → daftar web app di bawah ini, aktifkan
   **reCAPTCHA v3** untuk produksi. Untuk dev lokal, pakai debug token
   (lihat `src/lib/firebase.ts`).

## 2. Daftarkan Web app, salin config

1. Di **Project settings → Your apps → Web app (</>)**, daftarkan app
   (nama `spector-web`).
2. Salin config yang tampil (`apiKey`, `authDomain`, `projectId`,
   `storageBucket`, `messagingSenderId`, `appId`).
3. Di folder `spector`, salin `.env.example` jadi `.env`, isi semua nilai
   itu. File `.env` tidak boleh di-commit (sudah di `.gitignore`).
   Config web ini memang tampil di app yang di-deploy, jadi bukan rahasia
   seperti private key — tapi tetap jangan sebar sembarangan.

## 3. Deploy ke Firebase Hosting (di terminal kamu)

```bash
cd spector
npm install -g firebase-tools   # atau pakai npx firebase-tools
firebase login                  # login Google kamu di browser
firebase use --add              # pilih proyek spector tadi
npm run build
firebase deploy --only hosting
```

Atau sekali jalan: `npm run deploy` (build + deploy, lihat `package.json`).

URL hosting-nya (mis. `https://spector-xxxxx.web.app`) adalah URL yang
dipakai buat video demo dan submit Devpost. Cek di URL itu: buka Scan Chat,
coba sample "undian berhadiah" — harusnya keluar Berbahaya, dan badge
engine-nya bukan "Demo Mode" lagi melainkan Firebase AI Logic
(on-device / cloud).

## 4. Setelah deploy

- Kabari Spark URL hosting + projectId, biar dicatat dan diverifikasi.
- Push file baru ini (`firebase.json`, `docs/FIREBASE_SETUP.md`,
  `package.json` yang ditambah script deploy) ke GitHub repo
  `Monorach1111/spector` — jangan push `.env` atau `.firebaserc` berisi
  rahasia (projectId di `.firebaserc` boleh, itu bukan rahasia).

## Checklist Devpost (#BuildHybridAI 2026, tutup 30 Nov 17:00 ET)

- [ ] Repo publik sudah (commit `d08d318`, main)
- [ ] Firebase AI Logic + App Check + Anonymous Auth + Firestore aktif
- [ ] Hosted URL live (dari langkah 3)
- [ ] Video demo ≤ 3 menit di YouTube publik (shot list di `docs/SUBMISSION.md`)
- [ ] Deskripsi teks Inggris (draft di `docs/SUBMISSION.md`)
