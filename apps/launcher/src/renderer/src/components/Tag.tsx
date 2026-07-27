type TagVariant = 'neutral' | 'mc' | 'info' | 'warn' | 'legacy' | 'rank' | 'admin' | 'good' | 'bad'

const VARIANT_CLASS: Record<TagVariant, string> = {
  neutral: '',
  mc: 'kc-tag--mc',
  info: 'kc-tag--info',
  warn: 'kc-tag--warn',
  legacy: 'kc-tag--legacy',
  rank: 'kc-tag--rank',
  admin: 'kc-tag--admin',
  good: 'kc-tag--good',
  bad: 'kc-tag--bad'
}

interface TagProps {
  children: React.ReactNode
  variant?: TagVariant
  /** Kleiner gedrehter Quadrat-Marker vor dem Text (für Status-Tags). */
  dot?: boolean
  /** Puls-Animation für kritische Zustände. */
  pulse?: boolean
  className?: string
}

/**
 * Tag im KiritClient-Muster: 10px, font-weight 900, Großbuchstaben, kein Radius.
 * Varianten unterscheiden sich ausschließlich über Farbe — nie über Form oder Größe.
 *
 * Für den goldenen KiritClient-Zustand NICHT dieses Tag benutzen, sondern
 * <GoldTag>. Gold ist bewusst genau einem Zustand vorbehalten.
 */
export default function Tag({
  children,
  variant = 'neutral',
  dot = false,
  pulse = false,
  className = ''
}: TagProps): React.JSX.Element {
  return (
    <span
      className={[
        'kc-tag',
        VARIANT_CLASS[variant],
        dot ? 'kc-tag--dot' : '',
        pulse ? 'kc-pulse' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}

/**
 * Der eine goldene Zustand: KiritClient ist für diese Instanz aktiv.
 *
 * Bewusst eine eigene Komponente statt einer weiteren Variante von <Tag>, damit
 * Gold nicht versehentlich für irgendetwas anderes benutzt wird. Vorbild ist das
 * "Infinite"-Tag auf imkirit.dev/upload — dort steht im CSS ausdrücklich, dass es
 * das einzige mit Gold und Schimmer sein soll.
 */
export function GoldTag({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return <span className={`kc-tag kc-gold ${className}`}>{children}</span>
}
