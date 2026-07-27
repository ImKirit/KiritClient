import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'

import type { Artifact, Library, VersionJson } from './types'
import { currentOsName, rulesAllow } from './rules'
import type { DownloadItem } from './download'

/**
 * Bibliotheken auflösen: welche werden gebraucht, wo liegen sie, was muss entpackt werden.
 *
 * Deckt beide Konventionen ab — die alte mit `classifiers` + `natives` (bis ~1.18) und
 * die neue, bei der native Bibliotheken als eigene Einträge mit `natives-<os>` im Namen
 * stehen (ab 1.19).
 */

/** `group:artifact:version[:classifier]` → Pfad im Bibliotheksordner. */
export function mavenPath(name: string): string {
  const [group, artifact, version, classifier] = name.split(':')
  const file = classifier
    ? `${artifact}-${version}-${classifier}.jar`
    : `${artifact}-${version}.jar`
  return join(...group.split('.'), artifact, version, file)
}

/** Native Variante einer Bibliothek nach alter Konvention, falls vorhanden. */
function nativeArtifact(lib: Library): Artifact | null {
  const key = lib.natives?.[currentOsName()]
  if (!key) return null
  // ${arch} kommt in alten Version-JSONs vor.
  const resolved = key.replace('${arch}', process.arch === 'ia32' ? '32' : '64')
  return lib.downloads?.classifiers?.[resolved] ?? null
}

export interface ResolvedLibraries {
  /** Alles, was heruntergeladen werden muss. */
  downloads: DownloadItem[]
  /** Einträge für den Classpath, in Reihenfolge. */
  classpath: string[]
  /** JARs, aus denen native Dateien entpackt werden. */
  nativeJars: { file: string; exclude: string[] }[]
}

export function resolveLibraries(
  version: VersionJson,
  librariesDir: string
): ResolvedLibraries {
  const downloads: DownloadItem[] = []
  const classpath: string[] = []
  const nativeJars: { file: string; exclude: string[] }[] = []
  const seen = new Set<string>()

  for (const lib of version.libraries) {
    if (!rulesAllow(lib.rules)) continue

    const artifact = lib.downloads?.artifact
    if (artifact) {
      const target = join(librariesDir, artifact.path ?? mavenPath(lib.name))
      if (!seen.has(target)) {
        seen.add(target)
        downloads.push({ url: artifact.url, target, sha1: artifact.sha1, size: artifact.size })

        // Neue Konvention: native Bibliothek als eigener Eintrag, erkennbar am Namen.
        if (/natives-/.test(lib.name)) {
          nativeJars.push({ file: target, exclude: lib.extract?.exclude ?? [] })
        } else {
          classpath.push(target)
        }
      }
    }

    // Alte Konvention: zusätzliche native Variante über classifiers.
    const native = nativeArtifact(lib)
    if (native) {
      const target = join(librariesDir, native.path ?? mavenPath(`${lib.name}:natives`))
      if (!seen.has(target)) {
        seen.add(target)
        downloads.push({ url: native.url, target, sha1: native.sha1, size: native.size })
        nativeJars.push({ file: target, exclude: lib.extract?.exclude ?? [] })
      }
    }
  }

  return { downloads, classpath, nativeJars }
}

/**
 * Native Dateien in den Natives-Ordner entpacken.
 *
 * Nur die Bibliotheken selbst (`.dll`, `.so`, `.dylib`), nichts aus `META-INF` und
 * nichts, was das Version-JSON ausdrücklich ausschließt. Ordnerstruktur wird
 * absichtlich flachgeklopft — Minecraft erwartet die Dateien direkt im Ordner.
 */
export async function extractNatives(
  jars: { file: string; exclude: string[] }[],
  nativesDir: string
): Promise<void> {
  await mkdir(nativesDir, { recursive: true })

  for (const { file, exclude } of jars) {
    let zip: AdmZip
    try {
      zip = new AdmZip(file)
    } catch {
      // Ein unlesbares JAR soll den Start nicht reißen — es fehlt dann eine Bibliothek,
      // und Minecraft meldet das deutlicher als wir es hier könnten.
      continue
    }

    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue
      const name = entry.entryName
      if (name.startsWith('META-INF/')) continue
      if (!/\.(dll|so|dylib|jnilib)$/i.test(name)) continue
      if (exclude.some((prefix) => name.startsWith(prefix))) continue

      const flat = name.split('/').pop()!
      await writeFile(join(nativesDir, flat), entry.getData())
    }
  }
}
