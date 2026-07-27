import { create } from 'zustand'

import type {
  Account,
  AccountsState,
  CreateInstanceInput,
  GlobalSettings,
  Instance,
  InstanceSort,
  InstanceView,
  LaunchProgress,
  RunningInstance
} from '../../../shared/types'

interface AppState {
  instances: Instance[]
  settings: GlobalSettings | null
  accounts: AccountsState
  running: RunningInstance[]
  /** Fortschritt je startender Instanz. */
  launching: Record<string, LaunchProgress>
  loaded: boolean
  error: string | null

  launch: (instanceId: string) => Promise<void>
  stop: (instanceId: string) => Promise<void>
  applyProgress: (p: LaunchProgress) => void
  setRunning: (r: RunningInstance[]) => void
  clearLaunch: (instanceId: string) => void

  signIn: () => Promise<Account | null>
  setActiveAccount: (id: string) => Promise<void>
  removeAccount: (id: string) => Promise<void>

  load: () => Promise<void>
  createInstance: (input: CreateInstanceInput) => Promise<Instance>
  updateInstance: (id: string, patch: Partial<Omit<Instance, 'id' | 'dir'>>) => Promise<void>
  removeInstance: (id: string, deleteFiles: boolean) => Promise<void>
  pickIcon: (id: string) => Promise<void>
  moveInstance: (id: string) => Promise<void>
  patchSettings: (patch: Partial<GlobalSettings>) => Promise<void>
  setView: (view: InstanceView) => Promise<void>
  setSort: (sort: InstanceSort) => Promise<void>
}

/**
 * Ein Store für Instanzen und Einstellungen.
 *
 * Alle Änderungen gehen über den Main-Prozess und übernehmen dessen Antwort als
 * neuen Zustand — nie optimistisch im Renderer raten. Der alte Client hatte den
 * umgekehrten Fall (`activeSkinId` nur im React-State), und die Einstellung war
 * nach einem Neustart weg.
 */
export const useApp = create<AppState>((set, get) => ({
  instances: [],
  settings: null,
  accounts: { accounts: [], activeId: null },
  running: [],
  launching: {},
  loaded: false,
  error: null,

  launch: async (instanceId) => {
    set({ error: null })
    try {
      await window.kirit.launch.start(instanceId)
      set({ running: await window.kirit.launch.running() })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
      get().clearLaunch(instanceId)
    }
  },

  stop: async (instanceId) => {
    await window.kirit.launch.stop(instanceId)
  },

  applyProgress: (p) => set({ launching: { ...get().launching, [p.instanceId]: p } }),
  setRunning: (running) => set({ running }),

  clearLaunch: (instanceId) => {
    const next = { ...get().launching }
    delete next[instanceId]
    set({ launching: next })
  },

  signIn: async () => {
    const result = await window.kirit.accounts.signIn()
    if (!result) return null // vom Nutzer abgebrochen
    set({ accounts: result.state })
    return result.account
  },

  setActiveAccount: async (id) => {
    set({ accounts: await window.kirit.accounts.setActive(id) })
  },

  removeAccount: async (id) => {
    set({ accounts: await window.kirit.accounts.remove(id) })
  },

  load: async () => {
    try {
      const [instances, settings, accounts, running] = await Promise.all([
        window.kirit.instances.list(),
        window.kirit.settings.get(),
        window.kirit.accounts.state(),
        window.kirit.launch.running()
      ])
      set({ instances, settings, accounts, running, loaded: true, error: null })
    } catch (e) {
      set({ loaded: true, error: e instanceof Error ? e.message : String(e) })
    }
  },

  createInstance: async (input) => {
    const created = await window.kirit.instances.create(input)
    set({ instances: [...get().instances, created] })
    return created
  },

  updateInstance: async (id, patch) => {
    const updated = await window.kirit.instances.update(id, patch)
    set({ instances: get().instances.map((i) => (i.id === id ? updated : i)) })
  },

  removeInstance: async (id, deleteFiles) => {
    await window.kirit.instances.remove(id, deleteFiles)
    set({ instances: get().instances.filter((i) => i.id !== id) })
  },

  pickIcon: async (id) => {
    const updated = await window.kirit.instances.pickIcon(id)
    if (updated) set({ instances: get().instances.map((i) => (i.id === id ? updated : i)) })
  },

  moveInstance: async (id) => {
    const updated = await window.kirit.instances.move(id)
    if (updated) set({ instances: get().instances.map((i) => (i.id === id ? updated : i)) })
  },

  patchSettings: async (patch) => {
    const settings = await window.kirit.settings.patch(patch)
    set({ settings })
  },

  setView: async (view) => get().patchSettings({ instanceView: view }),
  setSort: async (sort) => get().patchSettings({ instanceSort: sort })
}))
