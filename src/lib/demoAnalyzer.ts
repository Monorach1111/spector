/**
 * Demo analyser — local, rule-based, NO network, NO Firebase.
 * Used ONLY when no Firebase config is present (or the Firebase call
 * fails), so the app still demos end-to-end. Every result produced here
 * is labelled "Demo" in the UI — it is a transparent stand-in, not AI.
 *
 * Chat rules: Indonesian scam keywords/phrases, each with a weight.
 * Label rules: regex extraction for gula, alergen, halal, kedaluwarsa.
 */
import type { Mode, ScanResult } from '../types'

const SCAM_RULES: { pattern: RegExp; weight: number; flag: string; reason: string }[] = [
  { pattern: /otp|kode verifikasi|kode otp/i, weight: 30, flag: 'Minta OTP / kode verifikasi', reason: 'Pesan meminta kode OTP — bank dan aplikasi resmi tidak pernah meminta OTP lewat chat.' },
  { pattern: /undian|menang|hadiah|selamat.*(menang|dapat)/i, weight: 22, flag: 'Iming-iming hadiah / undian', reason: 'Mengiming-imingi hadiah atau undian — pola umum penipuan.' },
  { pattern: /klik (link|tautan)|bit\.ly|tinyurl|t\.me\/|wa\.me/i, weight: 18, flag: 'Link pendek / link mencurigakan', reason: 'Mengajak klik link pendek yang tidak jelas tujuannya.' },
  { pattern: /transfer|kirim (uang|dana)|dp dulu|deposit/i, weight: 20, flag: 'Minta transfer / deposit', reason: 'Meminta transfer uang atau deposit di awal.' },
  { pattern: /rekening.*(blokir|diblokir|ditutup)|akun.*(blokir|ditangguhkan)/i, weight: 18, flag: 'Ancaman rekening diblokir', reason: 'Mengancam rekening/akun akan diblokir agar korban panik dan cepat bertindak.' },
  { pattern: /bank|bca|bri|mandiri|bni|ojk|polisi/i, weight: 8, flag: 'Mengaku dari bank / instansi', reason: 'Mengaku dari bank atau instansi resmi — verifikasi lewat nomor resmi, bukan dari chat ini.' },
  { pattern: /segera|sebelum.*jam|hari ini juga|terbatas/i, weight: 10, flag: 'Tekanan waktu / mendesak', reason: 'Mendesak korban bertindak cepat tanpa sempat berpikir.' },
  { pattern: /gratis|tanpa modal|gaji.*\/hari|kerja.*paruh waktu/i, weight: 12, flag: 'Tawaran terlalu bagus', reason: 'Tawaran penghasilan yang terlalu mudah / terlalu bagus untuk jadi kenyataan.' },
  { pattern: /pin|password|kata sandi/i, weight: 25, flag: 'Minta PIN / password', reason: 'Meminta PIN atau password — jangan pernah dibagikan.' },
  { pattern: /verifikasi.*(data|akun)|update data/i, weight: 10, flag: 'Minta verifikasi data', reason: 'Meminta verifikasi data pribadi lewat chat.' },
]

const ALLERGENS = ['kacang', 'susu', 'telur', 'gluten', 'kedelai', 'gandum', 'udang', 'ikan', 'susu kedelai']

function analyzeChat(text: string): Omit<ScanResult, 'mode' | 'engine' | 'engineNote' | 'inputPreview' | 'createdAt'> {
  const hits = SCAM_RULES.filter((r) => r.pattern.test(text))
  const score = Math.min(100, hits.reduce((s, h) => s + h.weight, 0))
  const verdict = score >= 50 ? 'Berbahaya' : score >= 25 ? 'Waspada' : 'Aman'
  return {
    verdict,
    score,
    summary:
      verdict === 'Aman'
        ? 'Tidak ditemukan pola penipuan yang jelas pada teks ini. Tetap waspada dan jangan bagikan OTP/PIN.'
        : verdict === 'Waspada'
          ? 'Ada beberapa tanda mencurigakan. Jangan klik link atau transfer sebelum verifikasi lewat kanal resmi.'
          : 'Teks ini sangat mirip pola penipuan. Jangan klik link, jangan kirim OTP/PIN, dan jangan transfer.',
    reasons: hits.length ? hits.map((h) => h.reason) : ['Tidak ada kata/frasa penipuan yang terdeteksi.'],
    flags: hits.map((h) => h.flag),
    details: {},
  }
}

