import { contextBridge, ipcRenderer } from 'electron'

import type {
  Account,
  AccountsState,
  CreateInstanceInput,
  GlobalSettings,
  Instance,
  VersionManifest
} from '../shared/types'

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
  },

  instances: {
    list: (): Promise<Instance[]> => ipcRenderer.invoke('instances:list'),
    create: (input: CreateInstanceInput): Promise<Instance> =>
      ipcRenderer.invoke('instances:create', input),
    update: (id: string, patch: Partial<Omit<Instance, 'id' | 'dir'>>): Promise<Instance> =>
      ipcRenderer.invoke('instances:update', id, patch),
    remove: (id: string, deleteFiles: boolean): Promise<void> =>
      ipcRenderer.invoke('instances:delete', id, deleteFiles),
    openFolder: (id: string): Promise<void> =>
      ipcRenderer.invoke('instances:open-folder', id),
    pickIcon: (id: string): Promise<Instance | null> =>
      ipcRenderer.invoke('instances:pick-icon', id),
    setIconPath: (id: string, path: string): Promise<Instance> =>
      ipcRenderer.invoke('instances:set-icon-path', id, path),
    move: (id: string): Promise<Instance | null> => ipcRenderer.invoke('instances:move', id),
    onMoveProgress: (
      cb: (p: { id: string; copied: number; total: number }) => void
    ): (() => void) => {
      const listener = (
        _e: unknown,
        p: { id: string; copied: number; total: number }
      ): void => cb(p)
      ipcRenderer.on('instances:move-progress', listener)
      return () => {
        ipcRenderer.off('instances:move-progress', listener)
      }
    }
  },

  settings: {
    get: (): Promise<GlobalSettings> => ipcRenderer.invoke('settings:get'),
    patch: (patch: Partial<GlobalSettings>): Promise<GlobalSettings> =>
      ipcRenderer.invoke('settings:patch', patch),
    pickInstancesDir: (): Promise<GlobalSettings | null> =>
      ipcRenderer.invoke('settings:pick-instances-dir')
  },

  versions: {
    manifest: (): Promise<VersionManifest> => ipcRenderer.invoke('versions:manifest')
  },

  dialog: {
    /** Bild wählen ohne bestehende Instanz — liefert Pfad + Vorschau als Data-URL. */
    pickImage: (): Promise<{ path: string; dataUrl: string } | null> =>
      ipcRenderer.invoke('dialog:pick-image')
  },

  accounts: {
    state: (): Promise<AccountsState> => ipcRenderer.invoke('accounts:state'),
    /** Öffnet das Microsoft-Fenster. `null` heißt: vom Nutzer abgebrochen. */
    signIn: (): Promise<{ account: Account; state: AccountsState } | null> =>
      ipcRenderer.invoke('accounts:sign-in'),
    setActive: (id: string): Promise<AccountsState> =>
      ipcRenderer.invoke('accounts:set-active', id),
    remove: (id: string): Promise<AccountsState> => ipcRenderer.invoke('accounts:remove', id),
    onSignInStep: (cb: (step: string) => void): (() => void) => {
      const listener = (_e: unknown, step: string): void => cb(step)
      ipcRenderer.on('accounts:sign-in-step', listener)
      return () => {
        ipcRenderer.off('accounts:sign-in-step', listener)
      }
    }
  }
}

contextBridge.exposeInMainWorld('kirit', api)

export type KiritApi = typeof api
