import type { ArgumentEntry, Rule } from './types'

/**
 * Auswertung der Mojang-Regeln.
 *
 * Hier lagen zwei echte Fehler des alten Clients:
 *
 * 1. **Betriebssystem war hartkodiert** (`os.name == "windows"`). macOS und Linux
 *    hätten nie funktioniert, obwohl `targets: "all"` gebaut wurde.
 * 2. **Argumente mit Feature-Regeln wurden übersprungen** statt ausgewertet. Genau
 *    dort stehen `--width` und `--height` — die Auflösungs-Einstellung war wirkungslos.
 */

export interface LaunchFeatures {
  is_demo_user?: boolean
  has_custom_resolution?: boolean
  has_quick_plays_support?: boolean
  is_quick_play_singleplayer?: boolean
  is_quick_play_multiplayer?: boolean
  is_quick_play_realms?: boolean
}

/** Mojang-Name des laufenden Betriebssystems. */
export function currentOsName(): string {
  switch (process.platform) {
    case 'win32':
      return 'windows'
    case 'darwin':
      return 'osx'
    default:
      return 'linux'
  }
}

export function currentOsArch(): string {
  // Mojang nutzt x86 für 32 Bit, x86_64 und arm64 sonst.
  switch (process.arch) {
    case 'ia32':
      return 'x86'
    case 'x64':
      return 'x86_64'
    case 'arm64':
      return 'arm64'
    default:
      return process.arch
  }
}

function ruleMatches(rule: Rule, features: LaunchFeatures): boolean {
  if (rule.os) {
    if (rule.os.name && rule.os.name !== currentOsName()) return false
    if (rule.os.arch && rule.os.arch !== currentOsArch()) return false
    if (rule.os.version && !new RegExp(rule.os.version).test(process.getSystemVersion?.() ?? '')) {
      return false
    }
  }

  if (rule.features) {
    for (const [key, expected] of Object.entries(rule.features)) {
      const actual = features[key as keyof LaunchFeatures] ?? false
      if (actual !== expected) return false
    }
  }

  return true
}

/**
 * Gilt ein Regelsatz?
 *
 * Ohne Regeln: ja. Sonst entscheidet die **letzte zutreffende** Regel — so ist das
 * Format gemeint (`allow` mit Ausnahmen per nachfolgendem `disallow`).
 */
export function rulesAllow(rules: Rule[] | undefined, features: LaunchFeatures = {}): boolean {
  if (!rules || rules.length === 0) return true

  let allowed = false
  for (const rule of rules) {
    if (ruleMatches(rule, features)) allowed = rule.action === 'allow'
  }
  return allowed
}

/** Argumentliste im modernen Format zu einer flachen Liste auflösen. */
export function resolveArguments(
  entries: ArgumentEntry[] | undefined,
  features: LaunchFeatures = {}
): string[] {
  if (!entries) return []

  const out: string[] = []
  for (const entry of entries) {
    if (typeof entry === 'string') {
      out.push(entry)
      continue
    }
    // Bedingte Argumente werden ausgewertet, nicht übersprungen.
    if (!rulesAllow(entry.rules, features)) continue
    out.push(...(Array.isArray(entry.value) ? entry.value : [entry.value]))
  }
  return out
}

/** `${platzhalter}` durch echte Werte ersetzen. Unbekannte bleiben unverändert stehen. */
export function substitute(args: string[], values: Record<string, string>): string[] {
  return args.map((arg) =>
    arg.replace(/\$\{([^}]+)\}/g, (whole, key: string) => values[key] ?? whole)
  )
}
