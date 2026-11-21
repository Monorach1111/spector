# Spector — Devpost Submission Draft (#BuildHybridAI 2026)

> Draft only — fill in the hosted URL, repo URL and video link before submitting.
> Do NOT submit with placeholder links.

## Project name
Spector — Check Scams & Labels, Privately

## Tagline
One inspector for the two things everyone checks every day: scam chats and food/medicine labels — AI on-device first, cloud when needed.

## Text description (English, for the Devpost form)

**What it does**

Spector is a web app with two scan modes sharing one inspection engine:

1. **Scan Chat (Scam Check)** — upload a screenshot or paste a WhatsApp/SMS
   chat or link. Spector returns a verdict (Safe / Caution / Dangerous), a
   risk score, plain-language reasons, and the red flags it found (OTP
   requests, suspicious short links, prize/lottery lures, "account will be
   blocked" threats, transfer/deposit requests).
2. **Scan Label (Food & Medicine)** — upload a photo or paste label text.
   Spector returns sugar content, allergens, halal status, expiry date, and a
   short plain-language summary with warnings.

Both modes are built for everyday use in Indonesia, where scam chats arrive
daily and label reading happens in every supermarket — but almost no tool
checks either privately, on-device.

**How Firebase AI Logic is used**

Spector uses the Firebase AI Logic Hybrid Inference SDK for Web:

```ts
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: 'gemini-2.5-flash' },
})
const result = await model.generateContent([prompt, imagePart])
// result.response.inferenceSource: 'on_device' | 'in_cloud'
```

Prompts run on-device with Gemini Nano 4 (Chrome Prompt API) when available
— so a private chat never leaves the device — and fall back seamlessly to
the cloud-hosted Gemini model when on-device is unavailable. The model is
asked to answer in JSON only; the app parses and validates that JSON and
renders the verdict, score, reasons and flags. Image input is sent as
inlineData (JPEG/PNG), the only image types on-device inference supports.

Firebase AI Logic is imported and actually called at runtime in
`src/lib/ai.ts` — not just named in the README. Firebase AI Logic requires
App Check, which is wired up with the debug provider for local development
and reCAPTCHA v3 for production (`src/lib/firebase.ts`). The app also uses
Anonymous Authentication and Firestore for scan history, with a localStorage
fallback when offline.

When no Firebase config is present, the app still demos end-to-end in a
clearly-labelled Demo Mode with a local rule-based Indonesian analyser, so
judges can try the UI, both modes, the 4 sample cases per mode, and history
without any setup.

**Features**

- Two scan modes, one shared engine; mode switcher in Indonesian UI
- Image upload + drag-and-drop + paste text; 4 one-tap sample cases per mode
- Result card: verdict, score bar, reasons, red flags, label details
  (sugar / allergens / halal / expiry)
- Scan history (Firestore, localStorage fallback), copy/share result
- Privacy note: on-device scans never leave the device

**Value proposition**

Scam messages and food/medicine labels are checked by almost everyone,
every day — yet checking them usually means pasting private chats or photos
into a cloud service. Spector makes the private check the default: on-device
first, cloud only as a fallback, with a clear answer in plain Indonesian
instead of a wall of text.

## Platform
Web (Chrome) — Gemini Nano 4 via Firebase AI Logic. Android is a planned
follow-up; the same hybrid SDK covers it.

## Demo video — shot list (max 3 minutes)

| Time | Shot |
| --- | --- |
| 0:00–0:15 | Hook: phone full of scam chats + a supermarket label. "Everyone checks these daily. Spector checks them privately." |
| 0:15–0:50 | Scan Chat: paste the "undian berhadiah" sample → verdict Berbahaya, score, reasons, flags. Show the on-device / hybrid badge. |
| 0:50–1:20 | Scan Chat (safe): the office-chat sample → Aman. Contrast. |
| 1:20–1:55 | Scan Label: paste the sweet-tea label sample → sugar 24g, verdict Perlu Perhatian. Then the paracetamol sample → expiry shown. |
| 1:55–2:25 | Image upload: upload a label photo (with Firebase configured) → multimodal result. Show history list + copy result. |
| 2:25–3:00 | How it works: diagram — Gemini Nano on-device first → cloud fallback; App Check + Firestore + Anonymous Auth. Close with repo + hosted URL. |

Video must be ≤ 3 minutes, public on YouTube, in English or with English
subtitles.

## Submission checklist

- [ ] Public repo (Apache-2.0 LICENSE at repo top — included) with all source
- [ ] `src/lib/ai.ts` calls Firebase AI Logic at runtime (done)
- [ ] Hosted URL for judging/testing (TODO — deploy, e.g. Firebase Hosting)
- [ ] Demo video ≤ 3 min on public YouTube (TODO — record from shot list above)
- [ ] Text description in English (draft above)
- [ ] At least one platform selected: Web
- [ ] Project is free to use; all submission materials in English
- [ ] Firebase project: AI Logic (Gemini Developer API) + App Check +
      Anonymous Auth + Firestore enabled; debug token registered for local dev
