import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'

import type { CreateInstanceInput, GlobalSettings, Instance } from '../shared/types'
import {
  listInstances,
  createInstance,
  updateInstance,
  deleteInstance,
  setInstanceIcon,
  openInstanceFolder,
  moveInstance
} from './lib/instances'
import { getSettings, patchSettings } from './lib/settings'
import { fetchVersionManifest } from './lib/versions'

/**
 * Alle IPC-Handler an einer Stelle.
 *
 * Bewusst getrennt vom Fenster-Code: Der alte Client hatte alle 27 Commands in
 * einer 1.268-Zeilen-Datei zusammen mit Setup und Launch-Logik.
 */
export function registerIpc(): void {
  // ── Instanzen ──────────────────────────────────────────────────────────────
  ipcMain.handle('instances:list', () => listInstances())
  ipcMain.handle('instances:create', (_e, input: CreateInstanceInput) =>
    createInstance(input)
  )
  ipcMain.handle(
    'instances:update',
    (_e, id: string, patch: Partial<Omit<Instance, 'id' | 'dir'>>) =>
      updateInstance(id, patch)
  )
  ipcMain.handle('instances:delete', (_e, id: string, deleteFiles: boolean) =>
    deleteInstance(id, deleteFiles)
  )
  ipcMain.handle('instances:open-folder', (_e, id: string) => openInstanceFolder(id))

  ipcMain.handle('instances:pick-icon', async (e, id: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const res = await dialog.showOpenDialog(win!, {
      title: 'Choose an image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    })
    if (res.canceled || res.filePaths.length === 0) return null
    return setInstanceIcon(id, res.filePaths[0])
  })

  /**
   * Bild wählen, BEVOR eine Instanz existiert (Schritt "Name & Bild" im Assistenten).
   * Gibt Pfad plus eine Data-URL zurück — die Vorschau braucht sie, weil `file://`
   * von der Content-Security-Policy geblockt ist.
   */
  ipcMain.handle('dialog:pick-image', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const res = await dialog.showOpenDialog(win!, {
      title: 'Choose an image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    })
    if (res.canceled || res.filePaths.length === 0) return null

    const path = res.filePaths[0]
    const ext = (path.split('.').pop() ?? 'png').toLowerCase()
    const mime = ext === 'jpg' ? 'jpeg' : ext
    const data = await readFile(path)
    return { path, dataUrl: `data:image/${mime};base64,${data.toString('base64')}` }
  })

  ipcMain.handle('instances:set-icon-path', (_e, id: string, path: string) =>
    setInstanceIcon(id, path)
  )

  ipcMain.handle('instances:move', async (e, id: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const res = await dialog.showOpenDialog(win!, {
      title: 'Move instance to…',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null

    return moveInstance(id, res.filePaths[0], (copied, total) => {
      // Kopieren kann bei mehreren GB dauern — der Renderer zeigt einen Balken.
      e.sender.send('instances:move-progress', { id, copied, total })
    })
  })

  // ── Einstellungen ──────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:patch', (_e, patch: Partial<GlobalSettings>) =>
    patchSettings(patch)
  )

  ipcMain.handle('settings:pick-instances-dir', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const res = await dialog.showOpenDialog(win!, {
      title: 'Where should new instances be stored?',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    return patchSettings({ instancesDir: res.filePaths[0] })
  })

  // ── Minecraft-Versionen ────────────────────────────────────────────────────
  ipcMain.handle('versions:manifest', () => fetchVersionManifest())
}
