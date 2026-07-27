import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, stat } from 'node:fs/promises'

import type { VersionJson } from './types'

const run = promisify(execFile)

/**
 * Java finden.
 *
 * Wichtigster Unterschied zum alten Client: Die benötigte Hauptversion kommt aus
 * **`version.javaVersion.majorVersion`** — das Feld liefert Mojang mit, der alte Client
 * hat es deserialisiert und **nie benutzt**, sondern anhand der MC-Version geraten.
 *
 * Das automatische Nachladen von Adoptium ist beschlossen, aber noch nicht gebaut
 * (Owner-Entscheidung 2026-07-27). Bis dahin wird nur gesucht.
 */

export interface JavaInstallation {
  path: string
  major: number
}

/** Von Mojang geforderte Java-Hauptversion, mit Rückfall auf die MC-Version. */
export function requiredJavaMajor(version: VersionJson): number {
  if (version.javaVersion?.majorVersion) return version.javaVersion.majorVersion

  // Nur als Notnagel für sehr alte Version-JSONs ohne das Feld.
  const [, minor = '0'] = version.id.split('.')
  const m = Number(minor)
  if (!Number.isFinite(m) || m <= 16) return 8
  if (m === 17) return 16
  if (m < 20) return 17
  return 21
}

function javaExecutable(home: string): string {
  return join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
}

async function majorOf(javaPath: string): Promise<number | null> {
  try {
    // `java -version` schreibt nach stderr, nicht stdout.
    const { stderr } = await run(javaPath, ['-version'])
    const m = stderr.match(/version "(\d+)(?:\.(\d+))?/)
    if (!m) return null
    const first = Number(m[1])
    // Vor Java 9: "1.8.0_402" → Hauptversion ist die zweite Zahl.
    return first === 1 ? Number(m[2] ?? 0) : first
  } catch {
    return null
  }
}

/** Übliche Installationsorte je Betriebssystem. */
function searchRoots(): string[] {
  if (process.platform === 'win32') {
    const pf = process.env['ProgramFiles'] ?? 'C:\\Program Files'
    const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
    return [
      join(pf, 'Java'),
      join(pf, 'Eclipse Adoptium'),
      join(pf, 'Microsoft'),
      join(pf, 'Zulu'),
      join(pf, 'Amazon Corretto'),
      join(pf, 'BellSoft'),
      join(pf86, 'Java')
    ]
  }
  if (process.platform === 'darwin') return ['/Library/Java/JavaVirtualMachines']
  return ['/usr/lib/jvm', '/usr/java']
}

export async function detectJavaInstallations(): Promise<JavaInstallation[]> {
  const candidates = new Set<string>()

  if (process.env['JAVA_HOME']) candidates.add(javaExecutable(process.env['JAVA_HOME']))

  for (const root of searchRoots()) {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const home = join(root, entry.name)
      // macOS packt die Laufzeit eine Ebene tiefer.
      for (const exe of [javaExecutable(home), javaExecutable(join(home, 'Contents', 'Home'))]) {
        if (await stat(exe).then((s) => s.isFile(), () => false)) candidates.add(exe)
      }
    }
  }

  const found: JavaInstallation[] = []
  for (const path of candidates) {
    const major = await majorOf(path)
    if (major) found.push({ path, major })
  }

  // Neueste zuerst — bei gleicher Hauptversion ist die Reihenfolge egal.
  return found.sort((a, b) => b.major - a.major)
}

/** Passende Installation wählen: exakte Hauptversion, sonst die nächsthöhere. */
export function pickJava(
  installations: JavaInstallation[],
  required: number
): JavaInstallation | null {
  return (
    installations.find((j) => j.major === required) ??
    installations.filter((j) => j.major > required).sort((a, b) => a.major - b.major)[0] ??
    null
  )
}
