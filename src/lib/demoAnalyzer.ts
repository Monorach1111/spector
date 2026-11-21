/**
 * Demo analyser — local, rule-based, NO network, NO Firebase.
 * Used ONLY when no Firebase config is present (or the Firebase call
 * fails), so the app still demos end-to-end. Every result produced here
 * is labelled "Demo" in the UI — it is a transparent stand-in, not AI.
 *
 * Chat rules: Indonesian scam keywords/phrases, each with a weight.
 * Label rules: regex extraction for gula, alergen, halal, kedaluwarsa.
 *
 * Language: rules match Indonesian text either way (the sample content
 * and Indonesian scam messages are Indonesian), but reasons, flags,
 * summaries and the engine note are produced in the requested language
 * ('id' default, 'en' when the UI is in English).
 */
import type { Mode, ScanResult } from '../types'
import type { Lang } from './i18n'

const SCAM_RULES: {
  pattern: RegExp
  weight: number
  flag: string
  flagEn: string
  reason: string
  reasonEn: string
}[] = [
  { pattern: /otp|kode verifikasi|kode otp/i, weight: 30, flag: 'Minta OTP / kode verifikasi', flagEn: 'Asks for OTP / verification code', reason: 'Pesan meminta kode OTP — bank dan aplikasi resmi tidak pernah meminta OTP lewat chat.', reasonEn: 'The message asks for an OTP code — banks and official apps never ask for an OTP over chat.' },
  { pattern: /undian|menang|hadiah|selamat.*(menang|dapat)/i, weight: 22, flag: 'Iming-iming hadiah / undian', flagEn: 'Prize / lottery lure', reason: 'Mengiming-imingi hadiah atau undian — pola umum penipuan.', reasonEn: 'Lures with a prize or lottery — a common scam pattern.' },
  { pattern: /klik (link|tautan)|bit\.ly|tinyurl|t\.me\/|wa\.me/i, weight: 18, flag: 'Link pendek / link mencurigakan', flagEn: 'Short / suspicious link', reason: 'Mengajak klik link pendek yang tidak jelas tujuannya.', reasonEn: 'Asks you to click a short link with an unclear destination.' },
  { pattern: /transfer|kirim (uang|dana)|dp dulu|deposit/i, weight: 20, flag: 'Minta transfer / deposit', flagEn: 'Asks for a transfer / deposit', reason: 'Meminta transfer uang atau deposit di awal.', reasonEn: 'Asks for a money transfer or an upfront deposit.' },
  { pattern: /rekening.*(blokir|diblokir|ditutup)|akun.*(blokir|ditangguhkan)/i, weight: 18, flag: 'Ancaman rekening diblokir', flagEn: 'Threat that your account will be blocked', reason: 'Mengancam rekening/akun akan diblokir agar korban panik dan cepat bertindak.', reasonEn: 'Threatens that your account will be blocked, to make the victim panic and act fast.' },
  { pattern: /bank|bca|bri|mandiri|bni|ojk|polisi/i, weight: 8, flag: 'Mengaku dari bank / instansi', flagEn: 'Claims to be from a bank / institution', reason: 'Mengaku dari bank atau instansi resmi — verifikasi lewat nomor resmi, bukan dari chat ini.', reasonEn: 'Claims to be from a bank or official institution — verify via the official number, not from this chat.' },
  { pattern: /segera|sebelum.*jam|hari ini juga|terbatas/i, weight: 10, flag: 'Tekanan waktu / mendesak', flagEn: 'Time pressure / urgency', reason: 'Mendesak korban bertindak cepat tanpa sempat berpikir.', reasonEn: 'Pressures the victim to act quickly without thinking.' },
  { pattern: /gratis|tanpa modal|gaji.*\/hari|kerja.*paruh waktu/i, weight: 12, flag: 'Tawaran terlalu bagus', flagEn: 'Too-good-to-be-true offer', reason: 'Tawaran penghasilan yang terlalu mudah / terlalu bagus untuk jadi kenyataan.', reasonEn: 'An income offer that is too easy / too good to be true.' },
  { pattern: /pin|password|kata sandi/i, weight: 25, flag: 'Minta PIN / password', flagEn: 'Asks for PIN / password', reason: 'Meminta PIN atau password — jangan pernah dibagikan.', reasonEn: 'Asks for a PIN or password — never share it.' },
  { pattern: /verifikasi.*(data|akun)|update data/i, weight: 10, flag: 'Minta verifikasi data', flagEn: 'Asks for data verification', reason: 'Meminta verifikasi data pribadi lewat chat.', reasonEn: 'Asks for personal data verification over chat.' },
]

