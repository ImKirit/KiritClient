import { app } from 'electron'
import { join, dirname } from 'node:path'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'

/**
 * Kleiner JSON-Speicher auf der Platte.
 *
 * Zwei Eigenschaften, die der alte Client nicht hatte:
 *  - **Atomar schreiben** (erst in `.tmp`, dann umbenennen). Ein Absturz mitten im
 *    Schreiben hinterlässt sonst eine halbe Datei, und die Instanzliste ist weg.
 *  - **Selbstheilend lesen**: kaputte oder fehlende Datei → Defaults, kein Absturz.
 */
export class JsonStore<T> {
  private cache: T | null = null

  constructor(
    private readonly file: string,
    private readonly defaults: T
  ) {}

  async read(): Promise<T> {
    if (this.cache) return this.cache
    try {
      const raw = await readFile(this.file, 'utf-8')
      // Gespeicherte Werte über die Defaults legen: fehlende Felder aus einer
      // älteren Version werden dadurch ergänzt statt undefined zu sein.
      this.cache = { ...this.defaults, ...(JSON.parse(raw) as T) }
    } catch {
      this.cache = { ...this.defaults }
    }
    return this.cache
  }

  async write(value: T): Promise<void> {
    this.cache = value
    await mkdir(dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    await writeFile(tmp, JSON.stringify(value, null, 2), 'utf-8')
    await rename(tmp, this.file)
  }

  async update(patch: Partial<T>): Promise<T> {
    const next = { ...(await this.read()), ...patch }
    await this.write(next)
    return next
  }
}

/** Basisordner für alles, was KiritClient selbst ablegt. */
export function appDataDir(): string {
  return join(app.getPath('appData'), 'KiritClient')
}

/**
 * Standard-Speicherort für Instanzen: %APPDATA%\KiritClient\instances
 * (Owner-Entscheidung 2026-07-27). In den Einstellungen änderbar.
 */
export function defaultInstancesDir(): string {
  return join(appDataDir(), 'instances')
}
