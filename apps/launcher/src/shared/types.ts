/**
 * Gemeinsame Typen für Main- und Renderer-Prozess.
 *
 * Liegt bewusst außerhalb von `main/` und `renderer/`, damit beide Seiten
 * denselben Vertrag benutzen und ein Feldname nicht an einer Stelle abweicht.
 */

export type LoaderType = 'vanilla' | 'fabric'

/**
 * Einstellungen, die am Spiel hängen und deshalb pro Instanz gelten
 * (Owner-Entscheidung 2026-07-27: "Client global, Spiel pro Instanz").
 *
 * `undefined` heißt überall: globalen Standardwert benutzen.
 */
export interface InstanceSettings {
  ramMb?: number
  javaArgs?: string
  width?: number
  height?: number
}

export interface Instance {
  id: string
  name: string
  mcVersion: string
  loader: LoaderType
  loaderVersion?: string
  /**
   * Der KiritClient-Schalter. Ist er an, bekommt die Instanz den goldenen Rand.
   * Der angezeigte Loader bleibt davon unberührt — eine Vanilla-Instanz zeigt
   * weiterhin "Vanilla" (Owner-Entscheidung 2026-07-27).
   */
  kiritClient: boolean
  /** Dateiname eines eigenen Bildes in `<instanz>/.kiritclient/`. Ohne: erzeugtes Muster. */
  icon?: string
  dir: string
  createdAt: string
  lastPlayed?: string
  playtimeSeconds: number
  settings: InstanceSettings
}

export type InstanceView = 'grid' | 'list'
export type InstanceSort = 'lastPlayed' | 'name' | 'version' | 'playtime'

export interface InstanceFilter {
  search: string
  loader?: LoaderType
  kiritClientOnly?: boolean
}

/**
 * Client-weite Einstellungen — gelten instanzübergreifend.
 */
export interface GlobalSettings {
  language: string
  instancesDir: string
  defaultRamMb: number
  /** Snapshots, Alpha und Beta in der Versionsliste anzeigen. */
  showSnapshots: boolean
  instanceView: InstanceView
  instanceSort: InstanceSort
}

export type McVersionType = 'release' | 'snapshot' | 'old_beta' | 'old_alpha'

export interface McVersion {
  id: string
  type: McVersionType
  releaseTime: string
}

export interface VersionManifest {
  latestRelease: string
  latestSnapshot: string
  versions: McVersion[]
}

export interface CreateInstanceInput {
  name: string
  mcVersion: string
  loader: LoaderType
  kiritClient: boolean
}

/** Ergebnis von Operationen, die scheitern dürfen, ohne dass es ein Absturz ist. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }
