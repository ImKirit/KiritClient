import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Boxes, Search, Download } from 'lucide-react'

import type { InstanceSort, LoaderType } from '../../../shared/types'
import { useApp } from '../stores/appStore'
import Button from '../components/ui/Button'
import InstanceRow from '../components/instances/InstanceRow'
import CreateInstanceWizard from '../components/instances/CreateInstanceWizard'

const SORTS: InstanceSort[] = ['lastPlayed', 'name', 'version', 'playtime']
type Filter = 'all' | 'kiritclient' | 'vanilla' | 'fabric'
const FILTERS: Filter[] = ['all', 'kiritclient', 'vanilla', 'fabric']

/**
 * Instanzliste nach der Referenz (Owner 2026-07-27): Filterreiter oben, Suche,
 * IMPORT und CREATE rechts, darunter **Zeilen** mit PLAY/MODS/⚙.
 *
 * Angeheftete Instanzen stehen immer oben, unabhängig von der Sortierung.
 */
export default function InstancesPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { instances, settings, setSort } = useApp()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const sort = settings?.instanceSort ?? 'lastPlayed'

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = instances.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !i.mcVersion.includes(q)) return false
      if (filter === 'kiritclient') return i.kiritClient
      if (filter !== 'all') return i.loader === (filter as LoaderType)
      return true
    })

    return list.sort((a, b) => {
      // Angeheftetes zuerst — das schlägt jede Sortierung.
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'version':
          return b.mcVersion.localeCompare(a.mcVersion, undefined, { numeric: true })
        case 'playtime':
          return b.playtimeSeconds - a.playtimeSeconds
        default:
          return (b.lastPlayed ?? '').localeCompare(a.lastPlayed ?? '')
      }
    })
  }, [instances, search, sort, filter])

  return (
    <>
      {/* Filterreiter + Aktionen */}
      <div className="flex shrink-0 items-center gap-2 border-b border-edge px-6 py-3">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={[
                'border px-3 py-1.5 text-[11px] font-black tracking-[0.5px] uppercase transition-colors',
                filter === f
                  ? 'border-accent bg-accent/20 text-text'
                  : 'border-edge bg-panel text-muted hover:border-border hover:text-text'
              ].join(' ')}
            >
              {t(`instances.filter_${f}`)}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button disabled title={t('common.notBuiltYet')}>
          <Download size={13} />
          {t('instances.import')}
        </Button>
        <Button variant="primary" onClick={() => setWizardOpen(true)}>
          <Plus size={14} strokeWidth={2.5} />
          {t('instances.create')}
        </Button>
      </div>

      {/* Suche + Sortierung */}
      <div className="flex shrink-0 items-center gap-2 border-b border-edge px-6 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 border border-edge bg-bg0 px-2 py-1.5">
          <Search size={13} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('instances.search')}
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => void setSort(e.target.value as InstanceSort)}
          className="border border-edge bg-panel px-2 py-1.5 text-[11px] font-bold outline-none"
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`sort.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Boxes size={26} strokeWidth={1.75} className="mx-auto mb-3 text-muted/50" />
              <p className="text-[13px] font-bold text-muted">
                {instances.length === 0 ? t('instances.empty') : t('instances.noMatch')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visible.map((i) => (
              <InstanceRow key={i.id} instance={i} />
            ))}
          </div>
        )}
      </div>

      {wizardOpen && <CreateInstanceWizard onClose={() => setWizardOpen(false)} />}
    </>
  )
}
