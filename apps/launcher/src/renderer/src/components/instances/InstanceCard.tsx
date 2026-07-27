import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import type { Instance } from '../../../../shared/types'
import Tag, { GoldTag } from '../Tag'
import InstanceAvatar from './InstanceAvatar'
import { formatLastPlayed } from '../../lib/format'

/**
 * Kachel-Darstellung einer Instanz.
 *
 * Ist KiritClient aktiv, bekommt die ganze Kachel den goldenen Rand — hier wirkt
 * er am stärksten, weil er eine Fläche umrahmt. Der Loader-Tag zeigt trotzdem
 * weiterhin den echten Loader (Owner-Entscheidung 2026-07-27: die Instanz zeigt
 * "Vanilla", der Schalter heißt nur "KiritClient").
 */
export default function InstanceCard({ instance }: { instance: Instance }): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/instances/${instance.id}`)}
      className={[
        'group flex flex-col overflow-hidden border text-left transition-colors',
        instance.kiritClient
          ? 'kc-gold-edge bg-panel2'
          : 'border-edge bg-panel2 hover:border-border'
      ].join(' ')}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg0">
        <InstanceAvatar instance={instance} size="lg" />
        {instance.kiritClient && (
          <span className="absolute top-2 left-2">
            <GoldTag>{t('common.kiritclient')}</GoldTag>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-[13px] leading-tight font-bold">{instance.name}</p>
        <div className="flex flex-wrap gap-1.5">
          <Tag variant="mc">{instance.mcVersion}</Tag>
          <Tag variant={instance.loader === 'fabric' ? 'info' : 'legacy'}>
            {t(`loader.${instance.loader}`)}
          </Tag>
        </div>
        <p className="mt-auto text-[11px] text-muted">
          {formatLastPlayed(instance.lastPlayed, t('instances.neverPlayed'))}
        </p>
      </div>
    </button>
  )
}
