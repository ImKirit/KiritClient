import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'

import PageHeader from '../components/PageHeader'
import Tag, { GoldTag } from '../components/Tag'
import { SUPPORTED_LANGUAGES, setLanguage } from '../i18n'
import type { LanguageCode } from '../i18n'

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

export default function SettingsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const [instancesDir, setInstancesDir] = useState('')

  useEffect(() => {
    void window.kirit.app.defaultInstancesDir().then(setInstancesDir)
  }, [])

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex max-w-2xl flex-col gap-4">
          {/* Funktioniert bereits vollständig. */}
          <Section title={t('settings.language')} hint={t('settings.languageHint')}>
            <div className="flex gap-2">
              {SUPPORTED_LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code as LanguageCode)}
                  className={[
                    'border px-3 py-1.5 text-[12px] font-bold transition-colors',
                    i18n.resolvedLanguage === code
                      ? 'border-blue bg-blued text-text'
                      : 'border-edge bg-panel text-muted hover:border-border hover:text-text'
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Pfad ist echt, das Ändern ist noch nicht gebaut. */}
          <Section
            title={t('settings.instanceLocation')}
            hint={t('settings.instanceLocationHint')}
          >
            <div className="flex items-center gap-2 border border-edge bg-bg0 px-3 py-2">
              <FolderOpen size={14} strokeWidth={2} className="shrink-0 text-muted" />
              <code data-selectable className="flex-1 truncate text-[12px] text-muted">
                {instancesDir || '…'}
              </code>
              <Tag variant="warn">{t('common.notBuiltYet')}</Tag>
            </div>
          </Section>

          {/*
            TEMPORÄR — Vorschau des Designsystems, damit die Wirkung von Gold und
            Schimmer beurteilt werden kann, bevor es Instanzen gibt. Fliegt raus,
            sobald die Instanz-Kacheln stehen.
          */}
          <Section title="Design preview" hint="Temporary — removed once instances exist.">
            <div className="flex flex-wrap items-center gap-2">
              <Tag variant="mc">1.21.4</Tag>
              <Tag variant="info">Fabric</Tag>
              <Tag variant="rank">Modpack</Tag>
              <Tag variant="warn" dot>
                Update
              </Tag>
              <Tag variant="bad" dot pulse>
                Error
              </Tag>
              <Tag variant="legacy">Legacy</Tag>
              <GoldTag>{t('common.kiritclient')}</GoldTag>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border border-edge bg-panel p-3">
                <p className="text-[12px] font-bold">Standard instance</p>
                <p className="mt-1 text-[11px] text-muted">Plain border</p>
              </div>
              <div className="kc-gold-edge bg-panel p-3">
                <p className="text-[12px] font-bold">KiritClient enabled</p>
                <p className="mt-1 text-[11px] text-muted">Gold border + glow</p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}
