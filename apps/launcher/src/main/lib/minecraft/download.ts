import { createHash } from 'node:crypto'
import { dirname } from 'node:path'
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'

/**
 * Downloads mit Prüfsumme, Wiederholung und Nebenläufigkeit.
 *
 * Drei Dinge, die der alte Client anders machte:
 *  - **ein einziger Fehlschlag riss den ganzen Start ab** (`handle.await??`), ohne Retry
 *  - **kein SHA1** für alles außer Mojang-Artefakten
 *  - **synchrones `std::fs::read`** zur Prüfung mitten im async-Kontext
 */

export interface DownloadItem {
  url: string
  target: string
  sha1?: string
  size?: number
}

async function sha1Of(file: string): Promise<string> {
  const hash = createHash('sha1')
  hash.update(await readFile(file))
  return hash.digest('hex')
}

/** Liegt die Datei schon korrekt vor? Ohne Prüfsumme zählt die Größe, sonst der Hash. */
async function isPresent(item: DownloadItem): Promise<boolean> {
  const info = await stat(item.target).catch(() => null)
  if (!info?.isFile()) return false
  if (item.size !== undefined && info.size !== item.size) return false
  if (!item.sha1) return true
  return (await sha1Of(item.target).catch(() => '')) === item.sha1
}

export async function downloadOne(item: DownloadItem, attempts = 3): Promise<void> {
  if (await isPresent(item)) return

  let lastError: unknown = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(item.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = Buffer.from(await res.arrayBuffer())

      if (item.sha1) {
        const got = createHash('sha1').update(data).digest('hex')
        if (got !== item.sha1) {
          throw new Error(`checksum mismatch (expected ${item.sha1}, got ${got})`)
        }
      }

      await mkdir(dirname(item.target), { recursive: true })
      await writeFile(item.target, data)
      return
    } catch (e) {
      lastError = e
      // Kurz warten und erneut versuchen — ein 503 ist meist nach einer Sekunde vorbei.
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 400 * attempt))
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Download failed: ${item.url} (${reason})`)
}

/**
 * Mehrere Dateien parallel laden, aber begrenzt.
 *
 * `onProgress` meldet fertige Dateien, nicht Bytes — bei ~3000 winzigen Assets ist die
 * Anzahl die ehrlichere Angabe, und sie kostet keine zusätzliche Buchführung.
 */
export async function downloadAll(
  items: DownloadItem[],
  concurrency = 8,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const total = items.length
  let done = 0
  let cursor = 0

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      await downloadOne(items[index])
      done++
      onProgress?.(done, total)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker))
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${url} (HTTP ${res.status})`)
  return (await res.json()) as T
}
