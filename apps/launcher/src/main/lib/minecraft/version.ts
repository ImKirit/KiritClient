import { join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

import type { VersionJson } from './types'
import { fetchJson } from './download'
import { fetchVersionManifest } from '../versions'

/**
 * Version-JSON besorgen und, falls nötig, mit seiner Basisversion zusammenführen.
 *
 * `inheritsFrom` nutzen Fabric und andere Loader: Ihr JSON enthält nur die eigenen
 * Ergänzungen und verweist auf die Vanilla-Version darunter.
 */

async function loadOrFetch(versionId: string, versionsDir: string): Promise<VersionJson> {
  const file = join(versionsDir, versionId, `${versionId}.json`)

  const cached = await readFile(file, 'utf-8').catch(() => null)
  if (cached) {
    try {
      return JSON.parse(cached) as VersionJson
    } catch {
      // Kaputte Datei: neu holen statt aufzugeben.
    }
  }

  const manifest = await fetchVersionManifest()
  const entry = manifest.versions.find((v) => v.id === versionId)
  if (!entry) throw new Error(`Unknown Minecraft version: ${versionId}`)

  // Das Manifest liefert die URL nicht in unserem gekürzten Typ — direkt nachschlagen.
  const raw = await fetchJson<{ versions: { id: string; url: string }[] }>(
    'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
  )
  const url = raw.versions.find((v) => v.id === versionId)?.url
  if (!url) throw new Error(`No metadata URL for version ${versionId}`)

  const json = await fetchJson<VersionJson>(url)
  await mkdir(join(versionsDir, versionId), { recursive: true })
  await writeFile(file, JSON.stringify(json, null, 2), 'utf-8')
  return json
}

/** Kind über Eltern legen: Bibliotheken des Kindes zuerst, damit sie gewinnen. */
function merge(child: VersionJson, parent: VersionJson): VersionJson {
  return {
    ...parent,
    ...child,
    libraries: [...child.libraries, ...parent.libraries],
    arguments: {
      game: [...(parent.arguments?.game ?? []), ...(child.arguments?.game ?? [])],
      jvm: [...(parent.arguments?.jvm ?? []), ...(child.arguments?.jvm ?? [])]
    },
    // Diese Felder liefert nur die Basisversion.
    assetIndex: child.assetIndex ?? parent.assetIndex,
    assets: child.assets ?? parent.assets,
    downloads: child.downloads ?? parent.downloads,
    javaVersion: child.javaVersion ?? parent.javaVersion,
    minecraftArguments: child.minecraftArguments ?? parent.minecraftArguments
  }
}

export async function resolveVersion(
  versionId: string,
  versionsDir: string,
  depth = 0
): Promise<VersionJson> {
  if (depth > 5) throw new Error('Version inheritance is nested too deeply')

  const version = await loadOrFetch(versionId, versionsDir)
  if (!version.inheritsFrom) return version

  const parent = await resolveVersion(version.inheritsFrom, versionsDir, depth + 1)
  return merge(version, parent)
}
