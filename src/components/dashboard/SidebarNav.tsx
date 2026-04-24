'use client'

import {
  LayoutDashboard,
  Plane,
  QrCode,
  Crown,
  Car,
  CreditCard,
  ShieldAlert,
  Handshake,
  MessageSquare,
  BarChart3,
  Users,
  FileText,
  Puzzle,
  Play,
  BookOpen,
  Settings,
  Store,
  ScanLine,
  Megaphone,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { useNavigationStore, type ModuleKey } from '@/lib/store'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from '@/components/ui/sidebar'

interface NavItem {
  label: string
  icon: LucideIcon
  module: ModuleKey
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'TABLEAU DE BORD', icon: LayoutDashboard, module: 'overview' },
    ],
  },
  {
    title: 'OPÉRATIONS AÉROPORTUAIRES',
    items: [
      { label: 'VOLS', icon: Plane, module: 'flights' },
      { label: 'BAGAGES QR', icon: QrCode, module: 'baggage' },
      { label: 'SALLES VIP', icon: Crown, module: 'lounge' },
      { label: 'TRANSPORT', icon: Car, module: 'transport' },
    ],
  },
  {
    title: 'COMMUNICATIONS',
    items: [
      { label: 'CONVERSATIONS', icon: MessageSquare, module: 'conversations' },
      { label: 'URGENCES', icon: ShieldAlert, module: 'emergency' },
    ],
  },
  {
    title: 'FINANCES',
    items: [
      { label: 'PAIEMENTS', icon: CreditCard, module: 'payments' },
      { label: 'FACTURATION', icon: Receipt, module: 'invoices' },
    ],
  },
  {
    title: 'COMMERCIAL',
    items: [
      { label: 'PARTENAIRES', icon: Handshake, module: 'partners' },
      { label: 'MARKETPLACE', icon: Store, module: 'marketplace' },
      { label: 'PUBLICITÉ', icon: Megaphone, module: 'ads' },
    ],
  },
  {
    title: 'ANALYTIQUES',
    items: [
      { label: 'ANALYTICS', icon: BarChart3, module: 'analytics' },
      { label: 'RAPPORTS', icon: FileText, module: 'reports' },
    ],
  },
  {
    title: 'GESTION',
    items: [
      { label: 'ÉQUIPE', icon: Users, module: 'team' },
      { label: 'SCANS BILLETS', icon: ScanLine, module: 'ticket_scans' },
      { label: 'MODULES', icon: Puzzle, module: 'modules' },
    ],
  },
  {
    title: 'SYSTÈME',
    items: [
      { label: 'DÉMONSTRATION', icon: Play, module: 'demo' },
      { label: 'DOCUMENTATION', icon: BookOpen, module: 'docs' },
      { label: 'PARAMÈTRES', icon: Settings, module: 'settings' },
    ],
  },
]

export function SidebarNav() {
  const { activeModule, setActiveModule } = useNavigationStore()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const handleNavClick = (module: ModuleKey) => {
    setActiveModule(module)
  }

  // When collapsed, render flat list without section headers
  if (isCollapsed) {
    return (
      <SidebarMenu>
        {navSections.flatMap((section) =>
          section.items.map((item) => {
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
          })
        )}
      </SidebarMenu>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {navSections.map((section) => (
        <SidebarGroup key={section.title}>
          <SidebarGroupLabel className="!text-[10px] !font-bold !tracking-widest !text-white/40 !px-3 !py-1.5 uppercase">
            {section.title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
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
                      <span className="text-[13px] font-medium">{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  )
}
