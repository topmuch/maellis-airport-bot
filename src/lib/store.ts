import { create } from 'zustand'

export type ModuleKey =
  | 'overview'
  | 'flights'
  | 'baggage'
  | 'lounge'
  | 'transport'
  | 'payments'
  | 'emergency'
  | 'partners'
  | 'conversations'
  | 'analytics'
  | 'team'
  | 'reports'
  | 'modules'
  | 'demo'
  | 'docs'
  | 'settings'

interface NavigationStore {
  activeModule: ModuleKey
  sidebarOpen: boolean
  setActiveModule: (module: ModuleKey) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activeModule: 'overview',
  sidebarOpen: true,
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
