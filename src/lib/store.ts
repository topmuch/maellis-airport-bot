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
  | 'knowledge_base'
  | 'hotels'
  | 'miles'
  | 'rebooking'
  | 'pmr_audio'
  | 'health_pharmacy'
  | 'wifi'
  | 'checkin'
  | 'music'

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
  activeModule: 'overview' as ModuleKey,
  sidebarOpen: true,
  showLanding: true,
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setShowLanding: (show) => set({ showLanding: show }),
}))
