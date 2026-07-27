import { join, basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, readdir, stat, copyFile, cp } from 'node:fs/promises'
import { shell } from 'electron'

import type { CreateInstanceInput, Instance } from '../../shared/types'
import { JsonStore, appDataDir, defaultInstancesDir } from './store'
import { getSettings } from './settings'

interface InstancesFile {
  instances: Instance[]
}

/**
 * Store wird erst bei Bedarf angelegt — `app.getPath` ist vor `app.whenReady`
 * nicht verlässlich, und Tests können den Ort so überschreiben.
 */
let storeRef: JsonStore<InstancesFile> | null = null

function store(): JsonStore<InstancesFile> {
  storeRef ??= new JsonStore<InstancesFile>(join(appDataDir(), 'instances.json'), {
    instances: []
  })
  return storeRef
}

/** Nur für Tests: Speicherort umbiegen und Zwischenspeicher leeren. */
export function __setStoreForTests(file: string): void {
  storeRef = new JsonStore<InstancesFile>(file, { instances: [] })
}

/** Ordnername aus dem Instanznamen — ohne Zeichen, die Windows nicht mag. */
function folderName(name: string, id: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'instance'
  // Kurz-ID angehängt: zwei Instanzen dürfen gleich heißen.
  return `${slug}-${id.slice(0, 8)}`
}

export async function listInstances(): Promise<Instance[]> {
  return (await store().read()).instances
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
  const name = input.name.trim()
  if (!name) throw new Error('Instance name must not be empty')

  const settings = await getSettings()
  const id = randomUUID()
  const dir = join(settings.instancesDir || defaultInstancesDir(), folderName(name, id))

  await mkdir(join(dir, '.kiritclient'), { recursive: true })

  const instance: Instance = {
    id,
    name,
    mcVersion: input.mcVersion,
    loader: input.loader,
    kiritClient: input.kiritClient,
    dir,
    createdAt: new Date().toISOString(),
    playtimeSeconds: 0,
    settings: {}
  }

  const file = await store().read()
  await store().write({ instances: [...file.instances, instance] })
  return instance
}

export async function updateInstance(
  id: string,
  patch: Partial<Omit<Instance, 'id' | 'dir'>>
): Promise<Instance> {
  const file = await store().read()
  const idx = file.instances.findIndex((i) => i.id === id)
  if (idx === -1) throw new Error(`Instance ${id} not found`)

  const next = { ...file.instances[idx], ...patch }
  const instances = [...file.instances]
  instances[idx] = next
  await store().write({ instances })
  return next
}

export async function deleteInstance(id: string, deleteFiles: boolean): Promise<void> {
  const file = await store().read()
  const instance = file.instances.find((i) => i.id === id)
  if (!instance) throw new Error(`Instance ${id} not found`)

  if (deleteFiles) {
    // In den Papierkorb statt hart löschen — Welten sind unersetzlich.
    const err = await shell.trashItem(instance.dir).then(
      () => null,
      (e: Error) => e
    )
    if (err) throw new Error(`Could not move instance folder to trash: ${err.message}`)
  }

  await store().write({ instances: file.instances.filter((i) => i.id !== id) })
}

/** Eigenes Profilbild setzen: wird in den Instanzordner kopiert, nicht verlinkt. */
export async function setInstanceIcon(id: string, sourcePath: string): Promise<Instance> {
  const file = await store().read()
  const instance = file.instances.find((i) => i.id === id)
  if (!instance) throw new Error(`Instance ${id} not found`)

  const ext = (basename(sourcePath).split('.').pop() ?? 'png').toLowerCase()
  const target = `icon.${ext}`
  await mkdir(join(instance.dir, '.kiritclient'), { recursive: true })
  await copyFile(sourcePath, join(instance.dir, '.kiritclient', target))

  return updateInstance(id, { icon: target })
}

export async function openInstanceFolder(id: string): Promise<void> {
  const file = await store().read()
  const instance = file.instances.find((i) => i.id === id)
  if (!instance) throw new Error(`Instance ${id} not found`)
  await shell.openPath(instance.dir)
}

/** Gesamtgröße eines Ordners in Bytes — für die Fortschrittsanzeige beim Verschieben. */
async function dirSize(dir: string): Promise<number> {
  let total = 0
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) total += await dirSize(p)
    else total += await stat(p).then((s) => s.size, () => 0)
  }
  return total
}

/**
 * Instanz an einen anderen Ort verschieben (Owner-Entscheidung 2026-07-27:
 * "wirklich verschieben, mit Fortschritt").
 *
 * Reihenfolge ist bewusst kopieren → eintragen → Original löschen: Bricht der
 * Vorgang mittendrin ab, ist das Original unversehrt und die Instanz weiterhin
 * benutzbar. Nur den Pfad zu merken wäre die Falle, bei der Nutzer ihre Welten
 * nicht wiederfinden.
 */
export async function moveInstance(
  id: string,
  targetParentDir: string,
  onProgress: (copiedBytes: number, totalBytes: number) => void
): Promise<Instance> {
  const file = await store().read()
  const instance = file.instances.find((i) => i.id === id)
  if (!instance) throw new Error(`Instance ${id} not found`)

  const target = join(targetParentDir, basename(instance.dir))
  if (target === instance.dir) return instance

  const total = await dirSize(instance.dir)
  let copied = 0
  onProgress(0, total)

  // Rekursiv kopieren und dabei melden, wie viel schon durch ist.
  const copyDir = async (from: string, to: string): Promise<void> => {
    await mkdir(to, { recursive: true })
    for (const e of await readdir(from, { withFileTypes: true })) {
      const src = join(from, e.name)
      const dst = join(to, e.name)
      if (e.isDirectory()) {
        await copyDir(src, dst)
      } else {
        await cp(src, dst, { force: true })
        copied += await stat(dst).then((s) => s.size, () => 0)
        onProgress(copied, total)
      }
    }
  }

  await copyDir(instance.dir, target)

  const oldDir = instance.dir
  const instances = file.instances.map((i) => (i.id === id ? { ...i, dir: target } : i))
  await store().write({ instances })

  // Erst jetzt das Original entfernen — der neue Ort ist bereits eingetragen.
  await rm(oldDir, { recursive: true, force: true })

  return instances.find((i) => i.id === id)!
}
