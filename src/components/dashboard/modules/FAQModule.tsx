'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CircleHelp,
  BarChart3,
  Lightbulb,
  Check,
  X,
  Loader2,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Globe,
  Tag,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ModuleHeader } from '@/components/dashboard/ModuleHeader'

// ─── Types ────────────────────────────────────────────────────────────

interface FAQItem {
  id: string
  airportCode: string
  category: string
  question: string
  answer: string
  keywords: string
  priority: number
  isActive: boolean
  viewCount: number
  resolvedCount: number
  createdAt: string
  updatedAt: string
}

interface FAQStats {
  totalFAQs: number
  activeFAQs: number
  totalQueries: number
  resolvedQueries: number
  unresolvedQueries: number
  resolutionRate: number
  topCategories: { category: string; count: number }[]
  recentUnresolved: { question: string; timestamp: string; language: string }[]
  pendingSuggestions: number
}

interface FAQSuggestion {
  id: string
  airportCode: string
  question: string
  proposedAnswer: string | null
  category: string | null
  status: string
  suggestedBy: string
  createdAt: string
}

const CATEGORIES = [
  { value: 'baggage', label: 'Bagages & Services', icon: '🧳', color: 'bg-amber-500/15 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' },
  { value: 'money', label: 'Argent & Paiements', icon: '💰', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800' },
  { value: 'transport', label: 'Transport & Parking', icon: '🚗', color: 'bg-sky-500/15 text-sky-600 border-sky-200 dark:text-sky-400 dark:border-sky-800' },
  { value: 'food', label: 'Restauration & Shopping', icon: '🍽️', color: 'bg-rose-500/15 text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-800' },
  { value: 'emergency', label: 'Urgences & Infos', icon: '🚨', color: 'bg-red-500/15 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800' },
  { value: 'other', label: 'Autres', icon: '❓', color: 'bg-gray-500/15 text-gray-600 border-gray-200 dark:text-gray-400 dark:border-gray-800' },
]

function getCategoryInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[5]
}

function parseJSON(jsonStr: string, fallback: Record<string, string> = {}) {
  try { return JSON.parse(jsonStr) } catch { return fallback }
}

// ─── FAQ Module ───────────────────────────────────────────────────────

export function FAQModule() {
  const [activeTab, setActiveTab] = useState('faqs')
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="FAQ Intelligente"
        subtitle="Base de connaissances multilingue pour le bot WhatsApp"
        actions={
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => document.getElementById('create-faq-btn')?.click()}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle FAQ
          </Button>
        }
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="faqs"><CircleHelp className="mr-2 h-4 w-4" />FAQ</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="faqs"><FAQListTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ─── FAQ List Tab ──────────────────────────────────────────────────────

