import { useTranslation } from 'react-i18next'
import { Construction } from 'lucide-react'

import Tag from './Tag'

/**
 * Ehrlicher Platzhalter für noch nicht gebaute Bereiche.
 *
 * Ausdrücklich KEIN Mockup: Der alte Client hatte Seiten, die fertig aussahen und
 * keine Funktion hatten (die Cosmetics-Seite nahm Dateien entgegen und verwarf
 * sie kommentarlos). Was hier steht, sagt klar, dass es noch nichts tut.
 */
export default function Placeholder({ area }: { area: string }): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md border border-edge bg-panel2 p-6 text-center">
        <Construction size={22} strokeWidth={2} className="mx-auto mb-3 text-muted" />
        <Tag variant="warn" dot>
          {t('common.notBuiltYet')}
        </Tag>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          {t('common.notBuiltYetHint')}
        </p>
        <p className="mt-2 text-[11px] font-bold tracking-[0.5px] text-muted/60 uppercase">
          {area}
        </p>
      </div>
    </div>
  )
}
