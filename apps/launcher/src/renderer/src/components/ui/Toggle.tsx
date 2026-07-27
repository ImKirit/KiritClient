/**
 * Schalter. Kantig wie alles andere — kein abgerundeter Pillen-Schalter.
 *
 * `gold` markiert den einen ausgezeichneten Zustand (KiritClient aktiv). Sonst
 * nirgends benutzen: Gold ist genau einem Zustand vorbehalten.
 */
export default function Toggle({
  checked,
  onChange,
  label,
  hint,
  gold = false,
  disabled = false
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
  gold?: boolean
  disabled?: boolean
}): React.JSX.Element {
  return (
    <label
      className={`flex items-start gap-3 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'mt-0.5 flex h-5 w-9 shrink-0 items-center border p-0.5 transition-colors',
          checked
            ? gold
              ? 'kc-gold justify-end border-goldedge'
              : 'justify-end border-accent bg-accent/20'
            : 'justify-start border-edge bg-bg0'
        ].join(' ')}
      >
        <span
          className={`h-3.5 w-3.5 ${checked ? (gold ? 'bg-goldtext' : 'bg-text') : 'bg-muted'}`}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-[12px] font-bold">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>}
      </span>
    </label>
  )
}
