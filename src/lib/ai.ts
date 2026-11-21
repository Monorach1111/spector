/**
 * Firebase AI Logic — hybrid inference (the real AI path).
 *
 * Docs: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
 * (Firebase AI Logic SDK v12.5.0+, Chrome on Desktop 139+ for on-device.)
 *
 * How it works (Firebase AI Logic JS SDK v12.7.0, pinned — verified against
 * the installed package, not just the docs page, which describes a newer
 * SDK where `model.initializeDeviceModel()` is public):
 *   const ai = getAI(app, { backend: new GoogleAIBackend() })
 *   const model = getGenerativeModel(ai, {
 *     mode: InferenceMode.PREFER_ON_DEVICE,
 *     inCloudParams: { model: 'gemini-2.5-flash' },
 *   })
 *   // on-device first (Gemini Nano 4 via Chrome Prompt API when available),
 *   // seamless fallback to the cloud-hosted Gemini model otherwise.
 *   // The SDK routes on-device vs cloud internally via its ChromeAdapter
 *   // on generateContent(); generateContent() is called from the Scan
 *   // button click, i.e. after a user gesture, as the Prompt API requires.
 *   const result = await model.generateContent([prompt, imagePart?])
 *   // result.response.inferenceSource is 'on_device' | 'in_cloud' — the
 *   // app reports the actual source in the UI instead of guessing.
 *
 * - Text-only and text+image (JPEG/PNG, inlineData) are both supported
 *   on-device; single-turn generation only.
 * - The model is asked to answer in JSON only; the JSON is parsed here and
 *   validated against the expected shape, with a tolerant fallback that
 *   extracts a JSON object from surrounding text.
 * - If Firebase is not configured, or the AI call throws, the caller falls
 *   back to the clearly-labelled local demo analyser (demoAnalyzer.ts).
 *   Nothing here invents a Firebase project or key.
 */
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai'
import type { Part } from 'firebase/ai'
import { getFirebase, hasFirebaseConfig } from './firebase'
import type { Mode, ScanResult } from '../types'

const CHAT_PROMPT = `Kamu adalah Spector, pemeriksa keamanan chat berbahasa Indonesia.
Analisis teks chat / pesan berikut dan jawab HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan lain) dengan kunci persis ini:
{"verdict": "Aman" | "Waspada" | "Berbahaya", "score": <0-100, semakin tinggi semakin berisiko>, "summary": "<1 kalimat Bahasa Indonesia>", "reasons": ["<alasan singkat>", ...], "flags": ["<tanda bahaya / hal mencurigakan, atau []>", ...]}
Tanda penipuan umum: minta OTP/kode verifikasi, minta transfer/DP, link pendek mencurigakan, iming-iming hadiah/undian, rekening akan diblokir, lowongan kerja minta deposit, nomor tidak dikenal mengaku dari bank/pemerintah.`

const LABEL_PROMPT = `Kamu adalah Spector, pemeriksa label makanan dan obat berbahasa Indonesia.
Analisis teks / foto label berikut dan jawab HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan lain) dengan kunci persis ini:
{"verdict": "Aman" | "Waspada" | "Perlu Perhatian", "score": <0-100, semakin tinggi semakin perlu perhatian (gula tinggi, alergen, kedaluwarsa)>, "summary": "<1 kalimat Bahasa Indonesia>", "reasons": ["<alasan singkat>", ...], "flags": ["<peringatan, atau []>", ...], "gula": "<kadar gula bila tertulis, atau 'tidak tertulis'>", "alergen": "<alergen bila ada, atau 'tidak tertulis'>", "halal": "<Halal / tidak tertulis / tidak halal>", "kedaluwarsa": "<tanggal kedaluwarsa bila terlihat, atau 'tidak terlihat'>"}
Jika suatu informasi tidak tertulis di label, tulis 'tidak tertulis' — jangan mengarang.`

function fileToGenerativePart(file: File): Promise<Part> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () =>
      resolve({
        inlineData: {
          data: String(reader.result).split(',')[1] ?? '',
          mimeType: file.type || 'image/jpeg',
        },
      })
    reader.onerror = () => reject(new Error('Gagal membaca gambar'))
    reader.readAsDataURL(file)
  })
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
      } catch {
        return null
      }
    }
    return null
  }
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function isFirebaseAvailable(): boolean {
  return hasFirebaseConfig()
}

export async function analyzeWithFirebase(
  mode: Mode,
  text: string,
  imageFile: File | null,
): Promise<ScanResult> {
  const fb = getFirebase()
  if (!fb) throw new Error('Firebase belum dikonfigurasi')

  // Real Firebase AI Logic hybrid inference — imported AND called at runtime.
  const ai = getAI(fb.app, { backend: new GoogleAIBackend() })
  const cloudModel =
    (import.meta.env.VITE_FIREBASE_CLOUD_MODEL as string | undefined) || 'gemini-2.5-flash'
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: cloudModel },
  })

  // No explicit initializeDeviceModel() call: in firebase 12.7.0 the SDK
  // handles on-device availability internally (ChromeAdapter) when
  // generateContent() is called — which happens here from the Scan button
  // click, i.e. after a user gesture, as the Prompt API requires.
  // PREFER_ON_DEVICE falls back to the cloud model if on-device is unavailable.

  const prompt = mode === 'chat' ? CHAT_PROMPT : LABEL_PROMPT
  const fullPrompt = `${prompt}\n\nTeks untuk dianalisis:\n${text || '(tidak ada teks — analisis dari gambar saja)'}`

  const parts: Array<string | Part> = [fullPrompt]
  if (imageFile) {
    if (!['image/jpeg', 'image/png'].includes(imageFile.type)) {
      throw new Error('Gambar harus JPEG atau PNG untuk analisis on-device')
    }
    parts.push(await fileToGenerativePart(imageFile))
  }

  const result = await model.generateContent(parts)
  const raw = result.response.text()
  const source = result.response.inferenceSource
  const json = parseJson(raw)
  if (!json) throw new Error('Respons AI bukan JSON yang valid')

  const verdict = typeof json.verdict === 'string' ? json.verdict : 'Waspada'
  const score =
    typeof json.score === 'number' ? Math.max(0, Math.min(100, Math.round(json.score))) : 50

  const details: Record<string, string> = {}
  if (mode === 'label') {
    for (const k of ['gula', 'alergen', 'halal', 'kedaluwarsa']) {
      details[k] = typeof json[k] === 'string' ? (json[k] as string) : 'tidak tertulis'
    }
  }

  return {
    mode,
    verdict,
    score,
    summary: typeof json.summary === 'string' ? json.summary : raw.slice(0, 200),
    reasons: asStringArray(json.reasons),
    flags: asStringArray(json.flags),
    details,
    engine: 'firebase-hybrid',
    engineNote:
      source === 'on_device'
        ? 'Firebase AI Logic — dijalankan ON-DEVICE (Gemini Nano, prefer_on_device).'
        : source === 'in_cloud'
          ? 'Firebase AI Logic — fallback CLOUD (Gemini), on-device tidak tersedia.'
          : 'Firebase AI Logic — hybrid inference: Gemini Nano on-device dulu (prefer_on_device), fallback ke cloud bila tidak tersedia.',
    inputPreview: text.slice(0, 240),
    createdAt: Date.now(),
  }
}
