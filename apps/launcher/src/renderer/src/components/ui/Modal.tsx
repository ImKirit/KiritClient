import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  title,
  onClose,
  children,
  footer,
  width = 'max-w-lg'
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
}): React.JSX.Element {
  // Escape schließt — erwartet man von jedem Dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg0/80 p-6"
      onMouseDown={onClose}
    >
      <div
        className={`flex max-h-full w-full ${width} flex-col border border-border bg-bg1`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-edge px-4 py-3">
          <h2 className="text-[13px] font-black tracking-[0.4px] uppercase">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-text"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-edge px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
