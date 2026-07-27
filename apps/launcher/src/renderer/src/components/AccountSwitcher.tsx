import { useTranslation } from 'react-i18next'
import { UserRound, ChevronsUpDown } from 'lucide-react'

/**
 * Account-Umschalter.
 *
 * Bewusst als eigenständige, in sich geschlossene Komponente gebaut: Sie hängt an
 * keiner Stelle vom Sidebar-Layout ab. Der Owner hatte ursprünglich ein Dropdown
 * oben rechts geplant — der Umzug dorthin ist damit ein Einhängen an anderer
 * Stelle, kein Umbau (Owner-Entscheidung 2026-07-27).
 *
 * Ohne Funktion, bis Microsoft-Login gebaut ist.
 */
export default function AccountSwitcher(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      disabled
      className="flex w-full items-center gap-2.5 border border-edge bg-panel2 p-2 text-left transition-colors hover:border-border disabled:cursor-default disabled:opacity-70"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-edge text-muted">
        <UserRound size={15} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-muted">
          {t('account.signedOut')}
        </span>
      </span>
      <ChevronsUpDown size={13} strokeWidth={2} className="shrink-0 text-muted" />
    </button>
  )
}
