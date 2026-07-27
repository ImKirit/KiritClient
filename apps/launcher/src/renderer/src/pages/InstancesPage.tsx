import { useTranslation } from 'react-i18next'
import { Plus, Boxes } from 'lucide-react'

import PageHeader from '../components/PageHeader'

export default function InstancesPage(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader
        title={t('instances.title')}
        subtitle={t('instances.subtitle')}
        actions={
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 border border-border bg-blued px-3 py-2 text-[12px] font-black tracking-[0.4px] uppercase transition-colors hover:bg-blue disabled:cursor-default disabled:opacity-40"
          >
            <Plus size={14} strokeWidth={2.5} />
            {t('instances.create')}
          </button>
        }
      />

      {/* Ehrlicher Leerzustand — es gibt noch keine Instanzverwaltung, also wird
          auch keine vorgetäuscht. */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <Boxes size={26} strokeWidth={1.75} className="mx-auto mb-3 text-muted/50" />
          <p className="text-[13px] font-bold text-muted">{t('instances.empty')}</p>
        </div>
      </div>
    </>
  )
}