const ALLERGENS = ['kacang', 'susu', 'telur', 'gluten', 'kedelai', 'gandum', 'udang', 'ikan', 'susu kedelai']

function analyzeChat(text: string, lang: Lang): Omit<ScanResult, 'mode' | 'engine' | 'engineNote' | 'inputPreview' | 'createdAt'> {
  const hits = SCAM_RULES.filter((r) => r.pattern.test(text))
  const score = Math.min(100, hits.reduce((s, h) => s + h.weight, 0))
  const verdict = score >= 50 ? 'Berbahaya' : score >= 25 ? 'Waspada' : 'Aman'
  const en = lang === 'en'
  return {
    verdict,
    score,
    summary:
      verdict === 'Aman'
        ? en
          ? 'No clear scam pattern found in this text. Stay cautious and never share OTP/PIN.'
          : 'Tidak ditemukan pola penipuan yang jelas pada teks ini. Tetap waspada dan jangan bagikan OTP/PIN.'
        : verdict === 'Waspada'
          ? en
            ? 'There are some suspicious signs. Do not click links or transfer money until verified via official channels.'
            : 'Ada beberapa tanda mencurigakan. Jangan klik link atau transfer sebelum verifikasi lewat kanal resmi.'
          : en
            ? 'This text closely matches scam patterns. Do not click links, do not send OTP/PIN, and do not transfer money.'
            : 'Teks ini sangat mirip pola penipuan. Jangan klik link, jangan kirim OTP/PIN, dan jangan transfer.',
    reasons: hits.length
      ? hits.map((h) => (en ? h.reasonEn : h.reason))
      : [en ? 'No scam words or phrases detected.' : 'Tidak ada kata/frasa penipuan yang terdeteksi.'],
    flags: hits.map((h) => (en ? h.flagEn : h.flag)),
    details: {},
  }
}

function extract(label: string, re: RegExp): string | null {
  const m = label.match(re)
  return m ? m[1].trim() : null
}

