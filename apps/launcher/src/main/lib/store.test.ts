import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, writeFile, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// `store.ts` importiert `app` aus electron — hier läuft kein Electron.
vi.mock('electron', () => ({ app: { getPath: () => tmpdir() } }))

const { JsonStore } = await import('./store')

interface Shape {
  a: number
  b: string
  c?: boolean
}

const DEFAULTS: Shape = { a: 1, b: 'default' }

describe('JsonStore', () => {
  let dir: string
  let file: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kc-store-'))
    file = join(dir, 'data.json')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('liefert Defaults, wenn die Datei fehlt', async () => {
    const store = new JsonStore<Shape>(file, DEFAULTS)
    expect(await store.read()).toEqual(DEFAULTS)
  })

  it('liefert Defaults statt zu werfen, wenn die Datei kaputt ist', async () => {
    // Genau der Fall, der beim alten Client die Instanzliste hätte verlieren können.
    await writeFile(file, '{ das ist kein JSON', 'utf-8')
    const store = new JsonStore<Shape>(file, DEFAULTS)
    expect(await store.read()).toEqual(DEFAULTS)
  })

  it('ergänzt fehlende Felder aus den Defaults', async () => {
    // Datei einer älteren Version, die `b` noch nicht kannte.
    await writeFile(file, JSON.stringify({ a: 42 }), 'utf-8')
    const store = new JsonStore<Shape>(file, DEFAULTS)
    expect(await store.read()).toEqual({ a: 42, b: 'default' })
  })

  it('schreibt und liest zurück', async () => {
    const store = new JsonStore<Shape>(file, DEFAULTS)
    await store.write({ a: 7, b: 'x', c: true })

    // Frischer Store ohne Zwischenspeicher: liest wirklich von der Platte.
    const fresh = new JsonStore<Shape>(file, DEFAULTS)
    expect(await fresh.read()).toEqual({ a: 7, b: 'x', c: true })
  })

  it('lässt keine .tmp-Datei zurück (atomares Schreiben)', async () => {
    const store = new JsonStore<Shape>(file, DEFAULTS)
    await store.write({ a: 2, b: 'y' })

    const entries = await readdir(dir)
    expect(entries).toEqual(['data.json'])
    expect(entries.some((e) => e.endsWith('.tmp'))).toBe(false)
  })

  it('legt fehlende Ordner an', async () => {
    const nested = join(dir, 'deep', 'deeper', 'data.json')
    const store = new JsonStore<Shape>(nested, DEFAULTS)
    await store.write({ a: 3, b: 'z' })
    expect(JSON.parse(await readFile(nested, 'utf-8'))).toEqual({ a: 3, b: 'z' })
  })

  it('update() führt zusammen statt zu ersetzen', async () => {
    const store = new JsonStore<Shape>(file, DEFAULTS)
    await store.write({ a: 1, b: 'keep' })
    expect(await store.update({ a: 99 })).toEqual({ a: 99, b: 'keep' })
  })
})
