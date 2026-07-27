import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Play, Square, Package, Settings, Pin } from 'lucide-react'

import type { Instance } from '../../../../shared/types'
import { useApp } from '../../stores/appStore'
import Tag, { GoldTag } from '../Tag'
import InstanceAvatar from './InstanceAvatar'
import { formatLastPlayed } from '../../lib/format'

/**
 * Instanz-Zeile nach der Referenz (Owner 2026-07-27): Icon, Name mit Anheften-Nadel,
 * Version und Loader, „zuletzt gespielt", und rechts **PLAY · MODS · ⚙** direkt in
 * der Zeile.
 *
 * Ist KiritClient aktiv, trägt die Zeile den goldenen Rand.
 */
export default function InstanceRow({ instance }: { instance: Instance }): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { running, launching, launch, stop, updateInstance } = useApp()

  const isRunning = running.some((r) => r.instanceId === instance.id)
  const progress = launching[instance.id]

  return (
    <div
      className={[
        'relative flex items-center gap-3 border px-3 py-2.5 transition-colors',
        instance.kiritClient ? 'kc-gold-edge bg-panel2' : 'border-edge bg-panel2 hover:border-border'
      ].join(' ')}
    >
      {progress && (
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 bg-accent transition-[width]"
          style={{ width: `${progress.progress * 100}%` }}
          aria-hidden="true"
        />
      )}

      <InstanceAvatar instance={instance} size="sm" />

      <button
        type="button"
        onClick={() => navigate(`/instances/${instance.id}`)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold">{instance.name}</span>
          {instance.pinned && <Pin size={11} className="shrink-0 text-accent" />}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <Tag variant="mc">{instance.mcVersion}</Tag>
          <Tag variant={instance.loader === 'fabric' ? 'info' : 'legacy'}>
            {t(`loader.${instance.loader}`)}
          </Tag>
          {instance.kiritClient && <GoldTag>{t('common.kiritclient')}</GoldTag>}
          <span className="text-[11px] text-muted">
            {progress
              ? progress.detail
              : formatLastPlayed(instance.lastPlayed, t('instances.neverPlayed'))}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => void updateInstance(instance.id, { pinned: !instance.pinned })}
        aria-label={t('instances.pin')}
        title={t('instances.pin')}
        className={`shrink-0 p-1.5 transition-colors ${instance.pinned ? 'text-accent' : 'text-muted hover:text-text'}`}
      >
        <Pin size={14} />
      </button>

      <button
        type="button"
        disabled={Boolean(progress)}
        onClick={() => (isRunning ? void stop(instance.id) : void launch(instance.id))}
        className={[
          'flex shrink-0 items-center gap-1.5 border px-3 py-1.5 text-[11px] font-black tracking-[0.4px] uppercase transition-colors',
          isRunning
            ? 'border-bad/50 bg-bad/15 text-bad hover:bg-bad hover:text-bg0'
            : 'border-accent bg-accent/20 hover:bg-accent/35',
          'disabled:cursor-default disabled:opacity-40'
        ].join(' ')}
      >
        {isRunning ? <Square size={12} strokeWidth={3} /> : <Play size={12} strokeWidth={3} />}
        {isRunning ? t('home.stop') : t('instances.play')}
      </button>

      <button
        type="button"
        onClick={() => navigate(`/instances/${instance.id}?tab=mods`)}
        className="flex shrink-0 items-center gap-1.5 border border-edge bg-panel px-3 py-1.5 text-[11px] font-black tracking-[0.4px] text-muted uppercase transition-colors hover:border-border hover:text-text"
      >
        <Package size={12} strokeWidth={2.5} />
        {t('tabs.mods')}
      </button>

      <button
        type="button"
        onClick={() => navigate(`/instances/${instance.id}?tab=settings`)}
        aria-label={t('nav.settings')}
        className="flex shrink-0 items-center justify-center border border-edge bg-panel p-1.5 text-muted transition-colors hover:border-border hover:text-text"
      >
        <Settings size={14} strokeWidth={2} />
      </button>
    </div>
  )
}
