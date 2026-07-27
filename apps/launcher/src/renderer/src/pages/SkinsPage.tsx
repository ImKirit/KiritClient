import { useTranslation } from 'react-i18next'

import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

/**
 * Skins-Tab. Der Owner hat angemerkt, dass er bei uns **anders aussehen wird** als
 * in der Referenz — daher noch kein Aufbau, sondern ein ehrlicher Platzhalter.
 *
 * Fest steht aus der Referenz bereits: Kartenraster mit Vorschau, erste Karte
 * „Add New Skin", Hinzufügen per Name/UUID/URL oder Datei, danach eine sich langsam
 * drehende Vorschau mit Umschaltung Classic/Slim.
 */
export default function SkinsPage(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('nav.skins')} subtitle={t('skins.subtitle')} />
      <Placeholder area="Skins" />
    </>
  )
}
