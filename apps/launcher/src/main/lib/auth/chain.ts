import {
  MS_CLIENT_ID,
  REDIRECT_URI,
  TOKEN_URL,
  XBOX_AUTH_URL,
  XSTS_AUTH_URL,
  MC_LOGIN_URL,
  MC_PROFILE_URL,
  SCOPE
} from './config'

/**
 * Die Anmeldekette Microsoft → Xbox Live → XSTS → Minecraft.
 *
 * Ablauf und Endpunkte sind dem alten Client `KiritClientMC` nachgebaut
 * (Owner-Freigabe 2026-07-27) — dort war die Kette korrekt. Übernommen ist auch
 * die Zuordnung der XSTS-Fehlercodes, die man sonst mühsam neu erarbeitet.
 *
 * **Nicht** übernommen: der Device-Code-Flow mit Polling. Der Owner will ein
 * richtiges Anmeldefenster, deshalb Authorization-Code-Flow mit PKCE.
 */

export interface MsTokens {
  accessToken: string
  refreshToken: string
}

export interface McSession {
  /** Minecraft-Zugriffstoken für den Spielstart. */
  accessToken: string
  expiresAt: string
  uuid: string
  username: string
  xuid: string
  skinUrl?: string
}

class AuthError extends Error {}

async function postJson<T>(url: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  if (!res.ok) throw new AuthError(describeFailure(url, res.status, text))
  return JSON.parse(text) as T
}

/**
 * Aus einer fehlgeschlagenen Antwort eine Meldung machen, mit der ein Mensch etwas
 * anfangen kann. Der alte Client zeigte hier oft nur "Auth failed".
 */
function describeFailure(url: string, status: number, body: string): string {
  if (url === XSTS_AUTH_URL) {
    const xErr = Number((body.match(/"XErr"\s*:\s*(\d+)/) ?? [])[1])
    switch (xErr) {
      case 2148916233:
        return 'This Microsoft account has no Xbox account. Create one at xbox.com first.'
      case 2148916235:
        return 'Xbox Live is not available in this country or region.'
      case 2148916236:
      case 2148916237:
        return 'This account needs adult verification. Sign in at xbox.com first.'
      case 2148916238:
        return 'This is a child account. A parent has to add it to a Microsoft family.'
      default:
        break
    }
  }
  if (url === MC_PROFILE_URL && status === 404) {
    return 'This account does not own Minecraft: Java Edition.'
  }
  return `Sign-in failed (HTTP ${status}).`
}

/** Autorisierungscode aus dem Anmeldefenster gegen Microsoft-Tokens tauschen. */
export async function exchangeCode(code: string, verifier: string): Promise<MsTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      code_verifier: verifier
    })
  })
  if (!res.ok) throw new AuthError(`Could not complete sign-in (HTTP ${res.status}).`)
  const json = (await res.json()) as { access_token: string; refresh_token: string }
  return { accessToken: json.access_token, refreshToken: json.refresh_token }
}

/** Abgelaufene Sitzung erneuern. Scheitert das, muss sich der Nutzer neu anmelden. */
export async function refreshMsToken(refreshToken: string): Promise<MsTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: SCOPE
    })
  })
  if (!res.ok) throw new AuthError('Session expired. Please sign in again.')
  const json = (await res.json()) as { access_token: string; refresh_token?: string }
  return {
    accessToken: json.access_token,
    // Microsoft schickt nicht immer ein neues Refresh-Token — dann das alte behalten.
    refreshToken: json.refresh_token ?? refreshToken
  }
}

interface XboxResponse {
  Token: string
  DisplayClaims: { xui: { uhs: string; xid?: string }[] }
}

/**
 * Microsoft-Token → Minecraft-Sitzung.
 *
 * `onStep` meldet den Fortschritt, damit das Anmeldefenster nicht schweigend
 * mehrere Sekunden hängt.
 */
export async function toMinecraftSession(
  msAccessToken: string,
  onStep?: (step: string) => void
): Promise<McSession> {
  onStep?.('xbox')
  const xbox = await postJson<XboxResponse>(XBOX_AUTH_URL, {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${msAccessToken}`
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT'
  })

  onStep?.('xsts')
  const xsts = await postJson<XboxResponse>(XSTS_AUTH_URL, {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xbox.Token] },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT'
  })

  const claim = xsts.DisplayClaims.xui[0]
  const userhash = claim.uhs
  // XUID wird für den Spielstart gebraucht. Der alte Client hat ihn hier verworfen
  // und startete danach mit leerem --xuid.
  const xuid = claim.xid ?? ''

  onStep?.('minecraft')
  const mc = await postJson<{ access_token: string; expires_in: number }>(MC_LOGIN_URL, {
    identityToken: `XBL3.0 x=${userhash};${xsts.Token}`
  })

  onStep?.('profile')
  const res = await fetch(MC_PROFILE_URL, {
    headers: { Authorization: `Bearer ${mc.access_token}` }
  })
  if (!res.ok) {
    throw new AuthError(describeFailure(MC_PROFILE_URL, res.status, await res.text()))
  }
  const profile = (await res.json()) as {
    id: string
    name: string
    skins?: { url: string; state: string }[]
  }

  return {
    accessToken: mc.access_token,
    expiresAt: new Date(Date.now() + mc.expires_in * 1000).toISOString(),
    uuid: profile.id,
    username: profile.name,
    xuid,
    skinUrl: profile.skins?.find((s) => s.state === 'ACTIVE')?.url ?? profile.skins?.[0]?.url
  }
}
