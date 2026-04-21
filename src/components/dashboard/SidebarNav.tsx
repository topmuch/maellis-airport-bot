'use client'

import {
  LayoutDashboard,
  Plane,
  QrCode,
  Crown,
  Car,
  CreditCard,
  ShieldAlert,
  MessageSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useNavigationStore, type ModuleKey } from '@/lib/store'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'

interface NavItem {
  label: string
  icon: LucideIcon
  module: ModuleKey
  badge?: number
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, module: 'overview' },
  { label: 'Vols', icon: Plane, module: 'flights' },
  { label: 'Bagages QR', icon: QrCode, module: 'baggage' },
  { label: 'Salles VIP', icon: Crown, module: 'lounge' },
  { label: 'Transport', icon: Car, module: 'transport' },
  { label: 'Paiements', icon: CreditCard, module: 'payments' },
  { label: 'Urgences', icon: ShieldAlert, module: 'emergency' },
  { label: 'Conversations', icon: MessageSquare, module: 'conversations' },
  { label: 'Paramètres', icon: Settings, module: 'settings' },
]

export function SidebarNav() {
  const { activeModule, setActiveModule } = useNavigationStore()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const handleNavClick = (module: ModuleKey) => {
    setActiveModule(module)
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeModule === item.module

        return (
          <SidebarMenuItem key={item.module}>
            <SidebarMenuButton
              isActive={isActive}
              onClick={() => handleNavClick(item.module)}
              tooltip={item.label}
              className={
                isActive
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-300'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              <Icon
                className={`size-5 shrink-0 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </SidebarMenuButton>
            {!isCollapsed && item.badge && item.badge > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            )}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
