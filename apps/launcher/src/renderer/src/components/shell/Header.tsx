import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bell, Monitor, Minus, Square, Copy, X } from 'lucide-react'

import { useApp } from '../../stores/appStore'
import AccountButton from '../accounts/AccountButton'

/**
 * Kopfzeile — bleibt auf jedem Screen gleich (Referenz, Owner 2026-07-27).
 *
 * Aufbau von links: Navigationspfeile · Produktname + Version · Glocke ·
 * **Anzeige laufender Instanzen** · Account-Knopf mit Dropdown · Fenstersteuerung.
 *
 * Die ganze Leiste ist ziehbar; jedes Bedienelement muss `kc-no-drag` setzen.
 */
export default function Header(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { running } = useApp()
  const [maximized, setMaximized] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.kirit.window.isMaximized().then(setMaximized)
    void window.kirit.app.version().then(setVersion)
    return window.kirit.window.onStateChange((s) => setMaximized(s.maximized))
  }, [])

  return (
    <header className="kc-drag flex h-11 shrink-0 items-center gap-2 border-b border-edge bg-bg1 pl-2 select-none">
      <div className="kc-no-drag flex">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          aria-label={t('common.forward')}
          className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-text"
        >
          <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="ml-1 leading-none">
        <span className="block text-[13px] font-black tracking-[0.5px] uppercase">
          {t('app.name')}
        </span>
        {version && <span className="block text-[9px] font-bold text-accent">v{version}</span>}
      </div>

      <div className="flex-1" />

      <div className="kc-no-drag flex items-center gap-1.5">
        <button
          type="button"
          disabled
          aria-label={t('header.notifications')}
          title={t('common.notBuiltYet')}
          className="flex h-8 w-8 items-center justify-center text-muted disabled:opacity-40"
        >
          <Bell size={15} strokeWidth={2} />
        </button>

        {/* Anzeige laufender Instanzen — in der Referenz "NO INSTANCES". */}
        <button
          type="button"
          onClick={() => navigate('/instances')}
          className={[
            'flex items-center gap-2 border px-3 py-1.5 text-[11px] font-black tracking-[0.5px] uppercase transition-colors',
            running.length > 0
              ? 'border-good/40 bg-good/10 text-good'
              : 'border-edge bg-panel2 text-muted hover:border-border'
          ].join(' ')}
        >
          <Monitor size={13} strokeWidth={2.5} />
          {running.length === 0
            ? t('header.noInstances')
            : t('header.runningInstances', { count: running.length })}
        </button>

        <AccountButton />
      </div>

      <div className="kc-no-drag flex h-full">
        <button
          type="button"
          onClick={() => window.kirit.window.minimize()}
          aria-label={t('titlebar.minimize')}
          className="flex h-full w-11 items-center justify-center text-muted transition-colors hover:bg-panel hover:text-text"
        >
          <Minus size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => window.kirit.window.toggleMaximize()}
          aria-label={maximized ? t('titlebar.restore') : t('titlebar.maximize')}
          className="flex h-full w-11 items-center justify-center text-muted transition-colors hover:bg-panel hover:text-text"
        >
          {maximized ? <Copy size={13} strokeWidth={2} /> : <Square size={12} strokeWidth={2} />}
        </button>
        <button
          type="button"
          onClick={() => window.kirit.window.close()}
          aria-label={t('titlebar.close')}
          className="flex h-full w-11 items-center justify-center text-muted transition-colors hover:bg-bad hover:text-bg0"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
