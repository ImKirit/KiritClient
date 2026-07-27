import { Routes, Route, Navigate } from 'react-router-dom'

import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import InstancesPage from './pages/InstancesPage'
import CosmeticsPage from './pages/CosmeticsPage'
import SettingsPage from './pages/SettingsPage'

/**
 * Grundlayout: eigene Titelleiste oben, Navigation links, Inhalt rechts.
 *
 * Über der Titelleiste wird später das "laufende Band" für Updates sitzen
 * (Owner-Entscheidung 2026-07-27, nach Vorbild von Krate 1.2.0) — es greift
 * erst nach dem ersten echten Release.
 */
export default function App(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col bg-bg0">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Routes>
            <Route path="/" element={<InstancesPage />} />
            <Route path="/cosmetics" element={<CosmeticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
