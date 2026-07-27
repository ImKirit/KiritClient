import { contextBridge, ipcRenderer } from 'electron'

/**
 * Die einzige Brücke zwischen Renderer und Main-Prozess.
 *
 * Bewusst schmal gehalten: Es wird nie `ipcRenderer` selbst freigegeben, sondern
 * nur benannte Funktionen. Alles, was hier nicht steht, kann der Renderer nicht.
 */
const api = {
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    /** Meldet Maximieren/Wiederherstellen. Gibt eine Abmelde-Funktion zurück. */
    onStateChange: (cb: (state: { maximized: boolean }) => void): (() => void) => {
      const listener = (_e: unknown, state: { maximized: boolean }): void => cb(state)
      ipcRenderer.on('window:state', listener)
      return () => {
        ipcRenderer.off('window:state', listener)
      }
    }
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    defaultInstancesDir: (): Promise<string> =>
      ipcRenderer.invoke('app:default-instances-dir')
  }
}

contextBridge.exposeInMainWorld('kirit', api)

export type KiritApi = typeof api
