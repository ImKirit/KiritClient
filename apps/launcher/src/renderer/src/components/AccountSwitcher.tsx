import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound, ChevronsUpDown, Plus, LogOut, Check, Loader2 } from 'lucide-react'

import type { Account } from '../../../shared/types'
import { useApp } from '../stores/appStore'
import SkinHead from './accounts/SkinHead'
import SignInResultModal from './accounts/SignInResultModal'

/**
 * Account-Umschalter.
 *
 * Eigenständig und ohne Bindung ans Sidebar-Layout: Der Owner hatte ursprünglich ein
 * Dropdown oben rechts geplant — der Umzug dorthin ist ein Einhängen an anderer
 * Stelle, kein Umbau (Owner-Entscheidung 2026-07-27).
 */
export default function AccountSwitcher(): React.JSX.Element {
  const { t } = useTranslation()
  const { accounts, signIn, setActiveAccount, removeAccount } = useApp()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<Account | null>(null)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const active = accounts.accounts.find((a) => a.id === accounts.activeId) ?? null

  // Klick daneben schließt das Menü.
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
      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-1 w-full border border-border bg-bg1">
          <ul className="max-h-64 overflow-y-auto">
            {accounts.accounts.map((a) => (
              <li key={a.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    void setActiveAccount(a.id)
                    setOpen(false)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-panel"
                >
                  <SkinHead account={a} size={22} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                    {a.username}
                  </span>
                  {a.id === accounts.activeId && (
                    <Check size={13} strokeWidth={3} className="shrink-0 text-good" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void removeAccount(a.id)}
                  aria-label={t('account.remove')}
                  title={t('account.remove')}
                  className="px-2 py-1.5 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-bad"
                >
                  <LogOut size={13} />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void add()}
            className="flex w-full items-center gap-2 border-t border-edge px-2 py-2 text-[12px] font-bold text-bluel transition-colors hover:bg-panel"
          >
            <Plus size={13} strokeWidth={2.5} />
            {t('account.add')}
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => (accounts.accounts.length === 0 ? void add() : setOpen((v) => !v))}
        className="flex w-full items-center gap-2.5 border border-edge bg-panel2 p-2 text-left transition-colors hover:border-border disabled:cursor-default"
      >
        {busy ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-edge text-muted">
            <Loader2 size={14} className="animate-spin" data-round />
          </span>
        ) : active ? (
          <SkinHead account={active} size={28} />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-edge text-muted">
            <UserRound size={15} strokeWidth={2} />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold">
            {busy
              ? t(`account.step.${step ?? 'opening'}`, t('account.signingIn'))
              : (active?.username ?? t('account.signedOut'))}
          </span>
          {!busy && !active && (
            <span className="block truncate text-[10px] font-bold tracking-[0.4px] text-bluel uppercase">
              {t('account.signInShort')}
            </span>
          )}
        </span>

        {!busy && accounts.accounts.length > 0 && (
          <ChevronsUpDown size={13} strokeWidth={2} className="shrink-0 text-muted" />
        )}
      </button>

      {error && <p className="mt-1 text-[11px] text-bad">{error}</p>}

      {justAdded && (
        <SignInResultModal account={justAdded} onClose={() => setJustAdded(null)} />
      )}
    </div>
  )
}
