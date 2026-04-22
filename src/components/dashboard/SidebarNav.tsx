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
  BarChart3,
  Users,
  FileText,
  Puzzle,
  Play,
  BookOpen,
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
  { label: 'Analytics', icon: BarChart3, module: 'analytics' },
  { label: 'Équipe', icon: Users, module: 'team' },
  { label: 'Rapports', icon: FileText, module: 'reports' },
  { label: 'Modules', icon: Puzzle, module: 'modules' },
  { label: 'Démonstration', icon: Play, module: 'demo' },
  { label: 'Documentation', icon: BookOpen, module: 'docs' },
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
                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 hover:text-orange-300'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }
            >
              <Icon
                className={`size-5 shrink-0 ${
                  isActive
                    ? 'text-orange-400'
                    : 'text-white/70'
                }`}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </SidebarMenuButton>
            {!isCollapsed && item.badge && item.badge > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            )}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
