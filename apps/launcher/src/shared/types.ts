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
  /** Angeheftete Instanzen stehen immer oben in der Liste. */
  pinned?: boolean
  /** Freie Gruppe/Marke, in der Detailansicht bearbeitbar. */
  tag?: string
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
  /**
   * Frei wählbare Akzentfarbe (Hex).
   * **Gold bleibt davon unberührt** — es ist allein dem KiritClient-Zustand
   * vorbehalten und darf nicht mitwandern.
   */
  accentColor: string
  /** Zuletzt auf der Startseite gewählte Instanz. */
  lastLaunchedId?: string
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

/**
 * Ein angemeldeter Minecraft-Account.
 *
 * Hier stehen **keine Tokens**. Die liegen verschlüsselt daneben und verlassen den
 * Main-Prozess nie — der Renderer bekommt nur, was er anzeigen muss.
 */
export interface Account {
  /** Minecraft-Profil-UUID. */
  id: string
  username: string
  /** Wird für den Spielstart gebraucht und diesmal mitgespeichert. */
  xuid: string
  addedAt: string
  /** Ablauf des Minecraft-Tokens, ISO. */
  expiresAt: string
  /** Skin-Textur auf textures.minecraft.net — daraus wird der Kopf ausgeschnitten. */
  skinUrl?: string
}

export interface AccountsState {
  accounts: Account[]
  activeId: string | null
}

export type LaunchStage =
  | 'version'
  | 'java'
  | 'client'
  | 'libraries'
  | 'assets'
  | 'natives'
  | 'starting'

/** Fortschritt eines Startvorgangs, wie ihn die Oberfläche anzeigt. */
export interface LaunchProgress {
  instanceId: string
  stage: LaunchStage
  /** 0..1 über den gesamten Vorgang. */
  progress: number
  detail: string
}

export interface RunningInstance {
  instanceId: string
  startedAt: number
}
