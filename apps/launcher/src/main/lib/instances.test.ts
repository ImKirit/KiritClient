import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const trashItem = vi.fn(async () => undefined)
const openPath = vi.fn(async () => '')

vi.mock('electron', () => ({
  app: { getPath: () => tmpdir() },
  shell: { trashItem, openPath }
}))

// Der Speicherort für Instanzen kommt aus den Einstellungen — im Test aus einem Temp-Ordner.
let instancesRoot = ''
vi.mock('./settings', () => ({
  getSettings: async () => ({
    language: 'en',
    instancesDir: instancesRoot,
    defaultRamMb: 4096,
    showSnapshots: false,
    instanceView: 'grid',
    instanceSort: 'lastPlayed'
  })
}))

const {
  __setStoreForTests,
  listInstances,
  createInstance,
  updateInstance,
  deleteInstance,
  moveInstance
} = await import('./instances')

const exists = (p: string): Promise<boolean> => stat(p).then(() => true, () => false)

describe('Instanz-Verwaltung', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kc-inst-'))
    instancesRoot = join(dir, 'instances')
    __setStoreForTests(join(dir, 'instances.json'))
    trashItem.mockClear()
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('startet mit einer leeren Liste', async () => {
    expect(await listInstances()).toEqual([])
  })

  it('legt eine Instanz mit Ordner an', async () => {
    const created = await createInstance({
      name: 'Survival 1.21',
      mcVersion: '1.21.4',
      loader: 'fabric',
      kiritClient: true
    })

    expect(created.name).toBe('Survival 1.21')
    expect(created.kiritClient).toBe(true)
    expect(created.playtimeSeconds).toBe(0)
    expect(await exists(join(created.dir, '.kiritclient'))).toBe(true)
    expect(await listInstances()).toHaveLength(1)
  })

  it('macht aus dem Namen einen brauchbaren Ordnernamen', async () => {
    const created = await createInstance({
      name: 'Sky/Block: 2024!',
      mcVersion: '1.20.1',
      loader: 'vanilla',
      kiritClient: false
    })
    const folder = created.dir.split(/[\\/]/).pop()!
    // Keine Zeichen, die Windows-Pfade sprengen.
    expect(folder).toMatch(/^[a-z0-9-]+$/)
    expect(folder.startsWith('sky-block-2024')).toBe(true)
  })

  it('erlaubt zwei Instanzen mit demselben Namen', async () => {
    const a = await createInstance({
      name: 'Test', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    const b = await createInstance({
      name: 'Test', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    expect(a.dir).not.toBe(b.dir)
    expect(await listInstances()).toHaveLength(2)
  })

  it('weist einen leeren Namen zurück', async () => {
    await expect(
      createInstance({ name: '   ', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false })
    ).rejects.toThrow(/name/i)
  })

  it('speichert Änderungen dauerhaft', async () => {
    const created = await createInstance({
      name: 'Alt', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    await updateInstance(created.id, { name: 'Neu', kiritClient: true })

    const [stored] = await listInstances()
    expect(stored.name).toBe('Neu')
    expect(stored.kiritClient).toBe(true)
    // Umbenennen darf den Ordner NICHT verschieben — bewusste Entscheidung.
    expect(stored.dir).toBe(created.dir)
  })

  it('löscht ohne Dateien: Eintrag weg, Ordner bleibt', async () => {
    const created = await createInstance({
      name: 'Weg', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    await deleteInstance(created.id, false)

    expect(await listInstances()).toEqual([])
    expect(await exists(created.dir)).toBe(true)
    expect(trashItem).not.toHaveBeenCalled()
  })

  it('löscht mit Dateien über den Papierkorb, nicht hart', async () => {
    const created = await createInstance({
      name: 'Weg2', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    await deleteInstance(created.id, true)

    expect(trashItem).toHaveBeenCalledWith(created.dir)
    expect(await listInstances()).toEqual([])
  })

  it('verschiebt: Dateien landen am neuen Ort, die Quelle verschwindet', async () => {
    const created = await createInstance({
      name: 'Move Me', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    await mkdir(join(created.dir, 'saves', 'world'), { recursive: true })
    await writeFile(join(created.dir, 'saves', 'world', 'level.dat'), 'x'.repeat(64))
    await writeFile(join(created.dir, 'options.txt'), 'fov:80')

    const target = join(dir, 'anderswo')
    await mkdir(target, { recursive: true })

    const progress: number[] = []
    const moved = await moveInstance(created.id, target, (copied) => progress.push(copied))

    expect(moved.dir.startsWith(target)).toBe(true)
    expect(await exists(join(moved.dir, 'saves', 'world', 'level.dat'))).toBe(true)
    expect(await exists(join(moved.dir, 'options.txt'))).toBe(true)
    // Quelle ist erst NACH dem Eintragen entfernt worden.
    expect(await exists(created.dir)).toBe(false)
    // Der gespeicherte Pfad zeigt auf den neuen Ort.
    expect((await listInstances())[0].dir).toBe(moved.dir)
    expect(progress.length).toBeGreaterThan(0)
  })

  it('meldet beim Verschieben eine sinnvolle Gesamtgröße', async () => {
    const created = await createInstance({
      name: 'Sized', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    await writeFile(join(created.dir, 'a.bin'), Buffer.alloc(1000))
    await writeFile(join(created.dir, 'b.bin'), Buffer.alloc(2000))

    const target = join(dir, 'ziel')
    await mkdir(target, { recursive: true })

    let lastTotal = 0
    await moveInstance(created.id, target, (_c, total) => {
      lastTotal = total
    })
    expect(lastTotal).toBe(3000)
  })

  it('verschieben an denselben Ort ist ein No-Op', async () => {
    const created = await createInstance({
      name: 'Same', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    const parent = created.dir.slice(0, created.dir.lastIndexOf(created.dir.split(/[\\/]/).pop()!) - 1)
    const result = await moveInstance(created.id, parent, () => {})

    expect(result.dir).toBe(created.dir)
    expect(await exists(created.dir)).toBe(true)
  })

  it('wirft bei unbekannter ID statt still zu scheitern', async () => {
    await expect(updateInstance('gibt-es-nicht', { name: 'x' })).rejects.toThrow(/not found/i)
    await expect(deleteInstance('gibt-es-nicht', false)).rejects.toThrow(/not found/i)
  })

  it('überlebt eine kaputte instances.json', async () => {
    await writeFile(join(dir, 'instances.json'), 'kaputt{{{', 'utf-8')
    __setStoreForTests(join(dir, 'instances.json'))
    expect(await listInstances()).toEqual([])
  })

  it('legt Instanzen im eingestellten Ordner ab', async () => {
    const created = await createInstance({
      name: 'Wo', mcVersion: '1.21.4', loader: 'fabric', kiritClient: false
    })
    expect(created.dir.startsWith(instancesRoot)).toBe(true)
    expect(await readdir(instancesRoot)).toHaveLength(1)
  })
})
