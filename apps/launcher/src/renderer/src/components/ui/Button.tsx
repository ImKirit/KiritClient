type Variant = 'primary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'border-border bg-accent/20 text-text hover:bg-accent/35',
  ghost: 'border-edge bg-panel text-muted hover:border-border hover:text-text',
  danger: 'border-bad/40 bg-bad/15 text-bad hover:bg-bad hover:text-bg0'
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Kompaktere Variante für Werkzeugleisten. */
  small?: boolean
}

export default function Button({
  variant = 'ghost',
  small = false,
  className = '',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      {...rest}
      className={[
        'flex items-center gap-1.5 border font-black tracking-[0.4px] uppercase transition-colors',
        small ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-[12px]',
        VARIANTS[variant],
        'disabled:cursor-default disabled:opacity-40 disabled:hover:bg-inherit',
        className
      ].join(' ')}
    >
      {children}
    </button>
  )
}
