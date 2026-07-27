import { create } from 'zustand'

import type {
  CreateInstanceInput,
  GlobalSettings,
  Instance,
  InstanceSort,
  InstanceView
} from '../../../shared/types'

interface AppState {
  instances: Instance[]
  settings: GlobalSettings | null
  loaded: boolean
  error: string | null

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
  loaded: false,
  error: null,

  load: async () => {
    try {
      const [instances, settings] = await Promise.all([
        window.kirit.instances.list(),
        window.kirit.settings.get()
      ])
      set({ instances, settings, loaded: true, error: null })
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
