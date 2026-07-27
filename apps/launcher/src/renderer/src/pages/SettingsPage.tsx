import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'

import { useApp } from '../stores/appStore'
import PageHeader from '../components/PageHeader'
import Button from '../components/ui/Button'
import Toggle from '../components/ui/Toggle'
import { SUPPORTED_LANGUAGES } from '../i18n'

function Section({
  title,
  hint,
  children
}: {
  title: string
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="border border-edge bg-panel2 p-4">
      <h2 className="text-[12px] font-black tracking-[0.5px] uppercase">{title}</h2>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/**
 * Client-weite Einstellungen.
 *
 * Was am Spiel hängt (RAM, Auflösung, Java-Argumente), steht bewusst NICHT hier,
 * sondern an der einzelnen Instanz — Owner-Entscheidung 2026-07-27:
 * "Client global, Spiel pro Instanz". Der Wert unten ist nur die Vorgabe für
 * neue Instanzen.
 */
export default function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings, patchSettings } = useApp()

  if (!settings) return <div className="flex-1" />

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex max-w-2xl flex-col gap-4">
          <Section title={t('settings.language')} hint={t('settings.languageHint')}>
            <div className="flex gap-2">
              {SUPPORTED_LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => void patchSettings({ language: code })}
                  className={[
                    'border px-3 py-1.5 text-[12px] font-bold transition-colors',
                    settings.language === code
                      ? 'border-blue bg-blued text-text'
                      : 'border-edge bg-panel text-muted hover:border-border hover:text-text'
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>

          <Section
            title={t('settings.instanceLocation')}
            hint={t('settings.instanceLocationHint')}
          >
            <div className="flex items-center gap-2">
              <code
                data-selectable
                className="flex-1 truncate border border-edge bg-bg0 px-3 py-2 text-[12px] text-muted"
              >
                {settings.instancesDir}
              </code>
              <Button
                onClick={async () => {
                  const next = await window.kirit.settings.pickInstancesDir()
                  if (next) await patchSettings(next)
                }}
              >
                <FolderOpen size={13} />
                {t('common.change')}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted">{t('settings.instanceLocationNote')}</p>
          </Section>

          <Section title={t('settings.defaults')} hint={t('settings.defaultsHint')}>
            <label className="block max-w-48">
              <span className="mb-1 block text-[11px] font-bold">{t('instances.ram')}</span>
              <input
                type="number"
                step={512}
                min={1024}
                value={settings.defaultRamMb}
                onChange={(e) => void patchSettings({ defaultRamMb: Number(e.target.value) })}
                className="w-full border border-edge bg-bg0 px-2 py-1.5 text-[12px] outline-none focus:border-blue"
              />
            </label>
          </Section>

          <Section title={t('settings.versions')}>
            <Toggle
              checked={settings.showSnapshots}
              onChange={(next) => void patchSettings({ showSnapshots: next })}
              label={t('instances.showSnapshots')}
              hint={t('settings.snapshotsHint')}
            />
          </Section>
        </div>
      </div>
    </>
  )
}
