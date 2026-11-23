/**
 * i18n — ID / EN language toggle for Spector.
 *
 * Default language is Indonesian ('id'), matching the app's original
 * behaviour and its Indonesian users. The choice is persisted in
 * localStorage ('spector-lang') and re-applied on load.
 *
 * What translates:
 * - All UI chrome (header, tabs, labels, buttons, history, privacy).
 * - Verdicts and label-detail keys, via lookup tables — so results
 *   scanned in one language still display correctly in the other.
 * - Sample-case titles (the sample *content* stays Indonesian: it is
 *   Indonesian scam / label text by design).
 * - AI prompts and the demo analyser take the current language and
 *   produce reasons/summaries in that language for new scans.
 *
 * Stored history items keep the language they were scanned in; the
 * display layer translates known verdicts / detail keys, and the demo
 * analyser's fixed strings via KNOWN_TEXT below.
 */
export type Lang = 'id' | 'en'

export const LANG_STORAGE_KEY = 'spector-lang'

export function readLang(): Lang {
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'id'
  } catch {
    return 'id'
  }
}

export function saveLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    /* storage unavailable — language is best-effort */
  }
}

/** Verdicts, canonical (Indonesian) -> English. */
export const VERDICT_EN: Record<string, string> = {
  Aman: 'Safe',
  Waspada: 'Caution',
  Berbahaya: 'Dangerous',
  'Perlu Perhatian': 'Needs Attention',
}

const VERDICT_ID: Record<string, string> = Object.fromEntries(
  Object.entries(VERDICT_EN).map(([id, en]) => [en, id]),
)

export function translateVerdict(verdict: string, lang: Lang): string {
  if (lang === 'en') return VERDICT_EN[verdict] ?? verdict
  return VERDICT_ID[verdict] ?? verdict
}

/** CSS class for a verdict, in either language. */
export function verdictClass(verdict: string): string {
  switch (verdict) {
    case 'Aman':
    case 'Safe':
      return 'Safe'
    case 'Waspada':
    case 'Caution':
      return 'Caution'
    case 'Berbahaya':
    case 'Dangerous':
      return 'Dangerous'
    case 'Perlu Perhatian':
    case 'Needs Attention':
      return 'Needs'
    default:
      return verdict.split(' ')[0]
  }
}

/** Label detail keys (internal keys stay Indonesian in data). */
export const DETAIL_KEY: Record<Lang, Record<string, string>> = {
  id: { gula: 'Gula', alergen: 'Alergen', halal: 'Halal', kedaluwarsa: 'Kedaluwarsa' },
  en: { gula: 'Sugar', alergen: 'Allergens', halal: 'Halal', kedaluwarsa: 'Expiry' },
}

export function translateDetailKey(key: string, lang: Lang): string {
  return DETAIL_KEY[lang][key] ?? key
}

export function translateDetailValue(value: string, lang: Lang): string {
  if (lang === 'id') {
    return value
      .replace('Not stated', 'tidak tertulis')
      .replace('Not visible', 'tidak terlihat')
      .replace('Halal (stated on label)', 'Halal (tertera di label)')
  }
  return value
    .replace('tidak tertulis', 'not stated')
    .replace('tidak terlihat', 'not visible')
    .replace('Halal (tertera di label)', 'Halal (stated on label)')
}

/**
 * Fixed demo-analyser strings, Indonesian -> English. Used to translate
 * results scanned in Indonesian when the user later switches to English
 * (and vice versa via the inverted lookup). Dynamic strings with numbers
 * (e.g. "Gula 24g ...") are generated in the current language at scan
 * time, so they do not need a lookup here.
 */
