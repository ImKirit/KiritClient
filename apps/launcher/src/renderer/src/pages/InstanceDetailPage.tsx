import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  FolderOpen,
  ImagePlus,
  FolderInput,
  Trash2
} from 'lucide-react'

import type { Instance } from '../../../shared/types'
import { useApp } from '../stores/appStore'
import Button from '../components/ui/Button'
import Toggle from '../components/ui/Toggle'
import Modal from '../components/ui/Modal'
import Tag, { GoldTag } from '../components/Tag'
import Placeholder from '../components/Placeholder'
import InstanceAvatar from '../components/instances/InstanceAvatar'
import { formatBytes, formatLastPlayed, formatPlaytime } from '../lib/format'
import { useDebouncedField } from '../lib/useDebouncedValue'

type Tab = 'overview' | 'mods' | 'resourcepacks' | 'shaders' | 'settings'
const TABS: Tab[] = ['overview', 'mods', 'resourcepacks', 'shaders', 'settings']

export default function InstanceDetailPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { instances, settings, updateInstance, removeInstance, pickIcon, moveInstance } = useApp()

  const [tab, setTab] = useState<Tab>('overview')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteFiles, setDeleteFiles] = useState(true)
  const [moving, setMoving] = useState<{ copied: number; total: number } | null>(null)

  const instance = instances.find((i) => i.id === id)

  // Name wird verzögert gespeichert, nicht bei jedem Tastendruck.
  const [nameDraft, setNameDraft] = useDebouncedField(instance?.name ?? '', (next) => {
    if (instance && next.trim()) void updateInstance(instance.id, { name: next.trim() })
  })

  useEffect(() => {
    return window.kirit.instances.onMoveProgress((p) => {
      if (p.id === id) setMoving({ copied: p.copied, total: p.total })
    })
  }, [id])

  if (!instance) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[13px] text-muted">{t('instances.notFound')}</p>
      </div>
    )
  }

  const patchSettings = (patch: Partial<Instance['settings']>): void => {
    void updateInstance(instance.id, { settings: { ...instance.settings, ...patch } })
  }

  return (
    <>
      {/* Kopf */}
      <header className="shrink-0 border-b border-edge px-6 pt-4 pb-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={13} />
          {t('nav.instances')}
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`h-16 w-16 shrink-0 ${instance.kiritClient ? 'kc-gold-edge' : 'border border-edge'}`}
          >
            <InstanceAvatar instance={instance} size="lg" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] leading-tight font-black">{instance.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Tag variant="mc">{instance.mcVersion}</Tag>
              <Tag variant={instance.loader === 'fabric' ? 'info' : 'legacy'}>
                {t(`loader.${instance.loader}`)}
              </Tag>
              {instance.kiritClient && <GoldTag>{t('common.kiritclient')}</GoldTag>}
            </div>
          </div>

          {/* Starten ist noch nicht gebaut — der Knopf sagt das, statt es vorzutäuschen. */}
          <div className="flex flex-col items-end gap-1">
            <Button variant="primary" disabled>
              <Play size={14} strokeWidth={2.5} />
              {t('instances.play')}
            </Button>
            <span className="text-[10px] font-bold tracking-[0.4px] text-muted uppercase">
              {t('common.notBuiltYet')}
            </span>
          </div>
        </div>

        <nav className="mt-4 flex gap-0.5">
          {TABS.map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={`border-b-2 px-3 py-2 text-[12px] font-bold transition-colors ${
                tab === tb
                  ? 'border-blue text-text'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t(`tabs.${tb}`)}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && (
          <dl className="grid max-w-2xl grid-cols-2 gap-px border border-edge bg-edge">
            {[
              ['instances.version', instance.mcVersion],
              ['instances.loaderLabel', t(`loader.${instance.loader}`)],
              ['instances.playtime', formatPlaytime(instance.playtimeSeconds)],
              [
                'instances.lastPlayedLabel',
                formatLastPlayed(instance.lastPlayed, t('instances.neverPlayed'))
              ],
              ['instances.created', new Date(instance.createdAt).toLocaleDateString()],
              ['instances.folder', instance.dir]
            ].map(([k, v]) => (
              <div key={k} className="bg-panel2 p-3">
                <dt className="text-[10px] font-black tracking-[0.5px] text-muted uppercase">
                  {t(k)}
                </dt>
                <dd data-selectable className="mt-1 truncate text-[12px]" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {tab === 'mods' && <Placeholder area="Modrinth · CurseForge" />}
        {tab === 'resourcepacks' && <Placeholder area="Resource packs" />}
        {tab === 'shaders' && <Placeholder area="Shaders" />}

        {tab === 'settings' && (
          <div className="flex max-w-2xl flex-col gap-4">
            <section className="border border-edge bg-panel2 p-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold">{t('instances.name')}</span>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full border border-edge bg-bg0 px-3 py-2 text-[13px] outline-none focus:border-blue"
                />
              </label>

              <div className="mt-3 flex gap-2">
                <Button small onClick={() => void pickIcon(instance.id)}>
                  <ImagePlus size={13} />
                  {t('instances.chooseImage')}
                </Button>
                <Button small onClick={() => void window.kirit.instances.openFolder(instance.id)}>
                  <FolderOpen size={13} />
                  {t('instances.openFolder')}
                </Button>
              </div>
            </section>

            <section className="border border-edge bg-panel2 p-4">
              <Toggle
                checked={instance.kiritClient}
                onChange={(next) => void updateInstance(instance.id, { kiritClient: next })}
                gold
                label={t('common.kiritclient')}
                hint={t('instances.kiritClientHint')}
              />
            </section>

            {/* Pro Instanz, weil es am Spiel hängt — Client-weite Dinge stehen in den Einstellungen. */}
            <section className="border border-edge bg-panel2 p-4">
              <h2 className="text-[12px] font-black tracking-[0.5px] uppercase">
                {t('instances.gameSettings')}
              </h2>
              <p className="mt-1 text-[11px] text-muted">{t('instances.gameSettingsHint')}</p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold">{t('instances.ram')}</span>
                  <input
                    type="number"
                    step={512}
                    min={1024}
                    value={instance.settings.ramMb ?? settings?.defaultRamMb ?? 4096}
                    onChange={(e) => patchSettings({ ramMb: Number(e.target.value) })}
                    className="w-full border border-edge bg-bg0 px-2 py-1.5 text-[12px] outline-none focus:border-blue"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold">
                    {t('instances.resolution')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="854"
                      value={instance.settings.width ?? ''}
                      onChange={(e) =>
                        patchSettings({ width: Number(e.target.value) || undefined })
                      }
                      className="w-full border border-edge bg-bg0 px-2 py-1.5 text-[12px] outline-none focus:border-blue"
                    />
                    <span className="text-muted">×</span>
                    <input
                      type="number"
                      placeholder="480"
                      value={instance.settings.height ?? ''}
                      onChange={(e) =>
                        patchSettings({ height: Number(e.target.value) || undefined })
                      }
                      className="w-full border border-edge bg-bg0 px-2 py-1.5 text-[12px] outline-none focus:border-blue"
                    />
                  </div>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-bold">{t('instances.javaArgs')}</span>
                <input
                  value={instance.settings.javaArgs ?? ''}
                  onChange={(e) => patchSettings({ javaArgs: e.target.value || undefined })}
                  placeholder="-XX:+UseG1GC"
                  className="w-full border border-edge bg-bg0 px-2 py-1.5 font-mono text-[12px] outline-none focus:border-blue"
                />
              </label>
            </section>

            <section className="border border-edge bg-panel2 p-4">
              <h2 className="text-[12px] font-black tracking-[0.5px] uppercase">
                {t('instances.location')}
              </h2>
              <p data-selectable className="mt-1 text-[11px] break-all text-muted">
                {instance.dir}
              </p>

              {moving && moving.copied < moving.total ? (
                <div className="mt-3">
                  <div className="kc-track">
                    <div style={{ width: `${(moving.copied / moving.total) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {formatBytes(moving.copied)} / {formatBytes(moving.total)}
                  </p>
                </div>
              ) : (
                <Button
                  small
                  className="mt-3"
                  onClick={() => {
                    setMoving(null)
                    void moveInstance(instance.id).finally(() => setMoving(null))
                  }}
                >
                  <FolderInput size={13} />
                  {t('instances.move')}
                </Button>
              )}
            </section>

            <section className="border border-bad/30 bg-bad/5 p-4">
              <h2 className="text-[12px] font-black tracking-[0.5px] text-bad uppercase">
                {t('instances.dangerZone')}
              </h2>
              <Button variant="danger" small className="mt-3" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} />
                {t('instances.delete')}
              </Button>
            </section>
          </div>
        )}
      </div>

      {confirmDelete && (
        <Modal
          title={t('instances.delete')}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await removeInstance(instance.id, deleteFiles)
                  navigate('/')
                }}
              >
                {t('instances.delete')}
              </Button>
            </>
          }
        >
          <p className="text-[13px]">
            {t('instances.deleteConfirm', { name: instance.name })}
          </p>
          <label className="mt-3 flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={deleteFiles}
              onChange={(e) => setDeleteFiles(e.target.checked)}
            />
            {t('instances.deleteFiles')}
          </label>
          <p className="mt-2 text-[11px] text-muted">{t('instances.deleteTrashHint')}</p>
        </Modal>
      )}
    </>
  )
}
