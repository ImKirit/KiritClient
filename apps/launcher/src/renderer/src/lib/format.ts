/** Spielzeit kurz und lesbar: "—", "42m", "3h 12m", "128h". */
export function formatPlaytime(seconds: number): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (h >= 100) return `${h}h`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * "Zuletzt gespielt" als grobe Angabe. Bewusst ohne Bibliothek — für vier Stufen
 * lohnt kein zusätzliches Paket im Bundle.
 */
export function formatLastPlayed(iso: string | undefined, neverLabel: string): string {
  if (!iso) return neverLabel
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return neverLabel

  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}
