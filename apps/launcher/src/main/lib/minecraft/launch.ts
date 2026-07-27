import { join, delimiter } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { spawn, type ChildProcess } from 'node:child_process'

import type { Instance, LaunchProgress, LaunchStage } from '../../../shared/types'
import type { VersionJson } from './types'
import { resolveArguments, substitute, type LaunchFeatures } from './rules'
import { resolveVersion } from './version'
import { resolveLibraries, extractNatives } from './libraries'
import { loadAssetIndex, assetDownloads } from './assets'
import { downloadAll, downloadOne } from './download'
import { detectJavaInstallations, pickJava, requiredJavaMajor } from './java'
import { appDataDir } from '../store'
import { getSettings } from '../settings'
import { getValidAccessToken, getState as getAccountsState } from '../auth'

/**
 * Startvorgang: alles besorgen, Befehl bauen, Prozess starten.
 *
 * Die Prozentbereiche der Abschnitte überschneiden sich bewusst **nicht** — im alten
 * Client sprang der Balken zurück, weil `natives` mit 0.52 vor `assets` mit 0.5 lag.
 */

const STAGES: Record<LaunchStage, [number, number]> = {
  version: [0.0, 0.05],
  java: [0.05, 0.1],
  client: [0.1, 0.2],
  libraries: [0.2, 0.55],
  assets: [0.55, 0.9],
  natives: [0.9, 0.97],
  starting: [0.97, 1.0]
}

function sharedDir(name: string): string {
  return join(appDataDir(), name)
}

export interface RunningGame {
  instanceId: string
  pid: number
  startedAt: number
  process: ChildProcess
}

const running = new Map<string, RunningGame>()

export function runningInstances(): { instanceId: string; startedAt: number }[] {
  return [...running.values()].map((r) => ({
    instanceId: r.instanceId,
    startedAt: r.startedAt
  }))
}

export function isRunning(instanceId: string): boolean {
  return running.has(instanceId)
}

export function stopInstance(instanceId: string): void {
  running.get(instanceId)?.process.kill()
}

export interface LaunchHooks {
  onProgress: (p: LaunchProgress) => void
  onLog: (instanceId: string, line: string) => void
  onExit: (instanceId: string, code: number | null) => void
}

