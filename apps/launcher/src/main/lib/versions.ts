import type { McVersion, McVersionType, VersionManifest } from '../../shared/types'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

interface RawManifest {
  latest: { release: string; snapshot: string }
  versions: { id: string; type: string; releaseTime: string }[]
}

/**
 * Versionsliste von Mojang.
 *
 * Wird im Speicher zwischengehalten — die Liste ändert sich höchstens einmal am Tag,
 * und der Assistent soll beim zweiten Öffnen nicht erneut ins Netz.
 */
let cache: { at: number; data: VersionManifest } | null = null
const MAX_AGE_MS = 30 * 60 * 1000

export async function fetchVersionManifest(): Promise<VersionManifest> {
  if (cache && Date.now() - cache.at < MAX_AGE_MS) return cache.data

  const res = await fetch(MANIFEST_URL)
  if (!res.ok) {
    throw new Error(`Version manifest request failed (HTTP ${res.status})`)
  }
  const raw = (await res.json()) as RawManifest

  const versions: McVersion[] = raw.versions.map((v) => ({
    id: v.id,
    type: v.type as McVersionType,
    releaseTime: v.releaseTime
  }))

  const data: VersionManifest = {
    latestRelease: raw.latest.release,
    latestSnapshot: raw.latest.snapshot,
    versions
  }

  cache = { at: Date.now(), data }
  return data
}
