import { createHash, randomBytes } from 'node:crypto'
import { BrowserWindow } from 'electron'

import { AUTHORIZE_URL, MS_CLIENT_ID, REDIRECT_URI, SCOPE } from './config'

/**
 * Anmeldefenster.
 *
 * Modal über dem Launcher, rahmenlos, ca. 500×700 (Owner-Entscheidung 2026-07-27).
 * Lädt die **echte** Microsoft-Anmeldeseite und greift ausschließlich den
 * Rückleitungs-URL ab — es wird nichts in die Seite injiziert und nichts mitgelesen.
 *
 * PKCE ist Pflicht für öffentliche Clients ohne Geheimnis: Ohne `code_verifier`
 * könnte ein abgefangener Code von jemand anderem eingelöst werden.
 */

function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export class SignInCancelled extends Error {
  constructor() {
    super('Sign-in was cancelled.')
  }
}

/**
 * Öffnet das Fenster und löst mit dem Autorisierungscode auf, sobald Microsoft
 * zurückleitet. Bricht der Nutzer ab, wird `SignInCancelled` geworfen.
 */
export function requestAuthCode(
  parent: BrowserWindow
): Promise<{ code: string; verifier: string }> {
  const { verifier, challenge } = pkce()
  // `state` schützt davor, eine fremde Rückleitung zu akzeptieren.
  const state = randomBytes(16).toString('hex')

  const url =
    `${AUTHORIZE_URL}?` +
    new URLSearchParams({
      client_id: MS_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      // Immer die Kontoauswahl zeigen — sonst kann man keinen zweiten Account
      // hinzufügen, ohne sich vorher überall abzumelden.
      prompt: 'select_account'
    }).toString()

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      parent,
      modal: true,
      width: 500,
      height: 700,
      resizable: false,
      frame: false,
      show: false,
      backgroundColor: '#050b1c',
      autoHideMenuBar: true,
      webPreferences: {
        // Eigene Session, damit eine frühere Anmeldung nicht kleben bleibt
        // und der Launcher-Kontext strikt getrennt ist.
        partition: `kirit-signin-${Date.now()}`,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    let settled = false
    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      fn()
      if (!win.isDestroyed()) win.destroy()
    }

    // Escape schließt — das Fenster hat keinen eigenen Schließen-Knopf.
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        finish(() => reject(new SignInCancelled()))
      }
    })

    const inspect = (target: string): void => {
      if (!target.startsWith(REDIRECT_URI)) return
      const parsed = new URL(target)
      const error = parsed.searchParams.get('error')
      const code = parsed.searchParams.get('code')
      const returnedState = parsed.searchParams.get('state')

      if (error) {
        const desc = parsed.searchParams.get('error_description') ?? error
        finish(() => reject(new Error(desc)))
        return
      }
      if (!code) return
      if (returnedState !== state) {
        finish(() => reject(new Error('Sign-in response did not match the request.')))
        return
      }
      finish(() => resolve({ code, verifier }))
    }

    win.webContents.on('will-redirect', (_e, target) => inspect(target))
    win.webContents.on('did-navigate', (_e, target) => inspect(target))

    win.on('closed', () => {
      if (!settled) {
        settled = true
        reject(new SignInCancelled())
      }
    })

    win.once('ready-to-show', () => win.show())
    void win.loadURL(url)
  })
}
