import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

import type { AssetIndex, VersionJson } from './types'
import { downloadOne, type DownloadItem } from './download'

const RESOURCES_BASE = 'https://resources.download.minecraft.net'

/**
 * Assets auflösen.
 *
 * Der alte Client lud den Asset-Index bei **jedem Start erneut per HTTP**, obwohl er ihn
 * einen Moment vorher auf die Platte geschrieben hatte. Hier wird er einmal geladen und
 * danach von der Platte gelesen.
 */
export async function loadAssetIndex(
  version: VersionJson,
  assetsDir: string
): Promise<{ index: AssetIndex; id: string } | null> {
  if (!version.assetIndex) return null

  const id = version.assetIndex.id
  const file = join(assetsDir, 'indexes', `${id}.json`)

  await downloadOne({
    url: version.assetIndex.url,
    target: file,
    sha1: version.assetIndex.sha1,
    size: version.assetIndex.size
  })

  return { index: JSON.parse(await readFile(file, 'utf-8')) as AssetIndex, id }
}

/** Downloadliste für alle Asset-Objekte. Der Hash bestimmt Pfad und Prüfsumme. */
export function assetDownloads(index: AssetIndex, assetsDir: string): DownloadItem[] {
  const items: DownloadItem[] = []
  const seen = new Set<string>()

  for (const { hash, size } of Object.values(index.objects)) {
    if (seen.has(hash)) continue
    seen.add(hash)
    const sub = hash.slice(0, 2)
    items.push({
      url: `${RESOURCES_BASE}/${sub}/${hash}`,
      target: join(assetsDir, 'objects', sub, hash),
      sha1: hash,
      size
    })
  }

  return items
}
