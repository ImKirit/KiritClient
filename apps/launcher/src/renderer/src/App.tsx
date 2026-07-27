import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import InstancesPage from './pages/InstancesPage'
import InstanceDetailPage from './pages/InstanceDetailPage'
import CosmeticsPage from './pages/CosmeticsPage'
import SettingsPage from './pages/SettingsPage'
import { useApp } from './stores/appStore'
import { setLanguage } from './i18n'
import type { LanguageCode } from './i18n'

/**
 * Grundlayout: eigene Titelleiste oben, Navigation links, Inhalt rechts.
 *
 * Über der Titelleiste wird später das "laufende Band" für Updates sitzen
 * (Owner-Entscheidung 2026-07-27, nach Vorbild von Krate 1.2.0) — es greift
 * erst nach dem ersten echten Release.
 */
export default function App(): React.JSX.Element {
  const { load, loaded, settings, error } = useApp()

  useEffect(() => {
    void load()
  }, [load])

  // Die Sprache lebt in den gespeicherten Einstellungen, nicht nur im localStorage —
  // damit sie dieselbe Quelle hat wie alles andere.
  useEffect(() => {
    if (settings?.language) setLanguage(settings.language as LanguageCode)
  }, [settings?.language])

  return (
    <div className="flex h-full flex-col bg-bg0">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          {error && (
            <p className="shrink-0 border-b border-bad/40 bg-bad/10 px-6 py-2 text-[12px] text-bad">
              {error}
            </p>
          )}
          {!loaded ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[12px] text-muted">…</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<InstancesPage />} />
              <Route path="/instances/:id" element={<InstanceDetailPage />} />
              <Route path="/cosmetics" element={<CosmeticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  )
}