const KNOWN_TEXT_PAIRS: Array<[string, string]> = [
  ['Minta OTP / kode verifikasi', 'Asks for OTP / verification code'],
  ['Pesan meminta kode OTP — bank dan aplikasi resmi tidak pernah meminta OTP lewat chat.', 'The message asks for an OTP code — banks and official apps never ask for an OTP over chat.'],
  ['Iming-iming hadiah / undian', 'Prize / lottery lure'],
  ['Mengiming-imingi hadiah atau undian — pola umum penipuan.', 'Lures with a prize or lottery — a common scam pattern.'],
  ['Link pendek / link mencurigakan', 'Short / suspicious link'],
  ['Mengajak klik link pendek yang tidak jelas tujuannya.', 'Asks you to click a short link with an unclear destination.'],
  ['Minta transfer / deposit', 'Asks for a transfer / deposit'],
  ['Meminta transfer uang atau deposit di awal.', 'Asks for a money transfer or an upfront deposit.'],
  ['Ancaman rekening diblokir', 'Threat that your account will be blocked'],
  ['Mengancam rekening/akun akan diblokir agar korban panik dan cepat bertindak.', 'Threatens that your account will be blocked, to make the victim panic and act fast.'],
  ['Mengaku dari bank / instansi', 'Claims to be from a bank / institution'],
  ['Mengaku dari bank atau instansi resmi — verifikasi lewat nomor resmi, bukan dari chat ini.', 'Claims to be from a bank or official institution — verify via the official number, not from this chat.'],
  ['Tekanan waktu / mendesak', 'Time pressure / urgency'],
  ['Mendesak korban bertindak cepat tanpa sempat berpikir.', 'Pressures the victim to act quickly without thinking.'],
  ['Tawaran terlalu bagus', 'Too-good-to-be-true offer'],
  ['Tawaran penghasilan yang terlalu mudah / terlalu bagus untuk jadi kenyataan.', 'An income offer that is too easy / too good to be true.'],
  ['Minta PIN / password', 'Asks for PIN / password'],
  ['Meminta PIN atau password — jangan pernah dibagikan.', 'Asks for a PIN or password — never share it.'],
  ['Minta verifikasi data', 'Asks for data verification'],
  ['Meminta verifikasi data pribadi lewat chat.', 'Asks for personal data verification over chat.'],
  ['Tidak ditemukan pola penipuan yang jelas pada teks ini. Tetap waspada dan jangan bagikan OTP/PIN.', 'No clear scam pattern found in this text. Stay cautious and never share OTP/PIN.'],
  ['Ada beberapa tanda mencurigakan. Jangan klik link atau transfer sebelum verifikasi lewat kanal resmi.', 'There are some suspicious signs. Do not click links or transfer money until verified via official channels.'],
  ['Teks ini sangat mirip pola penipuan. Jangan klik link, jangan kirim OTP/PIN, dan jangan transfer.', 'This text closely matches scam patterns. Do not click links, do not send OTP/PIN, and do not transfer money.'],
  ['Tidak ada kata/frasa penipuan yang terdeteksi.', 'No scam words or phrases detected.'],
  ['Label ini tidak menunjukkan peringatan besar dari teks yang terbaca.', 'This label shows no major warning from the text that was read.'],
  ['Ada hal yang perlu diperhatikan dari label ini — lihat peringatan di bawah.', 'There are things to watch on this label — see the warnings below.'],
  ['Kadar gula tidak tertulis di teks label ini.', 'Sugar content is not stated in this label text.'],
  ['Tanggal kedaluwarsa tidak terlihat di teks label ini.', 'Expiry date is not visible in this label text.'],
  ['Mode Demo tidak bisa membaca teks dari gambar — tempel teks chat/label di bawah agar bisa dianalisis.', 'Demo Mode cannot read text from an image — paste the chat/label text below so it can be analysed.'],
  ['Di Mode Demo, analisis gambar butuh Firebase AI Logic (multimodal).', 'In Demo Mode, image analysis needs Firebase AI Logic (multimodal).'],
  ['Tempel teksnya, atau isi Firebase config untuk analisis gambar asli.', 'Paste the text, or add Firebase config for real image analysis.'],
  ['Gambar belum bisa dibaca di Mode Demo', 'Image cannot be read in Demo Mode yet'],
  ['Mode Demo — analisis lokal berbasis aturan. Bukan AI.', 'Demo Mode — local rule-based analysis. Not AI.'],
  ['Mode Demo — analisis lokal berbasis aturan Bahasa Indonesia. Bukan AI.', 'Demo Mode — local rule-based analysis. Not AI.'],
  ['Firebase AI gagal — hasil demo ditampilkan.', 'Firebase AI failed — demo result shown.'],
]

