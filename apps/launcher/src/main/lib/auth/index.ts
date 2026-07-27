import type { BrowserWindow } from 'electron'

import type { Account, AccountsState } from '../../../shared/types'
import { exchangeCode, refreshMsToken, toMinecraftSession } from './chain'
import { requestAuthCode } from './window'
import { getState, getTokens, upsertAccount } from './accounts'

export { getState, setActive, removeAccount } from './accounts'
export { SignInCancelled } from './window'

/**
 * Vollständige Anmeldung: Fenster öffnen, Code holen, Kette durchlaufen, speichern.
 *
 * `onStep` meldet Zwischenschritte an die Oberfläche, damit sie nicht mehrere
 * Sekunden schweigt.
 */
export async function signIn(
  parent: BrowserWindow,
  onStep?: (step: string) => void
): Promise<{ account: Account; state: AccountsState }> {
  const { code, verifier } = await requestAuthCode(parent)

  onStep?.('exchange')
  const ms = await exchangeCode(code, verifier)

  const session = await toMinecraftSession(ms.accessToken, onStep)

  const account: Account = {
    id: session.uuid,
    username: session.username,
    xuid: session.xuid,
    addedAt: new Date().toISOString(),
    expiresAt: session.expiresAt,
    skinUrl: session.skinUrl
  }

  // Neu hinzugefügter Account wird aktiv (Owner-Entscheidung 2026-07-27).
  const state = await upsertAccount(
    account,
    {
      msRefreshToken: ms.refreshToken,
      mcAccessToken: session.accessToken,
      mcExpiresAt: session.expiresAt
    },
    true
  )

  return { account, state }
}

/**
 * Gültiges Minecraft-Token für einen Account holen, bei Bedarf erneuert.
 *
 * Wird der Refresh abgelehnt, **wirft** das hier. Der alte Client hat an dieser
 * Stelle nur geloggt und mit dem abgelaufenen Token gestartet — Minecraft stürzte
 * dann später mit "Invalid session" ab, ohne dass der Nutzer je einen Hinweis sah.
 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const tokens = await getTokens(accountId)
  if (!tokens) throw new Error('This account has to be signed in again.')

  // Ein Puffer von zwei Minuten: ein Token, das während des Starts abläuft, nützt nichts.
  const stillValid = new Date(tokens.mcExpiresAt).getTime() - Date.now() > 120_000
  if (stillValid) return tokens.mcAccessToken

  const ms = await refreshMsToken(tokens.msRefreshToken)
  const session = await toMinecraftSession(ms.accessToken)

  const state = await getState()
  const existing = state.accounts.find((a) => a.id === accountId)
  await upsertAccount(
    {
      id: session.uuid,
      username: session.username,
      xuid: session.xuid,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
      expiresAt: session.expiresAt,
      skinUrl: session.skinUrl
    },
    {
      msRefreshToken: ms.refreshToken,
      mcAccessToken: session.accessToken,
      mcExpiresAt: session.expiresAt
    },
    false
  )

  return session.accessToken
}
