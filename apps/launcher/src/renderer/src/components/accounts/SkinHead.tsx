import type { Account } from '../../../../shared/types'

/**
 * Kopf aus der Skin-Textur.
 *
 * Der Kopf liegt in jeder Minecraft-Skin-Datei an derselben Stelle: 8×8 Pixel bei
 * (8,8). Statt das Bild zu beschneiden, wird es per CSS um Faktor 8 vergrößert und
 * so verschoben, dass genau dieser Ausschnitt im Rahmen steht — kein Canvas, kein
 * Zuschneiden, keine fremde Avatar-API, an die eine Spieler-UUID geschickt würde.
 *
 * `image-rendering: pixelated` verhindert, dass die 8 Pixel weichgezeichnet werden.
 */
export default function SkinHead({
  account,
  size = 28,
  className = ''
}: {
  account: Account
  size?: number
  className?: string
}): React.JSX.Element {
  if (!account.skinUrl) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center bg-edge font-black text-muted ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden="true"
      >
        {account.username.slice(0, 1).toUpperCase()}
      </span>
    )
  }

  return (
    <span
      className={`shrink-0 bg-edge ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${account.skinUrl})`,
        backgroundSize: `${size * 8}px ${size * 8}px`,
        backgroundPosition: `-${size}px -${size}px`,
        imageRendering: 'pixelated'
      }}
      aria-hidden="true"
    />
  )
}
