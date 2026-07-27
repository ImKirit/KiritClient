import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Boxes, Shirt, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import AccountSwitcher from './AccountSwitcher'

interface NavEntry {
  to: string
  icon: LucideIcon
  labelKey: string
}

/**
 * Instanz-zentrierte Navigation (Owner-Entscheidung 2026-07-27): Der Client
 * startet in der Instanz-Übersicht, weil das der Normalfall ist. Accounts liegen
 * bewusst als Widget unten statt als eigener Menüpunkt.
 */
const ENTRIES: NavEntry[] = [
  { to: '/', icon: Boxes, labelKey: 'nav.instances' },
  { to: '/cosmetics', icon: Shirt, labelKey: 'nav.cosmetics' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' }
]

export default function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <nav className="flex w-52 shrink-0 flex-col border-r border-edge bg-bg1">
      <ul className="flex-1 p-2">
        {ENTRIES.map(({ to, icon: Icon, labelKey }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-[13px] font-bold transition-colors',
                  isActive
                    ? 'border-blue bg-panel text-text'
                    : 'border-transparent text-muted hover:bg-panel2 hover:text-text'
                ].join(' ')
              }
            >
              <Icon size={16} strokeWidth={2} />
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="border-t border-edge p-2">
        <AccountSwitcher />
      </div>
    </nav>
  )
}
