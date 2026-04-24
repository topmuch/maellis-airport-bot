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
  | 'marketplace'
  | 'ticket_scans'
  | 'ads'
  | 'invoices'
  | 'modules'
  | 'demo'
  | 'docs'
  | 'settings'
  | 'faq'

interface NavigationStore {
  activeModule: ModuleKey
  sidebarOpen: boolean
  showLanding: boolean
  setActiveModule: (module: ModuleKey) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setShowLanding: (show: boolean) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activeModule: 'overview',
  sidebarOpen: true,
  showLanding: true,
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setShowLanding: (show) => set({ showLanding: show }),
}))
