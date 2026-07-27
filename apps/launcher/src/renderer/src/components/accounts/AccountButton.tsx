import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound, ChevronDown, Plus, Trash2, Check, Loader2, X } from 'lucide-react'

import type { Account } from '../../../../shared/types'
import { useApp } from '../../stores/appStore'
import SkinHead from './SkinHead'
import SignInResultModal from './SignInResultModal'

/**
 * Account-Knopf mit Dropdown — **oben rechts in der Kopfzeile** (Referenz,
 * Owner 2026-07-27). Zeigt Skin-Kopf und Name des aktiven Accounts.
 *
 * Das Dropdown listet alle Accounts mit Löschen-Knopf und bietet unten
 * „Account hinzufügen".
 */
export default function AccountButton(): React.JSX.Element {
  const { t } = useTranslation()
  const { accounts, signIn, setActiveAccount, removeAccount } = useApp()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<Account | null>(null)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const active = accounts.accounts.find((a) => a.id === accounts.activeId) ?? null

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => window.kirit.accounts.onSignInStep(setStep), [])

  const add = async (): Promise<void> => {
    setOpen(false)
    setBusy(true)
    setError(null)
    try {
      const account = await signIn()
      if (account) setJustAdded(account)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setStep(null)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => (accounts.accounts.length === 0 ? void add() : setOpen((v) => !v))}
        className="flex items-center gap-2 border border-edge bg-panel2 py-1.5 pr-2 pl-1.5 transition-colors hover:border-border"
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin text-muted" data-round />
        ) : active ? (
          <SkinHead account={active} size={20} />
        ) : (
          <UserRound size={16} strokeWidth={2} className="text-muted" />
        )}
        <span className="max-w-32 truncate text-[12px] font-black tracking-[0.4px] uppercase">
          {busy
            ? t(`account.step.${step ?? 'opening'}`, t('account.signingIn'))
            : (active?.username ?? t('account.signInShort'))}
        </span>
        {!busy && <ChevronDown size={13} strokeWidth={2.5} className="text-muted" />}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-64 border border-border bg-bg1 shadow-xl">
          <div className="flex items-center justify-between border-b border-edge px-3 py-2">
            <span className="text-[11px] font-black tracking-[0.5px] uppercase">
              {t('account.title')}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('common.close')}
              className="text-muted transition-colors hover:text-text"
            >
              <X size={14} />
            </button>
          </div>

          <ul className="max-h-72 overflow-y-auto">
            {accounts.accounts.map((a) => (
              <li key={a.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    void setActiveAccount(a.id)
                    setOpen(false)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-panel"
                >
                  <SkinHead account={a} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                    {a.username}
                  </span>
                  {a.id === accounts.activeId && (
                    <Check size={14} strokeWidth={3} className="shrink-0 text-good" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void removeAccount(a.id)}
                  aria-label={t('account.remove')}
                  title={t('account.remove')}
                  className="px-2.5 py-2 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-bad"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void add()}
            className="flex w-full items-center justify-center gap-2 border-t border-edge px-3 py-2.5 text-[11px] font-black tracking-[0.5px] text-accent uppercase transition-colors hover:bg-panel"
          >
            <Plus size={13} strokeWidth={3} />
            {t('account.add')}
          </button>
        </div>
      )}

      {error && (
        <p className="absolute top-full right-0 mt-1 w-64 border border-bad/40 bg-bad/10 p-2 text-[11px] text-bad">
          {error}
        </p>
      )}

      {justAdded && (
        <SignInResultModal account={justAdded} onClose={() => setJustAdded(null)} />
      )}
    </div>
  )
}
