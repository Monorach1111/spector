import { useEffect, useRef, useState } from 'react'
import type { HistoryItem, Mode, ScanResult } from './types'
import { analyzeWithFirebase, isFirebaseAvailable } from './lib/ai'
import { analyzeDemo } from './lib/demoAnalyzer'
import { SAMPLES } from './lib/samples'
import { clearLocalHistory, loadHistory, saveScan } from './lib/history'
import { getFirebase } from './lib/firebase'
import {
  readLang,
  saveLang,
  STRINGS,
  translateDetailKey,
  translateDetailValue,
  translateKnownText,
  translateVerdict,
  verdictClass,
  type Lang,
} from './lib/i18n'

export default function App() {
  const [lang, setLang] = useState<Lang>(() => readLang())
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
  const s = STRINGS[lang]

  const modeLabel = {
    chat: { title: s.chatTitle, hint: s.chatHint, scoreLabel: s.chatScoreLabel },
    label: { title: s.labelTitle, hint: s.labelHint, scoreLabel: s.labelScoreLabel },
  } as const

  useEffect(() => {
    // Initialise Firebase (App Check + anonymous auth) when configured.
    getFirebase()
    loadHistory().then(setHistory)
  }, [])

  useEffect(() => {
    // Persist the language choice and apply it to the document.
    saveLang(lang)
    document.documentElement.lang = lang
    document.title = s.docTitle
  }, [lang, s.docTitle])

  function switchLang(next: Lang) {
    setLang(next)
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError(s.errorImageType)
      return
    }
    setImage(file)
    setImageUrl(URL.createObjectURL(file))
    setError(null)
  }

  async function onScan() {
    if (!text.trim() && !image) {
      setError(s.errorNeedInput)
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
          res = await analyzeWithFirebase(mode, text, image, lang)
        } catch (err) {
          console.warn('[Spector] Firebase AI failed, using demo analyser:', err)
          res = analyzeDemo(mode, text, Boolean(image), lang)
          res.engineNote += lang === 'en' ? ' (Firebase AI failed — demo result shown.)' : ' (Firebase AI gagal — hasil demo ditampilkan.)'
        }
      } else {
        res = analyzeDemo(mode, text, Boolean(image), lang)
      }
      setResult(res)
      const saved = await saveScan(res)
      setHistory((h) => [saved, ...h].slice(0, 50))
    } catch (err) {
      setError(err instanceof Error ? err.message : s.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  function loadSample(id: string) {
    const sm = SAMPLES[mode].find((x) => x.id === id)
    if (sm) {
      setText(sm.text)
      setError(null)
    }
  }

  function copyResult() {
    if (!result) return
    const txt = `Spector — ${modeLabel[mode].title}\n${s.copyVerdictLabel}: ${translateVerdict(result.verdict, lang)} (${result.score}/100)\n${translateKnownText(result.summary, lang)}\n${s.copyReasonsLabel}:\n${result.reasons.map((r) => `- ${translateKnownText(r, lang)}`).join('\n')}`
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const displayVerdict = result ? translateVerdict(result.verdict, lang) : ''
  const displayClass = result ? verdictClass(result.verdict) : ''

  return (
    <div className="wrap">
      <header>
        <div className="header-row">
          <h1>
            🔍 Spector <span>{s.headerTagline}</span>
          </h1>
          <div className="lang-toggle" role="group" aria-label={s.toggleLabel}>
            <button
              type="button"
              className={lang === 'id' ? 'active' : ''}
              aria-pressed={lang === 'id'}
              onClick={() => switchLang('id')}
            >
              ID
            </button>
            <button
              type="button"
              className={lang === 'en' ? 'active' : ''}
              aria-pressed={lang === 'en'}
              onClick={() => switchLang('en')}
            >
              EN
            </button>
          </div>
        </div>
        <p className="sub">{s.headerSub}</p>
        {firebaseOn ? (
          <span className="badge firebase">{s.badgeFirebase}</span>
        ) : (
          <span className="badge demo">{s.badgeDemo}</span>
        )}
      </header>

      <div className="tabs" role="tablist">
        <button className={mode === 'chat' ? 'active' : ''} onClick={() => { setMode('chat'); setResult(null); setText(''); }}>
          {s.tabChat}
        </button>
        <button className={mode === 'label' ? 'active' : ''} onClick={() => { setMode('label'); setResult(null); setText(''); }}>
          {s.tabLabel}
        </button>
      </div>

      <section className="card">
        <h2 style={{ margin: 0 }}>{modeLabel[mode].title}</h2>
        <p className="sub">{modeLabel[mode].hint}</p>

        <label>{s.imageLabel}</label>
        <div
          className="drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]) }}
        >
          {imageUrl ? <img src={imageUrl} alt={s.dropAlt} /> : s.dropText}
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
              {s.removeImage}
            </button>
          </div>
        )}

        <label htmlFor="input-text">{s.pasteLabel}</label>
        <textarea
          id="input-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'chat' ? s.placeholderChat : s.placeholderLabel}
        />

        <div className="samples">
          <span style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>{s.samplesLabel}</span>
          {SAMPLES[mode].map((sm) => (
            <button key={sm.id} onClick={() => loadSample(sm.id)}>{lang === 'en' ? sm.titleEn : sm.title}</button>
          ))}
        </div>

        <button className="primary" onClick={onScan} disabled={loading}>
          {loading ? s.analyzing : s.scanButton}
        </button>
        {error && <div className="error">{error}</div>}
      </section>

      {result && (
        <section className="card" aria-live="polite">
          <div className={`verdict ${displayClass}`}>{displayVerdict}</div>
          <div>
            {modeLabel[mode].scoreLabel}: {result.score}/100
          </div>
          <div className="scorebar">
            <div style={{ width: `${result.score}%` }} />
          </div>
          <p>{translateKnownText(result.summary, lang)}</p>
          {result.reasons.length > 0 && (
            <>
              <b>{s.reasonsHeading}</b>
              <ul>{result.reasons.map((r, i) => <li key={i}>{translateKnownText(r, lang)}</li>)}</ul>
            </>
          )}
          {result.flags.length > 0 && (
            <>
              <b>{s.flagsHeading}</b>
              <ul>{result.flags.map((f, i) => <li key={i}>{translateKnownText(f, lang)}</li>)}</ul>
            </>
          )}
          {Object.keys(result.details).length > 0 && (
            <div className="details">
              {Object.entries(result.details).map(([k, v]) => (
                <div key={k}><b>{translateDetailKey(k, lang)}</b>{translateDetailValue(v, lang)}</div>
              ))}
            </div>
          )}
          <p className="engine">
            {s.engineLabel} {result.engine === 'firebase-hybrid' ? s.engineFirebase : s.engineDemo} — {translateKnownText(result.engineNote, lang)}
          </p>
          <div className="row">
            <button className="secondary" onClick={copyResult}>
              {copied ? s.copied : s.copyButton}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>{s.historyHeading}</h3>
        {history.length === 0 ? (
          <p className="sub">{s.historyEmpty}</p>
        ) : (
          history.map((h) => (
            <div className="history-item" key={h.id}>
              <div>
                <b>{translateVerdict(h.verdict, lang)}</b> — {h.score}/100 · {h.mode === 'chat' ? s.historyModeChat : s.historyModeLabel}
                <small>{translateKnownText(h.summary, lang).slice(0, 90)}</small>
                <small>{new Date(h.createdAt).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')} · {h.engine === 'firebase-hybrid' ? s.historyEngineFirebase : s.historyEngineDemo}</small>
              </div>
            </div>
          ))
        )}
        {history.length > 0 && (
          <div className="row">
            <button className="secondary" onClick={() => { clearLocalHistory(); setHistory([]) }}>
              {s.clearHistory}
            </button>
          </div>
        )}
      </section>

      <section className="card privacy">
        <b>{s.privacyHeading}</b>
        <p>{s.privacyBody}</p>
      </section>
    </div>
  )
}