const KNOWN_EN_TO_ID = new Map(KNOWN_TEXT_PAIRS.map(([id, en]) => [en, id]))
const KNOWN_ID_TO_EN = new Map(KNOWN_TEXT_PAIRS)

export function translateKnownText(text: string, lang: Lang): string {
  if (lang === 'en') return KNOWN_ID_TO_EN.get(text) ?? text
  return KNOWN_EN_TO_ID.get(text) ?? text
}

export interface UiStrings {
  docTitle: string
  headerTagline: string
  headerSub: string
  badgeFirebase: string
  badgeDemo: string
  tabChat: string
  tabLabel: string
  chatTitle: string
  chatHint: string
  chatScoreLabel: string
  labelTitle: string
  labelHint: string
  labelScoreLabel: string
  imageLabel: string
  dropText: string
  dropAlt: string
  removeImage: string
  pasteLabel: string
  placeholderChat: string
  placeholderLabel: string
  samplesLabel: string
  scanButton: string
  analyzing: string
  errorImageType: string
  errorNeedInput: string
  errorGeneric: string
  reasonsHeading: string
  flagsHeading: string
  engineLabel: string
  engineFirebase: string
  engineDemo: string
  aiErrorLabel: string
  copyButton: string
  copied: string
  copyVerdictLabel: string
  copyReasonsLabel: string
  historyHeading: string
  historyEmpty: string
  clearHistory: string
  privacyHeading: string
  privacyBody: string
  historyModeChat: string
  historyModeLabel: string
  historyEngineFirebase: string
  historyEngineDemo: string
  toggleLabel: string
}

