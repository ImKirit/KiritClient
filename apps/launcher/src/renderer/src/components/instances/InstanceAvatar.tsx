import type { Instance } from '../../../../shared/types'

/**
 * Profilbild einer Instanz.
 *
 * Owner-Entscheidung 2026-07-27: eigenes Bild, sonst eine automatische Vorgabe —
 * **nie ein leeres graues Feld**. Die Vorgabe wird aus dem Namen erzeugt und ist
 * damit stabil: dieselbe Instanz sieht immer gleich aus.
 */

/** Kleiner, stabiler Hash — gleicher Name ergibt immer dieselbe Farbe. */
function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Bis zu zwei Zeichen: "Sky Block" → "SB", "1.21" → "1." */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function InstanceAvatar({
  instance,
  size = 'md',
  className = ''
}: {
  instance: Instance
  size?: 'sm' | 'md' | 'lg'
  className?: string
}): React.JSX.Element {
  const box =
    size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-full w-full text-3xl' : 'h-12 w-12 text-base'

  if (instance.icon) {
    return (
      <img
        // Eigenes Protokoll statt file:// — liefert nur das Bild dieser Instanz.
        src={`kcicon://${instance.id}`}
        alt=""
        className={`${box} shrink-0 object-cover ${className}`}
      />
    )
  }

  const h = hash(instance.name)
  const hue = h % 360
  // Zwei nah beieinanderliegende Töne ergeben einen ruhigen Verlauf statt Buntheit.
  const bg = `linear-gradient(135deg, hsl(${hue} 42% 26%), hsl(${(hue + 28) % 360} 46% 16%))`

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center font-black tracking-[0.5px] text-white/80 ${className}`}
      style={{ background: bg }}
      aria-hidden="true"
    >
      {initials(instance.name)}
    </div>
  )
}
