import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

import type { Account } from '../../../../shared/types'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import SkinHead from './SkinHead'

/**
 * Kurze Bestätigung nach der Anmeldung (Owner-Entscheidung 2026-07-27):
 * man soll sehen, **welcher** Account es geworden ist, bevor er einfach da ist.
 */
export default function SignInResultModal({
  account,
  onClose
}: {
  account: Account
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Modal
      title={t('account.signedInTitle')}
      onClose={onClose}
      width="max-w-sm"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('common.ok')}
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <SkinHead account={account} size={56} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black">{account.username}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-good">
            <Check size={13} strokeWidth={3} />
            {t('account.nowActive')}
          </p>
        </div>
      </div>
    </Modal>
  )
}
