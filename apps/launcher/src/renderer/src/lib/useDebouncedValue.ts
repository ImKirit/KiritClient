import { useEffect, useRef, useState } from 'react'

/**
 * Feld, das sofort reagiert, aber verzögert speichert.
 *
 * Ohne das schreibt jeder Tastendruck im Namensfeld eine Datei auf die Platte.
 * Der angezeigte Wert bleibt der getippte; `onCommit` läuft erst, wenn `delay`
 * lang nichts mehr passiert ist.
 */
export function useDebouncedField(
  value: string,
  onCommit: (next: string) => void,
  delay = 400
): [string, (next: string) => void] {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)

  // Änderungen von außen übernehmen — aber nicht, während getippt wird.
  useEffect(() => {
    if (!dirty.current) setLocal(value)
  }, [value])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const set = (next: string): void => {
    setLocal(next)
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      dirty.current = false
      onCommit(next)
    }, delay)
  }

  return [local, set]
}
