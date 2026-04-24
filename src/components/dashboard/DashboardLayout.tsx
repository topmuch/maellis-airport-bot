'use client'

import { useState, useEffect } from 'react'
import { Plane, Bell, Menu, Globe, LogOut, User, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigationStore } from '@/lib/store'
import { useAuth } from '@/components/auth/AuthGuard'
import { logoutUser } from '@/app/actions/auth'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { RealTimeIndicator } from '@/components/dashboard/RealTimeIndicator'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const languages = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'wo', label: 'Wolof', flag: '🇸🇳' },
] as const

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  AIRPORT_ADMIN: 'Admin Aéroport',
  AGENT: 'Agent',
  VIEWER: 'Lecteur',
}

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  AIRPORT_ADMIN: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  AGENT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  VIEWER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useNavigationStore()
  const [selectedLang, setSelectedLang] = useState('fr')
  const [notificationCount] = useState(3)
  const { user, role, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logoutUser()
  }

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'
  const userRoleLabel = ROLE_LABELS[role || ''] || role
  const userRoleColor = ROLE_COLORS[role || ''] || ROLE_COLORS.VIEWER

  // Sync zustand store with SidebarProvider
  useEffect(() => {
    setSidebarOpen(sidebarOpen)
  }, [sidebarOpen, setSidebarOpen])

  const currentLang = languages.find((l) => l.code === selectedLang)

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      {/* Sidebar */}
      <Sidebar collapsible="icon" variant="sidebar">
        {/* Sidebar Header - Brand */}
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white">
              <Plane className="size-5" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold tracking-wide text-white">
                MAELLIS
              </span>
              <span className="truncate text-[11px] text-white/70">
                Aéroport Dashboard
              </span>
            </div>
          </div>
        </SidebarHeader>

        <Separator className="mx-3 w-auto" />

        {/* Sidebar Navigation */}
        <SidebarContent className="px-2 py-2">
          <SidebarNav />
        </SidebarContent>

        {/* Sidebar Footer — User Info + Logout */}
        <SidebarFooter className="p-3">
          <Separator className="mb-3" />
          <div className="flex items-center gap-3 px-1">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={user?.image || '/avatar-admin.png'} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-medium text-white">
                {authLoading ? 'Chargement...' : user?.name || 'Utilisateur'}
              </span>
              <span className="truncate text-[10px] text-white/70">
                {authLoading ? '' : user?.email || ''}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-white/60 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
          >
            <LogOut className="size-3.5" />
            <span>{isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
          </button>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
        {/* Top Header Bar */}
        <motion.header
          className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Left side: Hamburger + Brand (mobile) */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex size-7 items-center justify-center rounded-md bg-orange-500 text-white">
                <Plane className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight text-foreground">
                  MAELLIS
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  Aéroport
                </span>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: Real-time + Language + Notifications + Avatar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Real-Time Indicator */}
            <RealTimeIndicator />
            {/* Theme Toggle — Dark/Light/System */}
            <ThemeToggle />
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:flex"
                >
                  <Globe className="size-4" />
                  <span>{currentLang?.flag}</span>
                  <span className="hidden lg:inline">{currentLang?.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Langue</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={`cursor-pointer ${
                      selectedLang === lang.code
                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                        : ''
                    }`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Language Shortcut */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                >
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="sr-only">Langue</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Langue</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={`cursor-pointer ${
                      selectedLang === lang.code
                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                        : ''
                    }`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                >
                  <Bell className="size-4" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-orange-500 p-0 text-[10px] text-white hover:bg-orange-500">
                      {notificationCount}
                    </Badge>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-xs font-medium">Vol AF123 retardé</span>
                  <span className="text-[10px] text-muted-foreground">
                    Il y a 5 minutes
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-xs font-medium">
                    Nouvelle demande VIP reçue
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Il y a 15 minutes
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-xs font-medium">
                    Signalement bagage #4521
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Il y a 30 minutes
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Avatar Dropdown (Desktop) — with Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden rounded-full sm:flex">
                  <Avatar className="size-8 ring-2 ring-transparent transition-all hover:ring-orange-500/50">
                    <AvatarImage src={user?.image || '/avatar-admin.png'} alt={user?.name || 'User'} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{user?.name || 'Utilisateur'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email || ''}</span>
                </DropdownMenuLabel>
                {role && (
                  <DropdownMenuItem className="flex items-center gap-2 cursor-default" disabled>
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${userRoleColor}`}>
                      {userRoleLabel}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-900/20"
                >
                  <LogOut className="size-4" />
                  <span>{isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Avatar Dropdown (Mobile) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden text-muted-foreground hover:text-foreground"
                >
                  <User className="size-4" />
                  <span className="sr-only">Mon compte</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{user?.name || 'Utilisateur'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email || ''}</span>
                </DropdownMenuLabel>
                {role && (
                  <DropdownMenuItem className="flex items-center gap-2 cursor-default" disabled>
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${userRoleColor}`}>
                      {userRoleLabel}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-900/20"
                >
                  <LogOut className="size-4" />
                  <span>{isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
