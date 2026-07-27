import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Play, Boxes, Smile, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import Logo from '../Logo'

/**
 * Sidebar — **nur Icons, keine Beschriftung** (Referenz, Owner 2026-07-27).
 * Sie bleibt auf jedem Screen gleich; der Titel steht im Tooltip.
 *
 * Bewusst **nicht** enthalten: der Server-Browser und der zweite durchgestrichene
 * Eintrag aus der Referenz — beide hat der Owner ausdrücklich weggestrichen.
 */
const ENTRIES: { to: string; icon: LucideIcon; labelKey: string }[] = [
  { to: '/', icon: Play, labelKey: 'nav.home' },
  { to: '/instances', icon: Boxes, labelKey: 'nav.instances' },
  { to: '/skins', icon: Smile, labelKey: 'nav.skins' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' }
]

export default function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <nav className="flex w-14 shrink-0 flex-col items-center border-r border-edge bg-bg1 py-3">
      <Logo className="mb-4 h-5 w-5 text-accent" />

      <ul className="flex flex-col items-center gap-1">
        {ENTRIES.map(({ to, icon: Icon, labelKey }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              title={t(labelKey)}
              aria-label={t(labelKey)}
              className={({ isActive }) =>
                [
                  'flex h-10 w-10 items-center justify-center border transition-colors',
                  isActive
                    ? 'border-accent bg-panel text-text'
                    : 'border-transparent text-muted hover:bg-panel2 hover:text-text'
                ].join(' ')
              }
            >
              <Icon size={18} strokeWidth={2} />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