function extract(label: string, re: RegExp): string | null {
  const m = label.match(re)
  return m ? m[1].trim() : null
}

function analyzeLabel(text: string): Omit<ScanResult, 'mode' | 'engine' | 'engineNote' | 'inputPreview' | 'createdAt'> {
  const lower = text.toLowerCase()
  const gula = extract(text, /gula[^0-9]*([0-9]+(?:[.,][0-9]+)?\s*g)/i)
  const gulaNum = gula ? parseFloat(gula.replace(',', '.')) : null
  const kedaluwarsa =
    extract(text, /(?:baik digunakan sebelum|kedaluwarsa|exp\.?|expired|best before)[^0-9]*([0-9]{1,2}[\s\/\-.][A-Za-z]{3,9}[\s\/\-.][0-9]{2,4}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[0-9]{2}\/[0-9]{4})/i) ?? null
  const halal = /halal/i.test(text) ? 'Halal (tertera di label)' : 'tidak tertulis'
  const alergen = ALLERGENS.filter((a) => lower.includes(a))

  let score = 10
  const flags: string[] = []
  const reasons: string[] = []
  if (gulaNum !== null) {
    if (gulaNum >= 20) { score += 55; flags.push(`Gula tinggi: ${gula}`); reasons.push(`Gula ${gula} per sajian — tinggi untuk satu sajian.`) }
    else if (gulaNum >= 10) { score += 20; flags.push(`Gula sedang: ${gula}`); reasons.push(`Gula ${gula} per sajian — sedang, perhatikan bila dikonsumsi sering.`) }
    else { reasons.push(`Gula ${gula} per sajian — relatif rendah.`) }
  } else {
    reasons.push('Kadar gula tidak tertulis di teks label ini.')
  }
  if (alergen.length) {
    score += 15
    flags.push(`Alergen: ${alergen.join(', ')}`)
    reasons.push(`Mengandung alergen: ${alergen.join(', ')} — hati-hati bila ada alergi.`)
  }
  if (kedaluwarsa) reasons.push(`Tanggal kedaluwarsa / baik digunakan sebelum: ${kedaluwarsa}.`)
  else reasons.push('Tanggal kedaluwarsa tidak terlihat di teks label ini.')

  const verdict = score >= 60 ? 'Perlu Perhatian' : score >= 30 ? 'Waspada' : 'Aman'
  return {
    verdict,
    score: Math.min(100, score),
    summary:
      verdict === 'Aman'
        ? 'Label ini tidak menunjukkan peringatan besar dari teks yang terbaca.'
        : 'Ada hal yang perlu diperhatikan dari label ini — lihat peringatan di bawah.',
    reasons,
    flags,
    details: {
      gula: gula ?? 'tidak tertulis',
      alergen: alergen.length ? alergen.join(', ') : 'tidak tertulis',
      halal,
      kedaluwarsa: kedaluwarsa ?? 'tidak terlihat',
    },
  }
}

export function analyzeDemo(mode: Mode, text: string, hasImage: boolean): ScanResult {
  if (!text.trim() && hasImage) {
    // Demo mode has no OCR: be honest about it instead of guessing.
    return {
      mode,
      verdict: 'Waspada',
      score: 50,
      summary: 'Mode Demo tidak bisa membaca teks dari gambar — tempel teks chat/label di bawah agar bisa dianalisis.',
      reasons: ['Di Mode Demo, analisis gambar butuh Firebase AI Logic (multimodal).', 'Tempel teksnya, atau isi Firebase config untuk analisis gambar asli.'],
      flags: ['Gambar belum bisa dibaca di Mode Demo'],
      details: {},
      engine: 'demo',
      engineNote: 'Mode Demo — analisis lokal berbasis aturan. Bukan AI.',
      inputPreview: '(gambar tanpa teks)',
      createdAt: Date.now(),
    }
  }
  const base = mode === 'chat' ? analyzeChat(text) : analyzeLabel(text)
  return {
    mode,
    ...base,
    engine: 'demo',
    engineNote: 'Mode Demo — analisis lokal berbasis aturan Bahasa Indonesia. Bukan AI.',
    inputPreview: text.slice(0, 240),
    createdAt: Date.now(),
  }
}
