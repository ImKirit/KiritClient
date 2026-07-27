import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Check, ImagePlus, Loader2 } from 'lucide-react'

import type { LoaderType, McVersion, VersionManifest } from '../../../../shared/types'
import { useApp } from '../../stores/appStore'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Toggle from '../ui/Toggle'
import Tag from '../Tag'

/**
 * Assistent in Schritten (Owner-Entscheidung 2026-07-27).
 *
 * Aktuell drei Schritte: Version → Loader → Name & Bild.
 * Der beschlossene **Preset-Schritt gehört zwischen Loader und Name** und wird dort
 * eingesetzt, sobald Presets gebaut sind. Er wird bewusst noch nicht als leerer
 * Schritt angelegt — ein Schritt ohne Funktion ist genau die Art Attrappe, die im
 * alten Client geärgert hat.
 */
type Step = 'version' | 'loader' | 'name'

const STEPS: Step[] = ['version', 'loader', 'name']

export default function CreateInstanceWizard({
  onClose
}: {
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const { settings, createInstance, patchSettings } = useApp()

  const [step, setStep] = useState<Step>('version')
  const [manifest, setManifest] = useState<VersionManifest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [mcVersion, setMcVersion] = useState('')
  const [loader, setLoader] = useState<LoaderType>('fabric')
  const [kiritClient, setKiritClient] = useState(true)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<{ path: string; dataUrl: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const showSnapshots = settings?.showSnapshots ?? false

  useEffect(() => {
    window.kirit.versions
      .manifest()
      .then((m) => {
        setManifest(m)
        setMcVersion((v) => v || m.latestRelease)
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  const versions = useMemo((): McVersion[] => {
    if (!manifest) return []
    const q = search.trim().toLowerCase()
    return manifest.versions
      .filter((v) => (showSnapshots ? true : v.type === 'release'))
      .filter((v) => (q ? v.id.toLowerCase().includes(q) : true))
      .slice(0, 300)
  }, [manifest, showSnapshots, search])

  // Name wird aus der Version vorbelegt, solange der Nutzer nichts eingetippt hat.
  const effectiveName = name.trim() || (mcVersion ? `Minecraft ${mcVersion}` : '')

  const create = async (): Promise<void> => {
    if (!effectiveName || !mcVersion) return
    setBusy(true)
    try {
      const instance = await createInstance({
        name: effectiveName,
        mcVersion,
        loader,
        kiritClient
      })
      if (icon) {
        await window.kirit.instances.setIconPath(instance.id, icon.path)
        // Der Store hat die Instanz ohne Icon; einmal nachladen statt raten.
        await useApp.getState().load()
      }
      onClose()
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)
  const canNext = step === 'version' ? Boolean(mcVersion) : true

  return (
    <Modal
      title={t('instances.create')}
      onClose={onClose}
      width="max-w-xl"
      footer={
        <>
          {stepIndex > 0 && (
            <Button onClick={() => setStep(STEPS[stepIndex - 1])} disabled={busy}>
              {t('common.back')}
            </Button>
          )}
          {step !== 'name' ? (
            <Button
              variant="primary"
              disabled={!canNext}
              onClick={() => setStep(STEPS[stepIndex + 1])}
            >
              {t('common.next')}
            </Button>
          ) : (
            <Button variant="primary" disabled={busy || !effectiveName} onClick={create}>
              {busy && <Loader2 size={13} className="animate-spin" data-round />}
              {t('common.create')}
            </Button>
          )}
        </>
      }
    >
      {/* Schrittanzeige */}
      <ol className="mb-4 flex gap-1">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`kc-track ${i <= stepIndex ? '' : 'opacity-40'}`}>
              <div style={{ width: i <= stepIndex ? '100%' : '0%' }} />
            </div>
            <p
              className={`mt-1.5 text-[10px] font-black tracking-[0.5px] uppercase ${
                i === stepIndex ? 'text-text' : 'text-muted'
              }`}
            >
              {t(`wizard.${s}`)}
            </p>
          </li>
        ))}
      </ol>

      {loadError && (
        <p className="mb-3 border border-bad/40 bg-bad/10 p-2 text-[12px] text-bad">
          {loadError}
        </p>
      )}

      {step === 'version' && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 border border-edge bg-bg0 px-2 py-1.5">
              <Search size={13} className="shrink-0 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('instances.searchVersion')}
                className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted"
              />
            </div>
          </div>

          <label className="mb-2 flex items-center gap-2 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={showSnapshots}
              onChange={(e) => void patchSettings({ showSnapshots: e.target.checked })}
            />
            {t('instances.showSnapshots')}
          </label>

          {!manifest && !loadError && (
            <p className="py-6 text-center text-[12px] text-muted">{t('common.loading')}</p>
          )}

          <ul className="max-h-64 overflow-y-auto border border-edge">
            {versions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setMcVersion(v.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition-colors ${
                    mcVersion === v.id ? 'bg-blued text-text' : 'hover:bg-panel'
                  }`}
                >
                  <span className="font-bold">{v.id}</span>
                  <span className="flex items-center gap-2">
                    {v.id === manifest?.latestRelease && (
                      <Tag variant="good">{t('instances.latest')}</Tag>
                    )}
                    {v.type !== 'release' && <Tag variant="legacy">{v.type}</Tag>}
                    {mcVersion === v.id && <Check size={14} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'loader' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(['vanilla', 'fabric'] as LoaderType[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLoader(l)}
                className={`border p-3 text-left transition-colors ${
                  loader === l ? 'border-blue bg-blued' : 'border-edge bg-panel hover:border-border'
                }`}
              >
                <span className="block text-[13px] font-bold">{t(`loader.${l}`)}</span>
                <span className="mt-1 block text-[11px] text-muted">
                  {t(`loader.${l}Hint`)}
                </span>
              </button>
            ))}
          </div>

          <div className="border border-edge bg-panel2 p-3">
            <Toggle
              checked={kiritClient}
              onChange={setKiritClient}
              gold
              label={t('common.kiritclient')}
              hint={t('instances.kiritClientHint')}
            />
          </div>
        </div>
      )}

      {step === 'name' && (
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold">{t('instances.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mcVersion ? `Minecraft ${mcVersion}` : ''}
              autoFocus
              className="w-full border border-edge bg-bg0 px-3 py-2 text-[13px] outline-none focus:border-blue"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[12px] font-bold">{t('instances.image')}</span>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 border border-edge bg-bg0">
                {icon && <img src={icon.dataUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <Button
                  small
                  onClick={async () => {
                    const picked = await window.kirit.dialog.pickImage()
                    if (picked) setIcon(picked)
                  }}
                >
                  <ImagePlus size={13} />
                  {t('instances.chooseImage')}
                </Button>
                <p className="text-[11px] text-muted">{t('instances.imageHint')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
