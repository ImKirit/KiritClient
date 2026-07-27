import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Boxes, Search, LayoutGrid, List, SlidersHorizontal } from 'lucide-react'

import type { InstanceSort, LoaderType } from '../../../shared/types'
import { useApp } from '../stores/appStore'
import PageHeader from '../components/PageHeader'
import Button from '../components/ui/Button'
import InstanceCard from '../components/instances/InstanceCard'
import InstanceRow from '../components/instances/InstanceRow'
import CreateInstanceWizard from '../components/instances/CreateInstanceWizard'

const SORTS: InstanceSort[] = ['lastPlayed', 'name', 'version', 'playtime']

export default function InstancesPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { instances, settings, setView, setSort } = useApp()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loaderFilter, setLoaderFilter] = useState<LoaderType | 'all'>('all')
  const [kcOnly, setKcOnly] = useState(false)

  const view = settings?.instanceView ?? 'grid'
  const sort = settings?.instanceSort ?? 'lastPlayed'

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = instances.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !i.mcVersion.includes(q)) return false
      if (loaderFilter !== 'all' && i.loader !== loaderFilter) return false
      if (kcOnly && !i.kiritClient) return false
      return true
    })

    return list.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'version':
          return b.mcVersion.localeCompare(a.mcVersion, undefined, { numeric: true })
        case 'playtime':
          return b.playtimeSeconds - a.playtimeSeconds
        case 'lastPlayed':
        default:
          // Nie gespielte Instanzen ans Ende, sonst neueste zuerst.
          return (b.lastPlayed ?? '').localeCompare(a.lastPlayed ?? '')
      }
    })
  }, [instances, search, sort, loaderFilter, kcOnly])

  const hasFilter = loaderFilter !== 'all' || kcOnly

  return (
    <>
      <PageHeader
        title={t('instances.title')}
        subtitle={t('instances.subtitle')}
        actions={
          <Button variant="primary" onClick={() => setWizardOpen(true)}>
            <Plus size={14} strokeWidth={2.5} />
            {t('instances.create')}
          </Button>
        }
      />

      {/* Werkzeugleiste: Suche, Sortierung, Filter, Ansicht */}
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

        <Button
          small
          onClick={() => setFilterOpen((v) => !v)}
          className={hasFilter ? 'border-blue text-text' : ''}
        >
          <SlidersHorizontal size={13} />
          {t('instances.filter')}
        </Button>

        <div className="flex border border-edge">
          <button
            type="button"
            onClick={() => void setView('grid')}
            aria-label={t('instances.viewGrid')}
            className={`p-1.5 transition-colors ${view === 'grid' ? 'bg-blued text-text' : 'text-muted hover:text-text'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => void setView('list')}
            aria-label={t('instances.viewList')}
            className={`p-1.5 transition-colors ${view === 'list' ? 'bg-blued text-text' : 'text-muted hover:text-text'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="flex shrink-0 items-center gap-4 border-b border-edge bg-panel2 px-6 py-2.5">
          <label className="flex items-center gap-2 text-[11px] font-bold">
            {t('instances.loaderFilter')}
            <select
              value={loaderFilter}
              onChange={(e) => setLoaderFilter(e.target.value as LoaderType | 'all')}
              className="border border-edge bg-panel px-2 py-1 outline-none"
            >
              <option value="all">{t('common.all')}</option>
              <option value="vanilla">{t('loader.vanilla')}</option>
              <option value="fabric">{t('loader.fabric')}</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-[11px] font-bold">
            <input
              type="checkbox"
              checked={kcOnly}
              onChange={(e) => setKcOnly(e.target.checked)}
            />
            {t('instances.kcOnly')}
          </label>

          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setLoaderFilter('all')
                setKcOnly(false)
              }}
              className="text-[11px] font-bold text-bluel hover:underline"
            >
              {t('common.reset')}
            </button>
          )}
        </div>
      )}

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
        ) : view === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
            {visible.map((i) => (
              <InstanceCard key={i.id} instance={i} />
            ))}
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