function FAQListTab() {
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchFAQs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      params.set('limit', '100')
      const res = await fetch(`/api/faq?${params}`)
      const json = await res.json()
      if (json.success) setFaqs(json.data.faqs || [])
    } catch { toast.error('Erreur de chargement') }
    setLoading(false)
  }, [search, categoryFilter])

  useEffect(() => { fetchFAQs() }, [fetchFAQs])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette FAQ ?')) return
    try {
      const res = await fetch(`/api/faq/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) { toast.success('FAQ supprimée'); fetchFAQs() }
      else toast.error(json.error)
    } catch { toast.error('Erreur') }
  }

  const handleToggle = async (faq: FAQItem) => {
    try {
      const res = await fetch(`/api/faq/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !faq.isActive }),
      })
      const json = await res.json()
      if (json.success) fetchFAQs()
      else toast.error(json.error)
    } catch { toast.error('Erreur') }
  }

  const filteredFAQs = faqs

  return (
    <>
      {/* Hidden button for ModuleHeader action */}
      <button id="create-faq-btn" className="hidden" onClick={() => { setEditingFAQ(null); setShowForm(true) }} />

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher une FAQ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchFAQs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* FAQ Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
        ) : filteredFAQs.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <CircleHelp className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune FAQ trouvée</p>
              <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingFAQ(null); setShowForm(true) }}>
                <Plus className="mr-2 h-4 w-4" />Créer la première FAQ
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredFAQs.map((faq) => {
            const questionObj = parseJSON(faq.question)
            const answerObj = parseJSON(faq.answer)
            const keywords: string[] = parseJSON(faq.keywords, [])
            const catInfo = getCategoryInfo(faq.category)

            return (
              <Card key={faq.id} className={`transition-all ${!faq.isActive ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={catInfo.color}>{catInfo.icon} {catInfo.label}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="mr-1 h-3 w-3" />
                          {Object.keys(questionObj).filter((k) => questionObj[k]).map((l) => l.toUpperCase()).join(' / ')}
                        </Badge>
                        {faq.priority > 0 && <Badge variant="outline" className="text-xs"><TrendingUp className="mr-1 h-3 w-3" />Prio {faq.priority}</Badge>}
                        {!faq.isActive && <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">Inactive</Badge>}
                      </div>
                      <p className="font-medium">{questionObj.fr || Object.values(questionObj)[0] || '—'}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{answerObj.fr || Object.values(answerObj)[0] || '—'}</p>
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {keywords.slice(0, 6).map((kw) => (
                            <span key={kw} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                              <Tag className="mr-1 h-2.5 w-2.5" />{kw}
                            </span>
                          ))}
                          {keywords.length > 6 && <span className="text-[10px] text-muted-foreground">+{keywords.length - 6}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span><MessageCircle className="inline h-3 w-3 mr-1" />{faq.viewCount} vues</span>
                        <span><Check className="inline h-3 w-3 mr-1" />{faq.resolvedCount} résolues</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(faq)} title={faq.isActive ? 'Désactiver' : 'Activer'}>
                        {faq.isActive ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingFAQ(faq); setShowForm(true) }} title="Modifier">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(faq.id)} title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* FAQ Form Dialog */}
      <FAQFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        faq={editingFAQ}
        onSave={() => { setShowForm(false); fetchFAQs() }}
      />
    </>
  )
}

// ─── FAQ Form Dialog ───────────────────────────────────────────────────

function FAQFormDialog({
  open,
  onOpenChange,
  faq,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  faq: FAQItem | null
  onSave: () => void
}) {
  const isEdit = !!faq
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState(faq?.category || 'other')
  const [priority, setPriority] = useState(faq?.priority?.toString() || '0')
  const [frQ, setFrQ] = useState('')
  const [enQ, setEnQ] = useState('')
  const [woQ, setWoQ] = useState('')
  const [frA, setFrA] = useState('')
  const [enA, setEnA] = useState('')
  const [woA, setWoA] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  // Reset form when dialog opens with different FAQ or no FAQ
  const prevFAQRef = useRef<string | null>(null)
  useEffect(() => {
    const q = faq ? parseJSON(faq.question) : {} as Record<string, string>
    const a = faq ? parseJSON(faq.answer) : {} as Record<string, string>
    const kw = faq ? parseJSON(faq.keywords, []) as string[] : []
    const newFAQ = faq?.id ?? 'new'
    if (newFAQ !== prevFAQRef.current) {
      prevFAQRef.current = newFAQ
      if (faq) {
        setCategory(faq.category)
        setPriority(faq.priority.toString())
        setFrQ(q.fr || '')
        setEnQ(q.en || '')
        setWoQ(q.wo || '')
        setFrA(a.fr || '')
        setEnA(a.en || '')
        setWoA(a.wo || '')
        setKeywords(kw)
      } else {
        setCategory('other')
        setPriority('0')
        setFrQ(''); setEnQ(''); setWoQ('')
        setFrA(''); setEnA(''); setWoA('')
        setKeywords([])
      }
    }
  }, [faq, open])

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase()
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw])
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => setKeywords(keywords.filter((k) => k !== kw))

  const handleSubmit = async () => {
    if (!frQ.trim() || !frA.trim()) {
      toast.error('La question et la réponse en français sont obligatoires')
      return
    }
    setSaving(true)
    try {
      const question: Record<string, string> = { fr: frQ.trim() }
      const answer: Record<string, string> = { fr: frA.trim() }
      if (enQ.trim()) question.en = enQ.trim()
      if (woQ.trim()) question.wo = woQ.trim()
      if (enA.trim()) answer.en = enA.trim()
      if (woA.trim()) answer.wo = woA.trim()

      const body = { category, question, answer, keywords, priority: parseInt(priority) || 0 }

      const url = isEdit ? `/api/faq/${faq!.id}` : '/api/faq'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()

      if (json.success) {
        toast.success(isEdit ? 'FAQ modifiée' : 'FAQ créée')
        onSave()
      } else toast.error(json.error || 'Erreur')
    } catch { toast.error('Erreur réseau') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la FAQ' : 'Nouvelle FAQ'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Modifiez les informations de la FAQ' : 'Ajoutez une nouvelle question/réponse à la base de connaissances'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Category + Priority */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité (0 = normal, 10 = haute)</Label>
              <Input type="number" min="0" max="10" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* French Question/Answer */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">🇫🇷 Français <Badge variant="outline" className="text-[10px]">Obligatoire</Badge></Label>
            <Input placeholder="Question en français..." value={frQ} onChange={(e) => setFrQ(e.target.value)} />
            <textarea placeholder="Réponse en français..." value={frA} onChange={(e) => setFrA(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>

          {/* English Question/Answer */}
          <div className="space-y-2">
            <Label>🇬🇧 English</Label>
            <Input placeholder="Question in English..." value={enQ} onChange={(e) => setEnQ(e.target.value)} />
            <textarea placeholder="Answer in English..." value={enA} onChange={(e) => setEnA(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>

          {/* Wolof Question/Answer */}
          <div className="space-y-2">
            <Label>🇸🇳 Wolof</Label>
            <Input placeholder="Question en wolof..." value={woQ} onChange={(e) => setWoQ(e.target.value)} />
            <textarea placeholder="Réponse en wolof..." value={woA} onChange={(e) => setWoA(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>

          <Separator />

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Mots-clés</Label>
            <div className="flex gap-2">
              <Input placeholder="Ajouter un mot-clé..." value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())} />
              <Button variant="outline" onClick={addKeyword} type="button"><Plus className="h-4 w-4" /></Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => removeKeyword(kw)}>
                    {kw} <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Enregistrer' : 'Créer la FAQ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Analytics Tab ─────────────────────────────────────────────────────

function AnalyticsTab() {
  const [stats, setStats] = useState<FAQStats | null>(null)
  const [suggestions, setSuggestions] = useState<FAQSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, sugRes] = await Promise.all([
        fetch('/api/faq?type=stats'),
        fetch('/api/faq/suggestions?status=pending'),
      ])
      const [statsJson, sugJson] = await Promise.all([statsRes.json(), sugRes.json()])
      if (statsJson.success) setStats(statsJson.data)
      if (sugJson.success) setSuggestions(sugJson.data || [])
    } catch { toast.error('Erreur de chargement') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  // eslint-disable-next-line react-hooks/set-state-in-effect

  const handleSuggestion = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/faq/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const json = await res.json()
      if (json.success) { toast.success(action === 'approve' ? 'Suggestion approuvée et ajoutée aux FAQ' : 'Suggestion rejetée'); fetchData() }
      else toast.error(json.error)
    } catch { toast.error('Erreur') }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">FAQ Actives</p>
                <p className="text-2xl font-bold">{stats?.activeFAQs ?? 0}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15"><CircleHelp className="h-5 w-5 text-orange-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Requêtes Totales</p>
                <p className="text-2xl font-bold">{stats?.totalQueries ?? 0}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15"><MessageCircle className="h-5 w-5 text-sky-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taux de Résolution</p>
                <p className="text-2xl font-bold">{stats?.resolutionRate ? `${(stats.resolutionRate * 100).toFixed(1)}%` : '—'}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Non Résolues</p>
                <p className="text-2xl font-bold">{stats?.unresolvedQueries ?? 0}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Distribution par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.topCategories || []).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Aucune donnée</p>
              ) : (
                stats?.topCategories.map((cat) => {
                  const catInfo = getCategoryInfo(cat.category)
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="text-lg">{catInfo.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{catInfo.label}</span>
                          <span className="font-semibold">{cat.count}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min(100, (cat.count / (stats?.totalFAQs || 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Unresolved Questions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Questions Non Résolues (récentes)</CardTitle>
            <CardDescription>Questions sans FAQ correspondante — à ajouter à la base</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {(stats?.recentUnresolved || []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Aucune question non résolue</p>
                ) : (
                  stats?.recentUnresolved.map((u, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                      <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">{u.language.toUpperCase()}</Badge>
                      <div className="flex-1">
                        <p className="text-xs">{u.question}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(u.timestamp).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Suggestions en attente
              </CardTitle>
              <CardDescription>Questions suggérées par les utilisateurs — approuvez pour créer une FAQ</CardDescription>
            </div>
            <Badge variant="outline">{suggestions.length} en attente</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune suggestion en attente</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{s.question}</p>
                    {s.proposedAnswer && <p className="text-xs text-muted-foreground line-clamp-1">{s.proposedAnswer}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>Par {s.suggestedBy}</span>
                      <span>·</span>
                      <span>{new Date(s.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:text-emerald-700" onClick={() => handleSuggestion(s.id, 'approve')}>
                      <Check className="mr-1 h-3 w-3" />Approuver
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={() => handleSuggestion(s.id, 'reject')}>
                      <X className="mr-1 h-3 w-3" />Rejeter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
