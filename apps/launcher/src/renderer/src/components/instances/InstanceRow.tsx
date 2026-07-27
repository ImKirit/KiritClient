import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import type { Instance } from '../../../../shared/types'
import Tag, { GoldTag } from '../Tag'
import InstanceAvatar from './InstanceAvatar'
import { formatLastPlayed, formatPlaytime } from '../../lib/format'

/** Kompakte Listen-Darstellung — für viele Instanzen und zum Sortieren. */
export default function InstanceRow({ instance }: { instance: Instance }): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/instances/${instance.id}`)}
      className={[
        'flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors',
        instance.kiritClient
          ? 'kc-gold-edge bg-panel2'
          : 'border-edge bg-panel2 hover:border-border'
      ].join(' ')}
    >
      <InstanceAvatar instance={instance} size="sm" />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold">{instance.name}</span>
        <span className="mt-0.5 block text-[11px] text-muted">
          {formatLastPlayed(instance.lastPlayed, t('instances.neverPlayed'))}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {instance.kiritClient && <GoldTag>{t('common.kiritclient')}</GoldTag>}
        <Tag variant="mc">{instance.mcVersion}</Tag>
        <Tag variant={instance.loader === 'fabric' ? 'info' : 'legacy'}>
          {t(`loader.${instance.loader}`)}
        </Tag>
      </span>

      <span className="w-16 shrink-0 text-right text-[11px] font-bold text-muted">
        {formatPlaytime(instance.playtimeSeconds)}
      </span>

      <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-muted" />
    </button>
  )
}
