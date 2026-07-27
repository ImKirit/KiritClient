import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Play, ChevronUp, Check, Square } from 'lucide-react'

import { useApp } from '../stores/appStore'
import Tag, { GoldTag } from '../components/Tag'

/**
 * Startseite nach der Referenz (Owner 2026-07-27): großer Skin des aktiven
 * Accounts, Name darüber, unten ein breiter LAUNCH-Knopf mit Instanz-Dropdown.
 *
 * Die Zeile „zuletzt besuchter Server" aus der Referenz fehlt noch — dafür bräuchte
 * es eine Server-Erkennung, die es nicht gibt. Wird nicht vorgetäuscht.
 */
export default function HomePage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { instances, accounts, running, launching, launch, stop, settings, patchSettings } =
    useApp()

  const [pickerOpen, setPickerOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const active = accounts.accounts.find((a) => a.id === accounts.activeId) ?? null

  // Zuletzt gewählte Instanz merken, sonst die zuletzt gespielte.
  const preferredId =
    settings?.lastLaunchedId ??
    [...instances].sort((a, b) => (b.lastPlayed ?? '').localeCompare(a.lastPlayed ?? ''))[0]?.id
  const selected = instances.find((i) => i.id === preferredId) ?? instances[0] ?? null

  useEffect(() => {
    if (!pickerOpen) return
    const onDown = (e: MouseEvent): void => {
      if (!boxRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pickerOpen])

  const progress = selected ? launching[selected.id] : undefined
  const isRunning = selected ? running.some((r) => r.instanceId === selected.id) : false
  const busy = Boolean(progress)

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      {/* Skin des aktiven Accounts */}
      <div className="flex flex-col items-center">
        {active ? (
          <>
            <p className="mb-4 text-[26px] leading-none font-black tracking-[1px] uppercase">
              {active.username}
            </p>
            {active.skinUrl ? (
              <div
                className="h-64 w-32 bg-edge"
                style={{
                  // Ganzkörper aus der Skin-Textur: vorderer Rumpf, Kopf, Beine.
                  backgroundImage: `url(${active.skinUrl})`,
                  backgroundSize: '512px 512px',
                  backgroundPosition: '-64px -64px',
                  imageRendering: 'pixelated'
                }}
                aria-hidden="true"
              />
            ) : (
              <div className="flex h-64 w-32 items-center justify-center border border-edge bg-panel2 text-[11px] text-muted">
                {t('home.noSkin')}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 w-64 flex-col items-center justify-center border border-edge bg-panel2 px-6 text-center">
            <p className="text-[13px] font-bold">{t('account.signedOut')}</p>
            <p className="mt-1.5 text-[11px] text-muted">{t('home.signInHint')}</p>
          </div>
        )}
      </div>

      {/* Launch-Knopf mit Instanz-Dropdown */}
      <div ref={boxRef} className="relative mt-10 w-full max-w-md">
        {pickerOpen && (
          <div className="absolute bottom-full left-0 z-40 mb-1 max-h-72 w-full overflow-y-auto border border-border bg-bg1">
            {instances.length === 0 ? (
              <p className="px-3 py-3 text-center text-[12px] text-muted">
                {t('instances.empty')}
              </p>
            ) : (
              instances.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => {
                    void patchSettings({ lastLaunchedId: i.id })
                    setPickerOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-panel"
                >
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{i.name}</span>
                  <Tag variant="mc">{i.mcVersion}</Tag>
                  {i.kiritClient && <GoldTag>KC</GoldTag>}
                  {i.id === selected?.id && (
                    <Check size={13} strokeWidth={3} className="shrink-0 text-good" />
                  )}
                </button>
              ))
            )}
          </div>
        )}

        <div className="flex">
          <button
            type="button"
            disabled={!selected || !active || busy}
            onClick={() => {
              if (!selected) return
              if (isRunning) void stop(selected.id)
              else void launch(selected.id)
            }}
            className={[
              'relative flex flex-1 flex-col items-center justify-center overflow-hidden border py-3 transition-colors',
              isRunning
                ? 'border-bad/50 bg-bad/15 text-bad hover:bg-bad hover:text-bg0'
                : 'border-accent bg-accent/20 hover:bg-accent/35',
              'disabled:cursor-default disabled:opacity-40'
            ].join(' ')}
          >
            {/* Fortschritt füllt den Knopf von links. */}
            {progress && (
              <span
                className="absolute inset-y-0 left-0 bg-accent/30"
                style={{ width: `${progress.progress * 100}%` }}
                aria-hidden="true"
              />
            )}
            <span className="relative flex items-center gap-2 text-[15px] font-black tracking-[1px] uppercase">
              {isRunning ? <Square size={15} strokeWidth={3} /> : <Play size={15} strokeWidth={3} />}
              {isRunning ? t('home.stop') : t('home.launch')}
            </span>
            <span className="relative mt-0.5 max-w-full truncate text-[11px] text-muted">
              {progress ? progress.detail : (selected?.name ?? t('instances.empty'))}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-label={t('home.chooseInstance')}
            className="flex w-12 items-center justify-center border border-l-0 border-accent bg-accent/20 transition-colors hover:bg-accent/35"
          >
            <ChevronUp size={16} strokeWidth={2.5} />
          </button>
        </div>

        {instances.length === 0 && (
          <button
            type="button"
            onClick={() => navigate('/instances')}
            className="mt-3 w-full text-center text-[11px] font-bold text-accent hover:underline"
          >
            {t('instances.create')}
          </button>
        )}
      </div>
    </div>
  )
}
