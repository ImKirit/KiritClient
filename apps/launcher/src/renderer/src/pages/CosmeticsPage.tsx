import { useTranslation } from 'react-i18next'

import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

export default function CosmeticsPage(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('cosmetics.title')} subtitle={t('cosmetics.subtitle')} />
      <Placeholder area="Capes · Skins" />
    </>
  )
}