export const STRINGS: Record<Lang, UiStrings> = {
  id: {
    docTitle: 'Spector — Periksa Chat & Label',
    headerTagline: '— Periksa Chat & Label',
    headerSub:
      'Satu app pemeriksa untuk dua hal yang dipakai tiap hari: chat penipuan dan label makanan/obat. AI jalan on-device dulu (Gemini Nano), fallback ke cloud bila perlu — lewat Firebase AI Logic.',
    badgeFirebase: 'Firebase AI Logic aktif — hybrid inference',
    badgeDemo: 'Mode Demo — isi Firebase config di .env untuk AI asli',
    tabChat: '💬 Scan Chat — Cek Penipuan',
    tabLabel: '🏷️ Scan Label — Makanan & Obat',
    chatTitle: 'Scan Chat — Cek Penipuan',
    chatHint: 'Unggah screenshot chat WA/SMS atau tempel teks chat dan link-nya. Spector menilai risiko penipuan.',
    chatScoreLabel: 'Skor risiko',
    labelTitle: 'Scan Label — Cek Makanan & Obat',
    labelHint: 'Unggah foto label atau tempel teks labelnya. Spector membaca gula, alergen, halal, dan kedaluwarsa.',
    labelScoreLabel: 'Skor perhatian',
    imageLabel: 'Gambar (opsional — JPEG/PNG)',
    dropText: 'Klik atau seret gambar ke sini',
    dropAlt: 'Gambar yang diunggah',
    removeImage: 'Hapus gambar',
    pasteLabel: 'Atau tempel teks',
    placeholderChat: 'Tempel isi chat / pesan di sini…',
    placeholderLabel: 'Tempel teks label di sini…',
    samplesLabel: 'Contoh:',
    scanButton: '🔍 Periksa Sekarang',
    analyzing: 'Menganalisis…',
    errorImageType: 'Gambar harus JPEG atau PNG (syarat analisis on-device).',
    errorNeedInput: 'Tempel teks atau unggah gambar dulu.',
    errorGeneric: 'Analisis gagal. Coba lagi.',
    reasonsHeading: 'Alasan:',
    flagsHeading: 'Tanda yang ditemukan:',
    engineLabel: 'Mesin:',
    engineFirebase: 'Firebase AI Logic (hybrid)',
    engineDemo: 'Demo (lokal)',
    aiErrorLabel: 'Error AI:',
    copyButton: 'Salin hasil',
    copied: 'Disalin ✓',
    copyVerdictLabel: 'Verdict',
    copyReasonsLabel: 'Alasan',
    historyHeading: 'Riwayat Scan — Scan History',
    historyEmpty: 'Belum ada riwayat. Hasil scan akan tersimpan di sini (Firestore bila Firebase aktif, localStorage bila tidak).',
    clearHistory: 'Hapus riwayat lokal',
    privacyHeading: 'Privasi — Privacy',
    privacyBody:
      'Scan on-device (Gemini Nano) tidak pernah meninggalkan perangkatmu. Bila on-device tidak tersedia, prompt dikirim ke cloud Gemini lewat Firebase AI Logic — hanya teks/gambar yang kamu kirim untuk scan itu. Riwayat tersimpan di akun anonimmu (Firestore) atau di perangkatmu saja (localStorage). Spector bukan nasihat medis atau hukum: untuk obat, ikuti dokter/apoteker; untuk penipuan, laporkan ke bank / kanal resmi.',
    historyModeChat: 'Chat',
    historyModeLabel: 'Label',
    historyEngineFirebase: 'Firebase AI',
    historyEngineDemo: 'Demo',
    toggleLabel: 'Bahasa / Language',
  },
  en: {
    docTitle: 'Spector — Check Chats & Labels',
    headerTagline: '— Check Chats & Labels',
    headerSub:
      'One checker app for two everyday things: scam chats and food/medicine labels. AI runs on-device first (Gemini Nano), falling back to the cloud when needed — via Firebase AI Logic.',
    badgeFirebase: 'Firebase AI Logic active — hybrid inference',
    badgeDemo: 'Demo Mode — add Firebase config in .env for real AI',
    tabChat: '💬 Scan Chat — Scam Check',
    tabLabel: '🏷️ Scan Label — Food & Medicine',
    chatTitle: 'Scan Chat — Scam Check',
    chatHint: 'Upload a WA/SMS chat screenshot or paste the chat text and its link. Spector assesses the scam risk.',
    chatScoreLabel: 'Risk score',
    labelTitle: 'Scan Label — Food & Medicine',
    labelHint: 'Upload a photo of the label or paste its text. Spector reads sugar, allergens, halal status, and expiry.',
    labelScoreLabel: 'Caution score',
    imageLabel: 'Image (optional — JPEG/PNG)',
    dropText: 'Click or drag an image here',
    dropAlt: 'Uploaded image',
    removeImage: 'Remove image',
    pasteLabel: 'Or paste text',
    placeholderChat: 'Paste the chat / message content here…',
    placeholderLabel: 'Paste the label text here…',
    samplesLabel: 'Try:',
    scanButton: '🔍 Check Now',
    analyzing: 'Analyzing…',
    errorImageType: 'Image must be JPEG or PNG (required for on-device analysis).',
    errorNeedInput: 'Paste text or upload an image first.',
    errorGeneric: 'Analysis failed. Please try again.',
    reasonsHeading: 'Reasons:',
    flagsHeading: 'Flags found:',
    engineLabel: 'Engine:',
    engineFirebase: 'Firebase AI Logic (hybrid)',
    engineDemo: 'Demo (local)',
    aiErrorLabel: 'AI error:',
    copyButton: 'Copy result',
    copied: 'Copied ✓',
    copyVerdictLabel: 'Verdict',
    copyReasonsLabel: 'Reasons',
    historyHeading: 'Scan History',
    historyEmpty: 'No history yet. Scan results will be saved here (Firestore when Firebase is active, localStorage otherwise).',
    clearHistory: 'Clear local history',
    privacyHeading: 'Privacy',
    privacyBody:
      'On-device scans (Gemini Nano) never leave your device. When on-device is unavailable, the prompt is sent to Gemini in the cloud via Firebase AI Logic — only the text/image you submitted for that scan. History is stored in your anonymous account (Firestore) or on your device only (localStorage). Spector is not medical or legal advice: for medicine, follow your doctor/pharmacist; for scams, report to your bank / official channels.',
    historyModeChat: 'Chat',
    historyModeLabel: 'Label',
    historyEngineFirebase: 'Firebase AI',
    historyEngineDemo: 'Demo',
    toggleLabel: 'Language',
  },
}
