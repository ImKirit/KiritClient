/**
 * Platzhalter-Logo: die Stern-/Shuriken-Idee des alten Logos, aber als gefüllte
 * Form statt als dünne Kontur — die alte SVG verschwand bei 16px praktisch.
 *
 * Das endgültige Icon wird noch gestaltet (Owner-Entscheidung 2026-07-27:
 * "neu gestalten, Stern-Idee behalten"). → Vault: "Branding & Icon"
 */
export default function Logo({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0 L14.4 8.2 L24 12 L14.4 15.8 L12 24 L9.6 15.8 L0 12 L9.6 8.2 Z" />
    </svg>
  )
}
