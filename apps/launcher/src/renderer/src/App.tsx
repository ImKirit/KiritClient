import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Header from './components/shell/Header'
import Sidebar from './components/shell/Sidebar'
import HomePage from './pages/HomePage'
import InstancesPage from './pages/InstancesPage'
import InstanceDetailPage from './pages/InstanceDetailPage'
import SkinsPage from './pages/SkinsPage'
import SettingsPage from './pages/SettingsPage'
import { useApp } from './stores/appStore'
import { setLanguage } from './i18n'
import type { LanguageCode } from './i18n'

/**
 * Grundlayout: **Sidebar und Kopfzeile bleiben auf jedem Screen gleich**
 * (Referenz, Owner 2026-07-27). Nur die Fläche rechts wechselt.
 */
export default function App(): React.JSX.Element {
  const { load, loaded, settings, error, applyProgress, setRunning, clearLaunch } = useApp()

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (settings?.language) setLanguage(settings.language as LanguageCode)
  }, [settings?.language])

  // Akzentfarbe als Laufzeit-Variable. Gold bleibt unberührt.
  useEffect(() => {
    if (settings?.accentColor) {
      document.documentElement.style.setProperty('--kc-accent', settings.accentColor)
    }
  }, [settings?.accentColor])

  // Start-Ereignisse: Fortschritt, Beenden.
  useEffect(() => {
    const offProgress = window.kirit.launch.onProgress(applyProgress)
    const offExit = window.kirit.launch.onExit(({ instanceId }) => {
      clearLaunch(instanceId)
      void window.kirit.launch.running().then(setRunning)
      void useApp.getState().load()
    })
    return () => {
      offProgress()
      offExit()
    }
  }, [applyProgress, setRunning, clearLaunch])

  return (
    <div className="flex h-full flex-col bg-bg0">
      <Header />
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
              <Route path="/" element={<HomePage />} />
              <Route path="/instances" element={<InstancesPage />} />
              <Route path="/instances/:id" element={<InstanceDetailPage />} />
              <Route path="/skins" element={<SkinsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  )
}