export async function launchInstance(instance: Instance, hooks: LaunchHooks): Promise<number> {
  if (running.has(instance.id)) throw new Error('This instance is already running.')

  const report = (stage: LaunchStage, within: number, detail: string): void => {
    const [from, to] = STAGES[stage]
    hooks.onProgress({
      instanceId: instance.id,
      stage,
      progress: from + (to - from) * Math.min(Math.max(within, 0), 1),
      detail
    })
  }

  // ── Konto ────────────────────────────────────────────────────────────────────
  const accounts = await getAccountsState()
  const account = accounts.accounts.find((a) => a.id === accounts.activeId)
  if (!account) throw new Error('Sign in with a Microsoft account before playing.')
  const accessToken = await getValidAccessToken(account.id)

  const settings = await getSettings()
  const versionsDir = sharedDir('versions')
  const librariesDir = sharedDir('libraries')
  const assetsDir = sharedDir('assets')
  // Natives pro Instanz, nicht pro MC-Version: geteilte Ordner kollidieren, sobald
  // zwei Instanzen derselben Version gleichzeitig laufen.
  const nativesDir = join(instance.dir, '.kiritclient', 'natives')

  // ── Version ──────────────────────────────────────────────────────────────────
  report('version', 0, instance.mcVersion)
  const version: VersionJson = await resolveVersion(instance.mcVersion, versionsDir)
  report('version', 1, version.id)

  // ── Java ─────────────────────────────────────────────────────────────────────
  report('java', 0, 'Looking for Java')
  const requiredMajor = requiredJavaMajor(version)
  const java = pickJava(await detectJavaInstallations(), requiredMajor)
  if (!java) {
    throw new Error(
      `No Java ${requiredMajor} found. Automatic download is not built yet — install a JDK ${requiredMajor} for now.`
    )
  }
  report('java', 1, `Java ${java.major}`)

  // ── Client-JAR ───────────────────────────────────────────────────────────────
  const clientJar = join(versionsDir, version.id, `${version.id}.jar`)
  if (version.downloads?.client) {
    report('client', 0, 'Minecraft')
    await downloadOne({
      url: version.downloads.client.url,
      target: clientJar,
      sha1: version.downloads.client.sha1,
      size: version.downloads.client.size
    })
  }
  report('client', 1, 'Minecraft')

  // ── Bibliotheken ─────────────────────────────────────────────────────────────
  const libs = resolveLibraries(version, librariesDir)
  await downloadAll(libs.downloads, 8, (done, total) =>
    report('libraries', done / Math.max(total, 1), `Libraries ${done}/${total}`)
  )

  // ── Assets ───────────────────────────────────────────────────────────────────
  const assetInfo = await loadAssetIndex(version, assetsDir)
  if (assetInfo) {
    const items = assetDownloads(assetInfo.index, assetsDir)
    await downloadAll(items, 16, (done, total) =>
      report('assets', done / Math.max(total, 1), `Assets ${done}/${total}`)
    )
  }
  report('assets', 1, 'Assets')

  // ── Natives ──────────────────────────────────────────────────────────────────
  report('natives', 0, 'Unpacking')
  await extractNatives(libs.nativeJars, nativesDir)
  report('natives', 1, 'Unpacking')

  // ── Startbefehl ──────────────────────────────────────────────────────────────
  report('starting', 0, 'Starting')
  await mkdir(instance.dir, { recursive: true })

  const width = instance.settings.width
  const height = instance.settings.height
  const features: LaunchFeatures = {
    has_custom_resolution: Boolean(width && height),
    is_demo_user: false
  }

  const classpath = [...libs.classpath, clientJar].join(delimiter)
  const ramMb = instance.settings.ramMb ?? settings.defaultRamMb

  const values: Record<string, string> = {
    auth_player_name: account.username,
    auth_uuid: account.id,
    auth_access_token: accessToken,
    auth_xuid: account.xuid,
    clientid: '',
    user_type: 'msa',
    version_name: version.id,
    version_type: 'release',
    game_directory: instance.dir,
    assets_root: assetsDir,
    assets_index_name: assetInfo?.id ?? version.assets ?? 'legacy',
    game_assets: join(assetsDir, 'virtual', 'legacy'),
    natives_directory: nativesDir,
    launcher_name: 'KiritClient',
    launcher_version: '0.0.0',
    classpath,
    resolution_width: String(width ?? ''),
    resolution_height: String(height ?? '')
  }

  const jvmArgs = version.arguments?.jvm
    ? substitute(resolveArguments(version.arguments.jvm, features), values)
    : // Altes Format kennt keine JVM-Argumente — die Pflichtangaben selbst setzen.
      [`-Djava.library.path=${nativesDir}`, '-cp', classpath]

  const gameArgs = version.minecraftArguments
    ? substitute(version.minecraftArguments.split(' '), values)
    : substitute(resolveArguments(version.arguments?.game, features), values)

  const extra = (instance.settings.javaArgs ?? '').trim()
  const command = [
    `-Xmx${ramMb}M`,
    `-Xms${Math.min(ramMb, 1024)}M`,
    ...(extra ? extra.split(/\s+/) : []),
    ...jvmArgs,
    version.mainClass,
    ...gameArgs
  ]

  const child = spawn(java.path, command, {
    cwd: instance.dir,
    // Fenster von Java unter Windows unterdrücken; Ausgabe kommt über die Pipes.
    windowsHide: true
  })

  running.set(instance.id, {
    instanceId: instance.id,
    pid: child.pid ?? -1,
    startedAt: Date.now(),
    process: child
  })

  const pipe = (chunk: Buffer): void => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) hooks.onLog(instance.id, line)
    }
  }
  child.stdout?.on('data', pipe)
  child.stderr?.on('data', pipe)

  child.on('exit', (code) => {
    running.delete(instance.id)
    hooks.onExit(instance.id, code)
  })

  report('starting', 1, 'Started')
  return child.pid ?? -1
}
