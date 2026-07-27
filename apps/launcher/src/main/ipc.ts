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
import {
  signIn,
  getState as getAccountsState,
  setActive as setActiveAccount,
  removeAccount,
  SignInCancelled
} from './lib/auth'
import { launchInstance, stopInstance, runningInstances } from './lib/minecraft/launch'

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

  // ── Accounts ───────────────────────────────────────────────────────────────
  ipcMain.handle('accounts:state', () => getAccountsState())

  ipcMain.handle('accounts:sign-in', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)!
    try {
      return await signIn(win, (step) => e.sender.send('accounts:sign-in-step', step))
    } catch (err) {
      // Abbruch ist kein Fehler — die Oberfläche soll dafür nichts Rotes zeigen.
      if (err instanceof SignInCancelled) return null
      throw err
    }
  })

  ipcMain.handle('accounts:set-active', (_e, id: string) => setActiveAccount(id))
  ipcMain.handle('accounts:remove', (_e, id: string) => removeAccount(id))

  // ── Spielstart ─────────────────────────────────────────────────────────────
  ipcMain.handle('launch:start', async (e, instanceId: string) => {
    const instances = await listInstances()
    const instance = instances.find((i) => i.id === instanceId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    const startedAt = Date.now()
    await updateInstance(instance.id, { lastPlayed: new Date().toISOString() })

    return launchInstance(instance, {
      onProgress: (p) => e.sender.send('launch:progress', p),
      onLog: (id, line) => e.sender.send('launch:log', { instanceId: id, line }),
      onExit: (id, code) => {
        // Spielzeit erst beim Beenden schreiben — vorher weiß niemand, wie lange.
        const seconds = Math.round((Date.now() - startedAt) / 1000)
        void listInstances().then((list) => {
          const current = list.find((i) => i.id === id)
          if (current) {
            void updateInstance(id, {
              playtimeSeconds: current.playtimeSeconds + seconds
            })
          }
        })
        e.sender.send('launch:exit', { instanceId: id, code })
      }
    })
  })

  ipcMain.handle('launch:stop', (_e, instanceId: string) => stopInstance(instanceId))
  ipcMain.handle('launch:running', () => runningInstances())
}
