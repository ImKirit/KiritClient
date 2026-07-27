/** Ausschnitte des Mojang-Version-JSON, die der Launcher wirklich braucht. */

export interface Artifact {
  path?: string
  sha1: string
  size: number
  url: string
}

export interface Rule {
  action: 'allow' | 'disallow'
  os?: { name?: string; version?: string; arch?: string }
  features?: Record<string, boolean>
}

export interface Library {
  name: string
  rules?: Rule[]
  downloads?: {
    artifact?: Artifact
    classifiers?: Record<string, Artifact>
  }
  /** Alte Konvention (< 1.19): Klassifizierer-Name je Betriebssystem. */
  natives?: Record<string, string>
  extract?: { exclude?: string[] }
}

export type ArgumentEntry = string | { rules?: Rule[]; value: string | string[] }

export interface VersionJson {
  id: string
  /** Bei Fabric u. ä.: Basisversion, die zusätzlich geladen werden muss. */
  inheritsFrom?: string
  mainClass: string
  assets?: string
  assetIndex?: { id: string; sha1: string; size: number; totalSize: number; url: string }
  downloads?: { client?: Artifact; server?: Artifact }
  libraries: Library[]
  /** Modernes Format ab 1.13. */
  arguments?: { game?: ArgumentEntry[]; jvm?: ArgumentEntry[] }
  /** Altes Format bis 1.12. */
  minecraftArguments?: string
  /**
   * Von Mojang angegebene Java-Hauptversion. Der alte Client hat dieses Feld
   * deserialisiert und **nie benutzt** — stattdessen riet er anhand der MC-Version.
   */
  javaVersion?: { component: string; majorVersion: number }
}

export interface AssetIndex {
  objects: Record<string, { hash: string; size: number }>
  /** Vor 1.7: Assets liegen unter ihrem echten Namen statt unter dem Hash. */
  map_to_resources?: boolean
  virtual?: boolean
}

// LaunchProgress liegt in `shared/types.ts` — der Renderer braucht ihn ebenfalls.
