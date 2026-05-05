'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  BarChart3,
  Check,
  Loader2,
  Upload,
  RefreshCw,
  Send,
  Clock,
  File,
  FileType,
  Blocks,
  Database,
  Zap,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
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
import { Progress } from '@/components/ui/progress'
import { ModuleHeader } from '@/components/dashboard/ModuleHeader'

// ─── Types ────────────────────────────────────────────────────────────

interface KBDocument {
  id: string
  airportCode: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  status: 'indexed' | 'processing' | 'error' | 'pending'
  chunkCount: number
  isActive: boolean
  uploadedBy: string
  createdAt: string
  updatedAt: string
  sourceUrl?: string | null
  importedAt?: string | null
  isExternal?: boolean
}

interface RAGChunk {
  source: string
  score: number
  content: string
  chunkIndex: number
}

interface RAGResult {
  query: string
  chunks: RAGChunk[]
  context: string
  sources: string[]
  responseTime: number
}

interface KBStats {
  totalDocuments: number
  totalChunks: number
  activeDocuments: number
  avgChunksPerDoc: number
  fileTypeDistribution: { type: string; count: number }[]
  recentDocuments: KBDocument[]
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  indexed: { label: 'Indexé', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800' },
  processing: { label: 'Traitement', className: 'bg-amber-500/15 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' },
  error: { label: 'Erreur', className: 'bg-red-500/15 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800' },
  pending: { label: 'En attente', className: 'bg-gray-500/15 text-gray-600 border-gray-200 dark:text-gray-400 dark:border-gray-800' },
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'bg-red-500/15 text-red-500',
  txt: 'bg-sky-500/15 text-sky-500',
  md: 'bg-violet-500/15 text-violet-500',
}

function getScoreColor(score: number) {
  if (score >= 0.7) return 'bg-emerald-500'
  if (score >= 0.4) return 'bg-amber-500'
  return 'bg-red-500'
}

function getScoreTextColor(score: number) {
  if (score >= 0.7) return 'text-emerald-500'
  if (score >= 0.4) return 'text-amber-500'
  return 'text-red-500'
}

// ─── Knowledge Base Module ────────────────────────────────────────────

export function KnowledgeBaseModule() {
  const [activeTab, setActiveTab] = useState('documents')
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Base de Connaissances"
        subtitle="Documents RAG pour enrichir les réponses du bot WhatsApp"
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 sm:w-[36rem]">
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" />Documents</TabsTrigger>
          <TabsTrigger value="import"><Globe className="mr-2 h-4 w-4" />Import URL</TabsTrigger>
          <TabsTrigger value="rag"><Zap className="mr-2 h-4 w-4" />Recherche RAG</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="mr-2 h-4 w-4" />Statistiques</TabsTrigger>
        </TabsList>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="import"><ImportUrlTab /></TabsContent>
        <TabsContent value="rag"><RAGTab /></TabsContent>
        <TabsContent value="stats"><StatsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────

function DocumentsTab() {
  const [documents, setDocuments] = useState<KBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<KBDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('airportCode', 'DSS')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const result = await apiClient.get<{ documents: KBDocument[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/api/knowledge-base?${params}`)
      if (result.success) setDocuments(result.data?.documents || [])
    } catch { toast.error('Erreur de chargement des documents') }
    setLoading(false)
  }, [search, statusFilter])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchDocuments() }, [fetchDocuments])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpload = async (file: File) => {
    if (!file) return
    const allowed = ['application/pdf', 'text/plain', 'text/markdown', '']
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'txt', 'md'].includes(ext || '')) {
      toast.error('Format non supporté. Utilisez PDF, TXT ou MD.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('airportCode', 'DSS')
      if (uploadTitle.trim()) form.append('title', uploadTitle.trim())
      const result = await apiClient.upload<{ success: boolean; data?: unknown; error?: string }>('/api/knowledge-base/upload', form)
      if (result.success) {
        toast.success('Document uploadé avec succès')
        setUploadTitle('')
        fetchDocuments()
      } else toast.error(result.error || "Erreur lors de l'upload")
    } catch { toast.error('Erreur réseau') }
    setUploading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    try {
      const result = await apiClient.delete(`/api/knowledge-base/${deleteDialog.id}`)
      if (result.success) { toast.success('Document supprimé'); fetchDocuments() }
      else toast.error(result.error)
    } catch { toast.error('Erreur') }
    setDeleteDialog(null)
  }

  const handleToggle = async (doc: KBDocument) => {
    try {
      const result = await apiClient.put(`/api/knowledge-base/${doc.id}`, { isActive: !doc.isActive })
      if (result.success) fetchDocuments()
      else toast.error(result.error)
    } catch { toast.error('Erreur') }
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4 text-orange-500" />
            Upload de document
          </CardTitle>
          <CardDescription>Formats acceptés : PDF, TXT, Markdown (.md)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Titre du document (optionnel)"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />
          <div
            className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
              dragOver ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm text-muted-foreground">Upload en cours...</p>
                <Progress value={45} className="w-48 h-1.5" />
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Glissez-déposez un fichier ou <span className="text-orange-500 font-medium">cliquez pour parcourir</span>
                </p>
                <p className="text-xs text-muted-foreground/60">PDF, TXT, MD — Max 10 MB</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un document..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="indexed">Indexé</SelectItem>
            <SelectItem value="processing">En traitement</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchDocuments} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
        ) : documents.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun document trouvé</p>
              <p className="text-xs text-muted-foreground mt-1">Uploadez votre premier document pour commencer</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => {
            const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
            return (
              <Card key={doc.id} className={`transition-all ${!doc.isActive ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded text-xs font-bold uppercase" title={doc.fileType}>
                          <File className={`h-5 w-5 ${FILE_TYPE_COLORS[doc.fileType] || 'text-muted-foreground'}`} />
                        </span>
                        <Badge variant="outline" className={`text-xs ${FILE_TYPE_COLORS[doc.fileType] || ''}`}>{doc.fileType?.toUpperCase()}</Badge>
                        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>{statusCfg.label}</Badge>
                        {!doc.isActive && <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">Inactive</Badge>}
                        {doc.isExternal && <Badge variant="outline" className="text-xs bg-blue-500/15 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800 gap-1"><Globe className="h-3 w-3" />Externe</Badge>}
                      </div>
                      <p className="font-medium">{doc.title || doc.fileName}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span className="flex items-center gap-1"><Blocks className="h-3 w-3" />{doc.chunkCount} chunks</span>
                        <span>{formatDate(doc.createdAt)}</span>
                        {doc.uploadedBy && <span>Par {doc.uploadedBy}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(doc)} title={doc.isActive ? 'Désactiver' : 'Activer'}>
                        {doc.isActive ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteDialog(doc)} title="Supprimer">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le document</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>&quot;{deleteDialog?.title || deleteDialog?.fileName}&quot;</strong> ? Cette action est irréversible et supprimera tous les chunks indexés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Annuler</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Import URL Tab ───────────────────────────────────────────────────

const ALLOWED_DOMAINS_EXAMPLES = [
  'aeroport.sn',
  'dakaraeroport.com',
  'aibd.sn',
  'gouv.sn',
  'asecna.int',
]

function ImportUrlTab() {
  const [url, setUrl] = useState('')
  const [importTitle, setImportTitle] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(0)
  const [estimatedChunks, setEstimatedChunks] = useState(0)
  const [wasTruncated, setWasTruncated] = useState(false)
  const [importing, setImporting] = useState(false)
  const [sourceInfo, setSourceInfo] = useState<string | null>(null)

  // Single step: preview + import in one action
  const handleImport = async () => {
    if (!url.trim() || !url.startsWith('http')) {
      toast.error('Veuillez entrer une URL valide (http:// ou https://)')
      return
    }
    setImporting(true)
    setPreview(null)
    try {
      // Step 1: Extract content from URL
      const previewResult = await apiClient.post<{
        success: boolean
        preview?: string
        fullContent?: string
        charCount?: number
        estimatedChunks?: number
        wasTruncated?: boolean
        sourceUrl?: string
        title?: string
        error?: string
      }>('/api/admin/kb-import/preview', { url: url.trim() })

      if (!previewResult.success || !previewResult.data?.fullContent) {
        const errMsg = 'error' in previewResult ? previewResult.error : 'Erreur lors de l\'extraction'
        toast.error(errMsg)
        return
      }

      const content = previewResult.data.fullContent
      // Show preview
      setPreview(previewResult.data.preview || null)
      setCharCount(previewResult.data.charCount || 0)
      setEstimatedChunks(previewResult.data.estimatedChunks || 0)
      setWasTruncated(previewResult.data.wasTruncated || false)
      setSourceInfo(previewResult.data.title || null)

      // Step 2: Import directly
      const importResult = await apiClient.post<{
        success: boolean
        message?: string
        documentId?: string
        chunkCount?: number
        title?: string
        error?: string
      }>('/api/admin/kb-import/import', {
        url: url.trim(),
        content,
        title: importTitle.trim() || undefined,
      })

      if (importResult.success) {
        toast.success(`Import réussi : ${importResult.data?.message || 'OK'} — ${previewResult.data.charCount} caractères, ${previewResult.data.estimatedChunks} blocs`)
        // Reset all
        setUrl('')
        setImportTitle('')
        setPreview(null)
        setCharCount(0)
        setEstimatedChunks(0)
        setWasTruncated(false)
        setSourceInfo(null)
      } else {
        toast.error(importResult.error || "Erreur lors de l'import")
      }
    } catch {
      toast.error('Erreur réseau — vérifiez votre connexion')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Import Card */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            Import depuis une URL externe
          </CardTitle>
          <CardDescription>
            Extrait automatiquement le contenu d&apos;un site officiel et l&apos;ajoute à la Base de Connaissances.
            Le contenu est découpé en blocs pour l&apos;indexation RAG.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title Input */}
          <Input
            placeholder="Titre personnalisé (optionnel)"
            value={importTitle}
            onChange={(e) => setImportTitle(e.target.value)}
          />

          {/* URL + Import Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://aeroport.sn/pages/info-vols..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => { if (e.key === 'Enter' && !importing) handleImport() }}
                disabled={importing}
              />
            </div>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"
              onClick={handleImport}
              disabled={importing || !url.trim()}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              <span className="ml-2">{importing ? 'Import...' : 'Importer directement'}</span>
            </Button>
          </div>

          {/* Allowed Domains Info */}
          <p className="text-xs text-muted-foreground">
            Domaines acceptes : {ALLOWED_DOMAINS_EXAMPLES.join(', ')}
          </p>

          {/* Preview Result */}
          {preview && (
            <div className="space-y-3">
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {sourceInfo && (
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />{sourceInfo}
                  </Badge>
                )}
                <Badge variant="outline">{charCount.toLocaleString('fr-FR')} caractères</Badge>
                <Badge variant="outline">{estimatedChunks} blocs estimes</Badge>
                {wasTruncated && (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-600">
                    Tronque a 50 000 caracteres
                  </Badge>
                )}
              </div>

              {/* Content Preview */}
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Apercu du contenu extrait (premiers 2000 caracteres) :
                </p>
                <ScrollArea className="max-h-64">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {preview}
                  </pre>
                </ScrollArea>
              </div>

              {/* Action Buttons — Import done, show success */}
              <div className="flex gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">
                  <Check className="mr-1 h-3 w-3" /> Import termine avec succes
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {!preview && !importing && (
        <Card className="py-12 text-center">
          <CardContent>
            <Globe className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Entrez une URL pour extraire son contenu</p>
            <p className="text-xs text-muted-foreground mt-1">
              Le contenu sera extrait et importe automatiquement
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── RAG Test Tab ─────────────────────────────────────────────────────

const RAG_EXAMPLES = [
  'Où trouver les consignes ?',
  'Quelle est la politique de bagage ?',
  'Comment accéder au salon VIP ?',
  'Quelles sont les boutiques disponibles ?',
  'Procédure pour les objets perdus',
]

function RAGTab() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RAGResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleTest = async () => {
    const q = query.trim()
    if (!q) { toast.error('Veuillez entrer une requête'); inputRef.current?.focus(); return }
    setLoading(true)
    setResult(null)
    try {
      const startTime = performance.now()
      const result = await apiClient.post<{ results: Array<{ chunkId: string; content: string; score: number; source: { title?: string; fileName?: string; fileType?: string } | null; chunkIndex: number }>; context: string; totalChunks: number; query: string }>('/api/knowledge-base/search', { query: q, airportCode: 'DSS', topK: 5 })
      const endTime = performance.now()
      if (result.success && result.data) {
        const searchResponse = result.data
        const uniqueSources = [...new Set(searchResponse.results.map((r) => r.source?.title || r.source?.fileName || 'Unknown'))]
        const mappedResult: RAGResult = {
          query: searchResponse.query,
          chunks: searchResponse.results.map((r) => ({
            source: r.source?.title || r.source?.fileName || 'Unknown',
            score: r.score,
            content: r.content,
            chunkIndex: r.chunkIndex,
          })),
          context: searchResponse.context,
          sources: uniqueSources,
          responseTime: Math.round(endTime - startTime),
        }
        setResult(mappedResult)
      } else {
        toast.error(!result.success ? (result as { error?: string }).error || 'Erreur lors du test RAG' : 'Aucun résultat')
      }
    } catch { toast.error('Erreur de connexion') }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleTest()
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            Tester la recherche RAG
          </CardTitle>
          <CardDescription>Vérifiez la qualité de la récupération de contexte pour vos documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Posez une question sur l'aéroport..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                disabled={loading}
              />
            </div>
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shrink-0"
              onClick={handleTest}
              disabled={loading || !query.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Tester</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-muted-foreground leading-7">Exemples :</span>
            {RAG_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                onClick={() => setQuery(ex)}
                disabled={loading}
              >
                {ex}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-muted-foreground">Recherche RAG en cours...</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-4">
          {/* Meta Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Temps :</span>
              <span className={`text-sm font-semibold ${result.responseTime < 300 ? 'text-emerald-500' : result.responseTime < 800 ? 'text-amber-500' : 'text-red-500'}`}>
                {result.responseTime}ms
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2">
              <Blocks className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Chunks :</span>
              <span className="text-sm font-semibold">{result.chunks?.length || 0}</span>
            </div>
          </div>

          {/* Matched Chunks */}
          {result.chunks && result.chunks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <File className="h-4 w-4 text-orange-500" />
                Chunks correspondants
              </h3>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {result.chunks.map((chunk, i) => {
                    const pct = Math.round(chunk.score * 100)
                    return (
                      <Card key={i} className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">#{chunk.chunkIndex + 1}</Badge>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{chunk.source}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${getScoreTextColor(chunk.score)}`}>{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={`h-2 rounded-full transition-all duration-500 ${getScoreColor(chunk.score)}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{chunk.content}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Context Section */}
          {result.context && (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-orange-500" />
                  Contexte assemblé pour le LLM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{result.context}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileType className="h-4 w-4 text-orange-500" />
                  Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((src, i) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1">
                      <File className="h-3 w-3" />{src}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <Card className="py-12 text-center">
          <CardContent>
            <Zap className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Entrez une requête pour tester le moteur RAG</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Statistics Tab ───────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<KBStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiClient.get<KBStats>('/api/knowledge-base?airportCode=DSS&type=stats')
      if (result.success) setStats(result.data)
    } catch { toast.error('Erreur de chargement des statistiques') }
    setLoading(false)
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchStats() }, [fetchStats])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>

  const kpis = [
    { label: 'Total Documents', value: stats?.totalDocuments ?? 0, icon: FileText, color: 'bg-orange-500/15', iconColor: 'text-orange-500' },
    { label: 'Total Chunks Indexés', value: stats?.totalChunks ?? 0, icon: Blocks, color: 'bg-sky-500/15', iconColor: 'text-sky-500' },
    { label: 'Documents Actifs', value: stats?.activeDocuments ?? 0, icon: Eye, color: 'bg-emerald-500/15', iconColor: 'text-emerald-500' },
    { label: 'Chunks / Document', value: stats?.avgChunksPerDoc ? stats.avgChunksPerDoc.toFixed(1) : '—', icon: BarChart3, color: 'bg-violet-500/15', iconColor: 'text-violet-500' },
  ]

  const fileTypeData = stats?.fileTypeDistribution || []
  const maxFileTypeCount = Math.max(...fileTypeData.map((d) => d.count), 1)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.color}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* File Type Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Distribution par type de fichier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fileTypeData.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Aucune donnée</p>
              ) : (
                fileTypeData.map((ft) => (
                  <div key={ft.type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase px-1.5 py-0.5 rounded">{ft.type}</span>
                      </div>
                      <span className="font-semibold">{ft.count}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${FILE_TYPE_COLORS[ft.type] || 'bg-orange-500'}`}
                        style={{ width: `${(ft.count / maxFileTypeCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Documents récents</CardTitle>
              <Badge variant="outline" className="text-xs">{stats?.recentDocuments?.length || 0} documents</Badge>
            </div>
            <CardDescription>Les 10 derniers documents uploadés</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {!stats?.recentDocuments?.length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Aucun document</p>
                ) : (
                  stats.recentDocuments.map((doc) => {
                    const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
                    return (
                      <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                        <File className={`h-4 w-4 shrink-0 ${FILE_TYPE_COLORS[doc.fileType] || 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{doc.title || doc.fileName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>·</span>
                            <span>{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusCfg.className}`}>{statusCfg.label}</Badge>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
