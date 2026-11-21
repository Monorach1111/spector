import { useEffect, useRef, useState } from 'react'
import type { HistoryItem, Mode, ScanResult } from './types'
import { analyzeWithFirebase, isFirebaseAvailable } from './lib/ai'
import { analyzeDemo } from './lib/demoAnalyzer'
import { SAMPLES } from './lib/samples'
import { clearLocalHistory, loadHistory, saveScan } from './lib/history'
import { getFirebase } from './lib/firebase'

const MODE_LABEL: Record<Mode, { title: string; hint: string; scoreLabel: string }> = {
  chat: {
    title: 'Scan Chat — Cek Penipuan',
    hint: 'Unggah screenshot chat WA/SMS atau tempel teks chat dan link-nya. Spector menilai risiko penipuan.',
    scoreLabel: 'Skor risiko',
  },
  label: {
    title: 'Scan Label — Cek Makanan & Obat',
    hint: 'Unggah foto label atau tempel teks labelnya. Spector membaca gula, alergen, halal, dan kedaluwarsa.',
    scoreLabel: 'Skor perhatian',
  },
}

export default function App() {
  const [mode, setMode] = useState<Mode>('chat')
  const [text, setText] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const firebaseOn = isFirebaseAvailable()

  useEffect(() => {
    // Initialise Firebase (App Check + anonymous auth) when configured.
    getFirebase()
    loadHistory().then(setHistory)
  }, [])

  function onFile(file: File | undefined) {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Gambar harus JPEG atau PNG (syarat analisis on-device).')
      return
    }
    setImage(file)
    setImageUrl(URL.createObjectURL(file))
    setError(null)
  }

  async function onScan() {
    if (!text.trim() && !image) {
      setError('Tempel teks atau unggah gambar dulu.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let res: ScanResult
      if (firebaseOn) {
        // Real path: Firebase AI Logic hybrid inference (Gemini Nano
        // on-device first, cloud fallback). On failure, fall back to demo
        // rather than showing a dead end — and say so in the UI.
        try {
          res = await analyzeWithFirebase(mode, text, image)
        } catch (err) {
          console.warn('[Spector] Firebase AI failed, using demo analyser:', err)
          res = analyzeDemo(mode, text, Boolean(image))
          res.engineNote += ' (Firebase AI gagal — hasil demo ditampilkan.)'
        }
      } else {
        res = analyzeDemo(mode, text, Boolean(image))
      }
      setResult(res)
      const saved = await saveScan(res)
      setHistory((h) => [saved, ...h].slice(0, 50))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analisis gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function loadSample(id: string) {
    const s = SAMPLES[mode].find((x) => x.id === id)
    if (s) {
      setText(s.text)
      setError(null)
    }
  }

  function copyResult() {
    if (!result) return
    const txt = `Spector — ${MODE_LABEL[mode].title}\nVerdict: ${result.verdict} (${result.score}/100)\n${result.summary}\nAlasan:\n${result.reasons.map((r) => `- ${r}`).join('\n')}`
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const verdictClass = result?.verdict.split(' ')[0] ?? ''

  return (
    <div className="wrap">
      <header>
        <h1>
          🔍 Spector <span>— Periksa Chat &amp; Label</span>
        </h1>
        <p className="sub">
          Satu app pemeriksa untuk dua hal yang dipakai tiap hari: chat penipuan dan
          label makanan/obat. AI jalan on-device dulu (Gemini Nano), fallback ke cloud
          bila perlu — lewat Firebase AI Logic.
        </p>
        {firebaseOn ? (
          <span className="badge firebase">Firebase AI Logic aktif — hybrid inference</span>
        ) : (
          <span className="badge demo">
            Mode Demo — isi Firebase config di .env untuk AI asli
          </span>
        )}
      </header>

      <div className="tabs" role="tablist">
        <button className={mode === 'chat' ? 'active' : ''} onClick={() => { setMode('chat'); setResult(null); setText(''); }}>
          💬 Scan Chat — Cek Penipuan
        </button>
        <button className={mode === 'label' ? 'active' : ''} onClick={() => { setMode('label'); setResult(null); setText(''); }}>
          🏷️ Scan Label — Makanan &amp; Obat
        </button>
      </div>

      <section className="card">
        <h2 style={{ margin: 0 }}>{MODE_LABEL[mode].title}</h2>
        <p className="sub">{MODE_LABEL[mode].hint}</p>

        <label>Gambar (opsional — JPEG/PNG)</label>
        <div
          className="drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]) }}
        >
          {imageUrl ? <img src={imageUrl} alt="Gambar yang diunggah" /> : 'Klik atau seret gambar ke sini'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        {image && (
          <div className="row">
            <button className="secondary" onClick={() => { setImage(null); setImageUrl(null) }}>
              Hapus gambar
            </button>
          </div>
        )}

        <label htmlFor="input-text">Atau tempel teks</label>
        <textarea
          id="input-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'chat' ? 'Tempel isi chat / pesan di sini…' : 'Tempel teks label di sini…'}
        />

        <div className="samples">
          <span style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Contoh:</span>
          {SAMPLES[mode].map((s) => (
            <button key={s.id} onClick={() => loadSample(s.id)}>{s.title}</button>
          ))}
        </div>

        <button className="primary" onClick={onScan} disabled={loading}>
          {loading ? 'Menganalisis…' : '🔍 Periksa Sekarang'}
        </button>
        {error && <div className="error">{error}</div>}
      </section>

      {result && (
        <section className="card" aria-live="polite">
          <div className={`verdict ${verdictClass}`}>{result.verdict}</div>
          <div>
            {MODE_LABEL[mode].scoreLabel}: {result.score}/100
          </div>
          <div className="scorebar">
            <div style={{ width: `${result.score}%` }} />
          </div>
          <p>{result.summary}</p>
          {result.reasons.length > 0 && (
            <>
              <b>Alasan:</b>
              <ul>{result.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </>
          )}
          {result.flags.length > 0 && (
            <>
              <b>Tanda yang ditemukan:</b>
              <ul>{result.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </>
          )}
          {Object.keys(result.details).length > 0 && (
            <div className="details">
              {Object.entries(result.details).map(([k, v]) => (
                <div key={k}><b>{k}</b>{v}</div>
              ))}
            </div>
          )}
          <p className="engine">
            Mesin: {result.engine === 'firebase-hybrid' ? 'Firebase AI Logic (hybrid)' : 'Demo (lokal)'} — {result.engineNote}
          </p>
          <div className="row">
            <button className="secondary" onClick={copyResult}>
              {copied ? 'Disalin ✓' : 'Salin hasil'}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Riwayat Scan — Scan History</h3>
        {history.length === 0 ? (
          <p className="sub">Belum ada riwayat. Hasil scan akan tersimpan di sini (Firestore bila Firebase aktif, localStorage bila tidak).</p>
        ) : (
          history.map((h) => (
            <div className="history-item" key={h.id}>
              <div>
                <b>{h.verdict}</b> — {h.score}/100 · {h.mode === 'chat' ? 'Chat' : 'Label'}
                <small>{h.summary.slice(0, 90)}</small>
                <small>{new Date(h.createdAt).toLocaleString('id-ID')} · {h.engine === 'firebase-hybrid' ? 'Firebase AI' : 'Demo'}</small>
              </div>
            </div>
          ))
        )}
        {history.length > 0 && (
          <div className="row">
            <button className="secondary" onClick={() => { clearLocalHistory(); setHistory([]) }}>
              Hapus riwayat lokal
            </button>
          </div>
        )}
      </section>

      <section className="card privacy">
        <b>Privasi — Privacy</b>
        <p>
          Scan on-device (Gemini Nano) tidak pernah meninggalkan perangkatmu. Bila
          on-device tidak tersedia, prompt dikirim ke cloud Gemini lewat Firebase AI
          Logic — hanya teks/gambar yang kamu kirim untuk scan itu. Riwayat tersimpan
          di akun anonimmu (Firestore) atau di perangkatmu saja (localStorage).
          Spector bukan nasihat medis atau hukum: untuk obat, ikuti dokter/apoteker;
          untuk penipuan, laporkan ke bank / kanal resmi.
        </p>
      </section>
    </div>
  )
}
