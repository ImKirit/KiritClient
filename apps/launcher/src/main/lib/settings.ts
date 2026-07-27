import { join } from 'node:path'

import type { GlobalSettings } from '../../shared/types'
import { JsonStore, appDataDir, defaultInstancesDir } from './store'

/**
 * Client-weite Einstellungen. Was am Spiel hängt (RAM, Auflösung, Java-Argumente),
 * steht dagegen an der einzelnen Instanz — Owner-Entscheidung 2026-07-27:
 * "Client global, Spiel pro Instanz".
 */
let store: JsonStore<GlobalSettings> | null = null

function getStore(): JsonStore<GlobalSettings> {
  // Erst bei Bedarf anlegen: `app.getPath` funktioniert nicht vor `app.whenReady`.
  store ??= new JsonStore<GlobalSettings>(join(appDataDir(), 'settings.json'), {
    language: 'en',
    instancesDir: defaultInstancesDir(),
    defaultRamMb: 4096,
    showSnapshots: false,
    instanceView: 'list',
    instanceSort: 'lastPlayed',
    accentColor: '#2f6bff'
  })
  return store
}

export async function getSettings(): Promise<GlobalSettings> {
  return getStore().read()
}

export async function patchSettings(patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
  return getStore().update(patch)
}
