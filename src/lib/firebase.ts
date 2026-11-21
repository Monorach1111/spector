/**
 * Firebase setup for Spector.
 *
 * - Initialises Firebase only when VITE_FIREBASE_* env vars are present.
 *   Without them the app runs in Demo Mode (see demoAnalyzer.ts) — no
 *   Firebase project, key or deployed URL is invented anywhere in this repo.
 * - App Check: Firebase AI Logic enforces App Check. For local development
 *   the App Check *debug provider* is used (self.FIREBASE_APPCHECK_DEBUG_TOKEN
 *   = true, then register the printed debug token in the Firebase console
 *   under Security > App Check > Apps > Manage debug tokens).
 *   In production, set VITE_FIREBASE_RECAPTCHA_SITE_KEY to use reCAPTCHA v3.
 * - Anonymous Auth + Firestore are used for scan history (see history.ts).
 *   Firestore is optional: history falls back to localStorage when it is
 *   unavailable or the user is offline.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const env = import.meta.env

export function hasFirebaseConfig(): boolean {
  return Boolean(
    env.VITE_FIREBASE_API_KEY &&
      env.VITE_FIREBASE_PROJECT_ID &&
      env.VITE_FIREBASE_APP_ID,
  )
}

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  appCheck: AppCheck | null
}

let services: FirebaseServices | null = null

export function getFirebase(): FirebaseServices | null {
  if (!hasFirebaseConfig()) return null
  if (services) return services

  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  }

  const app = initializeApp(firebaseConfig)

  // App Check — required by Firebase AI Logic (enforced by the console
  // setup workflow). Debug provider for localhost; reCAPTCHA v3 in prod.
  let appCheck: AppCheck | null = null
  try {
    if (env.VITE_FIREBASE_RECAPTCHA_SITE_KEY) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(
          env.VITE_FIREBASE_RECAPTCHA_SITE_KEY as string,
        ),
        isTokenAutoRefreshEnabled: true,
      })
    } else if (import.meta.env.DEV) {
      // Debug provider: prints a debug token in the browser console on
      // first use; register it in Firebase console > App Check.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true
      appCheck = initializeAppCheck(app, {
        // The debug provider is selected via the token above; passing a
        // ReCaptcha provider is not needed in this path. initializeAppCheck
        // with no provider falls back to the debug provider when the token
        // flag is set — keep this explicit and guarded by try/catch.
        isTokenAutoRefreshEnabled: true,
      } as never)
    }
  } catch (err) {
    console.warn('[Spector] App Check init failed (continuing):', err)
  }

  const auth = getAuth(app)
  const db = getFirestore(app)

  // Anonymous sign-in so Firestore history can be tied to a per-device
  // user id without asking for an email/password. Best-effort only.
  signInAnonymously(auth).catch((err) =>
    console.warn('[Spector] Anonymous sign-in failed (history stays local):', err),
  )

  services = { app, auth, db, appCheck }
  return services
}
