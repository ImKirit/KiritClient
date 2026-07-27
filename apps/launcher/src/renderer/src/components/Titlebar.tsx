import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Square, Copy, X } from 'lucide-react'

import Logo from './Logo'

/**
 * Eigene Titelleiste — das Fenster ist rahmenlos (`frame: false`).
 *
 * Die Fläche ist über `.kc-drag` ziehbar; jeder Button muss `.kc-no-drag` setzen,
 * sonst zieht er das Fenster statt zu klicken.
 */
export default function Titlebar(): React.JSX.Element {
  const { t } = useTranslation()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.kirit.window.isMaximized().then(setMaximized)
    return window.kirit.window.onStateChange((s) => setMaximized(s.maximized))
  }, [])

  return (
    <header className="kc-drag flex h-9 shrink-0 items-center justify-between border-b border-edge bg-bg1 pl-3 select-none">
      <div className="flex items-center gap-2">
        <Logo className="h-4 w-4 text-bluel" />
        <span className="text-[11px] font-black tracking-[0.6px] text-muted uppercase">
          {t('app.name')}
        </span>
      </div>

      <div className="kc-no-drag flex h-full">
        <button
          type="button"
          onClick={() => window.kirit.window.minimize()}
          aria-label={t('titlebar.minimize')}
          className="flex h-full w-12 items-center justify-center text-muted transition-colors hover:bg-panel hover:text-text"
        >
          <Minus size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => window.kirit.window.toggleMaximize()}
          aria-label={maximized ? t('titlebar.restore') : t('titlebar.maximize')}
          className="flex h-full w-12 items-center justify-center text-muted transition-colors hover:bg-panel hover:text-text"
        >
          {maximized ? <Copy size={13} strokeWidth={2} /> : <Square size={12} strokeWidth={2} />}
        </button>
        <button
          type="button"
          onClick={() => window.kirit.window.close()}
          aria-label={t('titlebar.close')}
          className="flex h-full w-12 items-center justify-center text-muted transition-colors hover:bg-bad hover:text-bg0"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