function analyzeLabel(text: string, lang: Lang): Omit<ScanResult, 'mode' | 'engine' | 'engineNote' | 'inputPreview' | 'createdAt'> {
  const en = lang === 'en'
  const lower = text.toLowerCase()
  const gula = extract(text, /gula[^0-9]*([0-9]+(?:[.,][0-9]+)?\s*g)/i)
  const gulaNum = gula ? parseFloat(gula.replace(',', '.')) : null
  const kedaluwarsa =
    extract(text, /(?:baik digunakan sebelum|kedaluwarsa|exp\.?|expired|best before)[^0-9]*([0-9]{1,2}[\s\/\-.][A-Za-z]{3,9}[\s\/\-.][0-9]{2,4}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[0-9]{2}\/[0-9]{4})/i) ?? null
  const halal = /halal/i.test(text) ? (en ? 'Halal (stated on label)' : 'Halal (tertera di label)') : en ? 'not stated' : 'tidak tertulis'
  const alergen = ALLERGENS.filter((a) => lower.includes(a))

  let score = 10
  const flags: string[] = []
  const reasons: string[] = []
  if (gulaNum !== null) {
    if (gulaNum >= 20) {
      score += 55
      flags.push(en ? `High sugar: ${gula}` : `Gula tinggi: ${gula}`)
      reasons.push(en ? `Sugar ${gula} per serving — high for one serving.` : `Gula ${gula} per sajian — tinggi untuk satu sajian.`)
    } else if (gulaNum >= 10) {
      score += 20
      flags.push(en ? `Moderate sugar: ${gula}` : `Gula sedang: ${gula}`)
      reasons.push(en ? `Sugar ${gula} per serving — moderate, watch it if eaten often.` : `Gula ${gula} per sajian — sedang, perhatikan bila dikonsumsi sering.`)
    } else {
      reasons.push(en ? `Sugar ${gula} per serving — relatively low.` : `Gula ${gula} per sajian — relatif rendah.`)
    }
  } else {
    reasons.push(en ? 'Sugar content is not stated in this label text.' : 'Kadar gula tidak tertulis di teks label ini.')
  }
  if (alergen.length) {
    score += 15
    flags.push(en ? `Allergens: ${alergen.join(', ')}` : `Alergen: ${alergen.join(', ')}`)
    reasons.push(en ? `Contains allergens: ${alergen.join(', ')} — be careful if you have allergies.` : `Mengandung alergen: ${alergen.join(', ')} — hati-hati bila ada alergi.`)
  }
  if (kedaluwarsa) {
    reasons.push(en ? `Expiry / best before date: ${kedaluwarsa}.` : `Tanggal kedaluwarsa / baik digunakan sebelum: ${kedaluwarsa}.`)
  } else {
    reasons.push(en ? 'Expiry date is not visible in this label text.' : 'Tanggal kedaluwarsa tidak terlihat di teks label ini.')
  }

  const verdict = score >= 60 ? 'Perlu Perhatian' : score >= 30 ? 'Waspada' : 'Aman'
  return {
    verdict,
    score: Math.min(100, score),
    summary:
      verdict === 'Aman'
        ? en
          ? 'This label shows no major warning from the text that was read.'
          : 'Label ini tidak menunjukkan peringatan besar dari teks yang terbaca.'
        : en
          ? 'There are things to watch on this label — see the warnings below.'
          : 'Ada hal yang perlu diperhatikan dari label ini — lihat peringatan di bawah.',
    reasons,
    flags,
    details: {
      gula: gula ?? (en ? 'not stated' : 'tidak tertulis'),
      alergen: alergen.length ? alergen.join(', ') : en ? 'not stated' : 'tidak tertulis',
      halal,
      kedaluwarsa: kedaluwarsa ?? (en ? 'not visible' : 'tidak terlihat'),
    },
  }
}

export function analyzeDemo(mode: Mode, text: string, hasImage: boolean, lang: Lang = 'id'): ScanResult {
  const en = lang === 'en'
  if (!text.trim() && hasImage) {
    // Demo mode has no OCR: be honest about it instead of guessing.
    return {
      mode,
      verdict: 'Waspada',
      score: 50,
      summary: en
        ? 'Demo Mode cannot read text from an image — paste the chat/label text below so it can be analysed.'
        : 'Mode Demo tidak bisa membaca teks dari gambar — tempel teks chat/label di bawah agar bisa dianalisis.',
      reasons: en
        ? ['In Demo Mode, image analysis needs Firebase AI Logic (multimodal).', 'Paste the text, or add Firebase config for real image analysis.']
        : ['Di Mode Demo, analisis gambar butuh Firebase AI Logic (multimodal).', 'Tempel teksnya, atau isi Firebase config untuk analisis gambar asli.'],
      flags: [en ? 'Image cannot be read in Demo Mode yet' : 'Gambar belum bisa dibaca di Mode Demo'],
      details: {},
      engine: 'demo',
      engineNote: en
        ? 'Demo Mode — local rule-based analysis. Not AI.'
        : 'Mode Demo — analisis lokal berbasis aturan. Bukan AI.',
      inputPreview: '(gambar tanpa teks)',
      createdAt: Date.now(),
    }
  }
  const base = mode === 'chat' ? analyzeChat(text, lang) : analyzeLabel(text, lang)
  return {
    mode,
    ...base,
    engine: 'demo',
    engineNote: en
      ? 'Demo Mode — local rule-based analysis. Not AI.'
      : 'Mode Demo — analisis lokal berbasis aturan Bahasa Indonesia. Bukan AI.',
    inputPreview: text.slice(0, 240),
    createdAt: Date.now(),
  }
}
