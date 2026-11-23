export type Mode = 'chat' | 'label'

export type Engine = 'firebase-hybrid' | 'demo'

export interface ScanResult {
  mode: Mode
  /** 'Aman' | 'Waspada' | 'Berbahaya' for chat; for label: 'Aman' | 'Waspada' | 'Perlu Perhatian' */
  verdict: string
  score: number // 0-100: chat = risk score (higher = riskier); label = health-caution score
  summary: string
  reasons: string[]
  flags: string[]
  details: Record<string, string>
  engine: Engine
  /** Human-readable note about where the analysis ran. */
  engineNote: string
  /** Raw Firebase AI error message, set only when the real AI path failed
   *  and the demo analyser was used instead — shown in the UI so the
   *  failure can be diagnosed (App Check, API key, model, network)
   *  instead of failing silently. Never translated: it is technical text. */
  aiError?: string
  inputPreview: string
  createdAt: number
}

export interface HistoryItem extends ScanResult {
  id: string
}
