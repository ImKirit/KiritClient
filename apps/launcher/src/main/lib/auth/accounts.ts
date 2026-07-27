import { join } from 'node:path'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { safeStorage } from 'electron'

import type { Account, AccountsState } from '../../../shared/types'
import { JsonStore, appDataDir } from '../store'

/**
 * Account-Speicher.
 *
 * Getrennt in zwei Dateien, nach dem Muster des alten Clients (`Account` im Speicher
 * vs. `AccountOnDisk` ohne Tokens) — nur diesmal ohne dessen zwei Fehler:
 *  - der XUID wird **mitgespeichert** (ging früher bei jedem Neustart verloren)
 *  - es gibt **keinen Klartext-Fallback** auf eine alte accounts.json
 *
 * `accounts.json` enthält nur Anzeigedaten. Die Tokens liegen in `tokens.dat`,
 * verschlüsselt über Electrons `safeStorage` (nutzt den Schlüsselspeicher des
 * Betriebssystems, kein zusätzliches Paket nötig).
 */

export interface StoredTokens {
  msRefreshToken: string
  mcAccessToken: string
  mcExpiresAt: string
}

let stateStore: JsonStore<AccountsState> | null = null

function store(): JsonStore<AccountsState> {
  stateStore ??= new JsonStore<AccountsState>(join(appDataDir(), 'accounts.json'), {
    accounts: [],
    activeId: null
  })
  return stateStore
}

function tokensFile(): string {
  return join(appDataDir(), 'tokens.dat')
}

type TokenMap = Record<string, StoredTokens>

async function readTokens(): Promise<TokenMap> {
  try {
    const raw = await readFile(tokensFile())
    if (!safeStorage.isEncryptionAvailable()) return {}
    return JSON.parse(safeStorage.decryptString(raw)) as TokenMap
  } catch {
    // Fehlende oder unlesbare Datei heißt: keine Tokens. Nie raten, nie Klartext lesen.
    return {}
  }
}

async function writeTokens(map: TokenMap): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    // Lieber gar nicht speichern als im Klartext — der Nutzer meldet sich dann neu an.
    throw new Error('OS encryption is unavailable, refusing to store tokens in plain text.')
  }
  await mkdir(appDataDir(), { recursive: true })
  const tmp = `${tokensFile()}.tmp`
  await writeFile(tmp, safeStorage.encryptString(JSON.stringify(map)))
  await rename(tmp, tokensFile())
}

export async function getState(): Promise<AccountsState> {
  return store().read()
}

export async function getTokens(accountId: string): Promise<StoredTokens | null> {
  return (await readTokens())[accountId] ?? null
}

export async function upsertAccount(
  account: Account,
  tokens: StoredTokens,
  makeActive: boolean
): Promise<AccountsState> {
  const state = await store().read()
  const others = state.accounts.filter((a) => a.id !== account.id)

  const next: AccountsState = {
    accounts: [...others, account],
    activeId: makeActive || !state.activeId ? account.id : state.activeId
  }

  await writeTokens({ ...(await readTokens()), [account.id]: tokens })
  await store().write(next)
  return next
}

export async function setActive(accountId: string): Promise<AccountsState> {
  const state = await store().read()
  if (!state.accounts.some((a) => a.id === accountId)) {
    throw new Error(`Account ${accountId} not found`)
  }
  return store().update({ activeId: accountId })
}

export async function removeAccount(accountId: string): Promise<AccountsState> {
  const state = await store().read()
  const accounts = state.accounts.filter((a) => a.id !== accountId)

  const tokens = await readTokens()
  delete tokens[accountId]
  await writeTokens(tokens)

  const next: AccountsState = {
    accounts,
    activeId: state.activeId === accountId ? (accounts[0]?.id ?? null) : state.activeId
  }
  await store().write(next)
  return next
}

/** Nur für Tests: Speicherort umbiegen. */
export function __setStoreForTests(file: string): void {
  stateStore = new JsonStore<AccountsState>(file, { accounts: [], activeId: null })
}
