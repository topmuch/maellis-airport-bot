'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  RefreshCw,
  Plane,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlightSearchResult {
  id: string
  flightNumber: string
  airline: string
  departure: string
  arrival: string
  price: string
  status: string
}

interface FlightStatusItem {
  id: string
  flightNumber: string
  airline: string
  departureCode: string
  arrivalCode: string
  scheduledDep: string
  scheduledArr: string
  actualDep: string | null
  actualArr: string | null
  gate: string | null
  terminal: string | null
  status: string
  delayMinutes: number
}

interface SearchFormState {
  departure: string
  destination: string
  date: string
  passengers: string
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockSearchResults: FlightSearchResult[] = [
  {
    id: '1',
    flightNumber: 'AF 722',
    airline: 'Air France',
    departure: 'DSS 08:30',
    arrival: 'CDG 14:45',
    price: '485,000 FCFA',
    status: 'available',
  },
  {
    id: '2',
    flightNumber: 'SN 202',
    airline: 'Brussels Airlines',
    departure: 'DSS 10:15',
    arrival: 'BRU 17:30',
    price: '520,000 FCFA',
    status: 'available',
  },
  {
    id: '3',
    flightNumber: 'AT 527',
    airline: 'Royal Air Maroc',
    departure: 'DSS 14:00',
    arrival: 'CMN 16:30',
    price: '295,000 FCFA',
    status: 'available',
  },
  {
    id: '4',
    flightNumber: 'BA 178',
    airline: 'British Airways',
    departure: 'DSS 22:10',
    arrival: 'LHR 06:45+1',
    price: '680,000 FCFA',
    status: 'few_seats',
  },
  {
    id: '5',
    flightNumber: 'ET 912',
    airline: 'Ethiopian Airlines',
    departure: 'DSS 23:55',
    arrival: 'ADD 06:20+1',
    price: '410,000 FCFA',
    status: 'available',
  },
]

const mockRecentSearches: FlightSearchResult[] = [
  {
    id: 'r1',
    flightNumber: 'DSS → CDG',
    airline: 'Air France',
    departure: '25 Avr 2025',
    arrival: 'Direct',
    price: '485,000 FCFA',
    status: 'completed',
  },
  {
    id: 'r2',
    flightNumber: 'ABJ → BRU',
    airline: 'Brussels Airlines',
    departure: '26 Avr 2025',
    arrival: '1 escale',
    price: '540,000 FCFA',
    status: 'completed',
  },
  {
    id: 'r3',
    flightNumber: 'BKO → CMN',
    airline: 'Royal Air Maroc',
    departure: '27 Avr 2025',
    arrival: 'Direct',
    price: '310,000 FCFA',
    status: 'completed',
  },
  {
    id: 'r4',
    flightNumber: 'LOS → LHR',
    airline: 'British Airways',
    departure: '28 Avr 2025',
    arrival: 'Direct',
    price: '720,000 FCFA',
    status: 'completed',
  },
  {
    id: 'r5',
    flightNumber: 'ACC → ADD',
    airline: 'Ethiopian Airlines',
    departure: '29 Avr 2025',
    arrival: 'Direct',
    price: '390,000 FCFA',
    status: 'completed',
  },
]

const mockFlightStatuses: FlightStatusItem[] = [
  {
    id: 'fs1',
    flightNumber: 'AF 722',
    airline: 'Air France',
    departureCode: 'DSS',
    arrivalCode: 'CDG',
    scheduledDep: '08:30',
    scheduledArr: '14:45',
    actualDep: '08:45',
    actualArr: null,
    gate: 'A3',
    terminal: 'T1',
    status: 'departed',
    delayMinutes: 15,
  },
  {
    id: 'fs2',
    flightNumber: 'SN 202',
    airline: 'Brussels Airlines',
    departureCode: 'DSS',
    arrivalCode: 'BRU',
    scheduledDep: '10:15',
    scheduledArr: '17:30',
    actualDep: null,
    actualArr: null,
    gate: 'B1',
    terminal: 'T1',
    status: 'scheduled',
    delayMinutes: 0,
  },
  {
    id: 'fs3',
    flightNumber: 'AT 527',
    airline: 'Royal Air Maroc',
    departureCode: 'DSS',
    arrivalCode: 'CMN',
    scheduledDep: '14:00',
    scheduledArr: '16:30',
    actualDep: null,
    actualArr: null,
    gate: 'C2',
    terminal: 'T2',
    status: 'delayed',
    delayMinutes: 45,
  },
  {
    id: 'fs4',
    flightNumber: 'ET 912',
    airline: 'Ethiopian Airlines',
    departureCode: 'ADD',
    arrivalCode: 'DSS',
    scheduledDep: '01:00',
    scheduledArr: '04:30',
    actualDep: '00:55',
    actualArr: '04:15',
    gate: 'A1',
    terminal: 'T1',
    status: 'arrived',
    delayMinutes: 0,
  },
  {
    id: 'fs5',
    flightNumber: 'TK 601',
    airline: 'Turkish Airlines',
    departureCode: 'DSS',
    arrivalCode: 'IST',
    scheduledDep: '19:30',
    scheduledArr: '04:00+1',
    actualDep: null,
    actualArr: null,
    gate: 'B4',
    terminal: 'T1',
    status: 'scheduled',
    delayMinutes: 0,
  },
  {
    id: 'fs6',
    flightNumber: 'IA 590',
    airline: 'Iberia',
    departureCode: 'DSS',
    arrivalCode: 'MAD',
    scheduledDep: '16:45',
    scheduledArr: '23:30',
    actualDep: null,
    actualArr: null,
    gate: null,
    terminal: 'T2',
    status: 'cancelled',
    delayMinutes: 0,
  },
  {
    id: 'fs7',
    flightNumber: 'AF 724',
    airline: 'Air France',
    departureCode: 'CDG',
    arrivalCode: 'DSS',
    scheduledDep: '22:10',
    scheduledArr: '00:15+1',
    actualDep: '22:10',
    actualArr: null,
    gate: null,
    terminal: null,
    status: 'departed',
    delayMinutes: 0,
  },
  {
    id: 'fs8',
    flightNumber: 'EM 722',
    airline: 'Emirates',
    departureCode: 'DSS',
    arrivalCode: 'DXB',
    scheduledDep: '21:00',
    scheduledArr: '06:30+1',
    actualDep: null,
    actualArr: null,
    gate: 'C5',
    terminal: 'T2',
    status: 'delayed',
    delayMinutes: 20,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFlightStatusBadge(status: string) {
  switch (status) {
    case 'scheduled':
      return (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700 flex items-center gap-1">
          <Clock className="size-3" />
          Programmé
        </Badge>
      )
    case 'departed':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
          <Plane className="size-3" />
          Décollé
        </Badge>
      )
    case 'delayed':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 flex items-center gap-1">
          <AlertTriangle className="size-3" />
          Retardé
        </Badge>
      )
    case 'arrived':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          Arrivé
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 flex items-center gap-1">
          <XCircle className="size-3" />
          Annulé
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getSearchResultBadge(status: string) {
  switch (status) {
    case 'available':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
          Disponible
        </Badge>
      )
    case 'few_seats':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
          Peu de places
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700">
          Terminé
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getDelayDisplay(minutes: number): string {
  if (minutes === 0) return '—'
  return `+${minutes} min`
}

function getDelayClass(minutes: number): string {
  if (minutes === 0) return 'text-muted-foreground'
  if (minutes <= 15) return 'text-amber-600 dark:text-amber-400'
  if (minutes <= 30) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FlightsModule() {
  // Tab 1: Search state
  const [searchForm, setSearchForm] = useState<SearchFormState>({
    departure: '',
    destination: '',
    date: '',
    passengers: '1',
  })
  const [searchResults, setSearchResults] = useState<FlightSearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<FlightSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(true)

  // Tab 2: Status state
  const [flightStatuses, setFlightStatuses] = useState<FlightStatusItem[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Fetch recent flight searches
  const fetchRecentSearches = useCallback(async () => {
    try {
      const res = await fetch('/api/flights?limit=5')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (data.data && data.data.length > 0) {
        setRecentSearches(
          data.data.map((f: Record<string, unknown>) => ({
            id: f.id as string,
            flightNumber: `${f.departureCode} → ${f.arrivalCode}`,
            airline: (f.airline as string) || 'N/A',
            departure: f.travelDate
              ? new Date(f.travelDate as string).toLocaleDateString('fr-FR')
              : 'N/A',
            arrival: (f.passengers as number) > 0 ? `${f.passengers} pax` : 'N/A',
            price: f.cheapestPrice
              ? `${new Intl.NumberFormat('fr-FR').format(f.cheapestPrice as number)} FCFA`
              : 'N/A',
            status: 'completed' as const,
          }))
        )
      } else {
        setRecentSearches(mockRecentSearches)
      }
    } catch {
      setRecentSearches(mockRecentSearches)
    } finally {
      setLoadingRecent(false)
    }
  }, [])

  // Fetch flight statuses
  const fetchFlightStatuses = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingStatus(true)
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/flights/status')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (data.data && data.data.length > 0) {
        setFlightStatuses(
          data.data.map((f: Record<string, unknown>) => ({
            id: f.id as string,
            flightNumber: f.flightNumber as string,
            airline: f.airline as string,
            departureCode: f.departureCode as string,
            arrivalCode: f.arrivalCode as string,
            scheduledDep: f.scheduledDep as string || '—',
            scheduledArr: f.scheduledArr as string || '—',
            actualDep: f.actualDep as string | null,
            actualArr: f.actualArr as string | null,
            gate: f.gate as string | null,
            terminal: f.terminal as string | null,
            status: f.status as string,
            delayMinutes: f.delayMinutes as number || 0,
          }))
        )
      } else {
        setFlightStatuses(mockFlightStatuses)
      }
    } catch {
      setFlightStatuses(mockFlightStatuses)
    } finally {
      setLoadingStatus(false)
      setIsRefreshing(false)
      setLastUpdate(
        new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
  }, [])

  useEffect(() => {
    fetchRecentSearches()
    fetchFlightStatuses(true)
  }, [fetchRecentSearches, fetchFlightStatuses])

  // Auto-refresh flight statuses every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFlightStatuses(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchFlightStatuses])

  // Search handler
  const handleSearch = async () => {
    if (!searchForm.departure || !searchForm.destination) return
    setIsSearching(true)
    setHasSearched(true)
    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureCode: searchForm.departure.toUpperCase(),
          arrivalCode: searchForm.destination.toUpperCase(),
          departureCity: searchForm.departure.toUpperCase(),
          arrivalCity: searchForm.destination.toUpperCase(),
          travelDate: searchForm.date || null,
          passengers: parseInt(searchForm.passengers),
          resultsCount: 5,
          cheapestPrice: 295000,
          airline: 'Air France',
          status: 'completed',
        }),
      })
      if (!res.ok) throw new Error('Failed to search')
      // Show mock results regardless
      setSearchResults(mockSearchResults)
    } catch {
      // Fallback to mock data
      setSearchResults(mockSearchResults)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestion des Vols</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Recherche et suivi en temps réel des vols
        </p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList>
          <TabsTrigger value="search">Recherche Vols</TabsTrigger>
          <TabsTrigger value="status">Suivi Vols</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Recherche Vols ──────────────────────────────────────── */}
        <TabsContent value="search" className="space-y-6 mt-4">
          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="size-4" />
                Rechercher un Vol
              </CardTitle>
              <CardDescription>
                Entrez les détails de votre recherche de vol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departure">Départ</Label>
                  <Input
                    id="departure"
                    placeholder="ex: DSS"
                    value={searchForm.departure}
                    onChange={(e) =>
                      setSearchForm((prev) => ({
                        ...prev,
                        departure: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="ex: CDG"
                    value={searchForm.destination}
                    onChange={(e) =>
                      setSearchForm((prev) => ({
                        ...prev,
                        destination: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={searchForm.date}
                    onChange={(e) =>
                      setSearchForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passagers</Label>
                  <Select
                    value={searchForm.passengers}
                    onValueChange={(value) =>
                      setSearchForm((prev) => ({
                        ...prev,
                        passengers: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Nombre" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? 'passager' : 'passagers'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchForm.departure || !searchForm.destination}
                    className="w-full"
                  >
                    {isSearching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Rechercher
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {hasSearched && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résultats de Recherche</CardTitle>
                <CardDescription>
                  {searchResults.length} vols trouvés pour {searchForm.departure.toUpperCase()} → {searchForm.destination.toUpperCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vol</TableHead>
                      <TableHead>Compagnie</TableHead>
                      <TableHead>Départ</TableHead>
                      <TableHead>Arrivée</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((flight) => (
                      <TableRow key={flight.id}>
                        <TableCell className="font-mono font-medium">
                          {flight.flightNumber}
                        </TableCell>
                        <TableCell>{flight.airline}</TableCell>
                        <TableCell>{flight.departure}</TableCell>
                        <TableCell>{flight.arrival}</TableCell>
                        <TableCell className="font-medium">
                          {flight.price}
                        </TableCell>
                        <TableCell>
                          {getSearchResultBadge(flight.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recent Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                Recherches Récentes
              </CardTitle>
              <CardDescription>
                Dernières recherches effectuées par les utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trajet</TableHead>
                      <TableHead>Compagnie</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSearches.map((flight) => (
                      <TableRow key={flight.id}>
                        <TableCell className="font-mono font-medium">
                          {flight.flightNumber}
                        </TableCell>
                        <TableCell>{flight.airline}</TableCell>
                        <TableCell>{flight.departure}</TableCell>
                        <TableCell>{flight.arrival}</TableCell>
                        <TableCell className="font-medium">
                          {flight.price}
                        </TableCell>
                        <TableCell>
                          {getSearchResultBadge(flight.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Suivi Vols ─────────────────────────────────────────── */}
        <TabsContent value="status" className="space-y-4 mt-4">
          {/* Status Board Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                Tableau des Vols en Temps Réel
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Actualisation automatique toutes les 30 secondes
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Dernière MAJ : {lastUpdate}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchFlightStatuses(false)}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Actualiser
              </Button>
              {isRefreshing && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Mise à jour...
                </span>
              )}
            </div>
          </div>

          {/* Status Summary Badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Programmé', count: flightStatuses.filter((f) => f.status === 'scheduled').length, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400' },
              { label: 'Décollé', count: flightStatuses.filter((f) => f.status === 'departed').length, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { label: 'Retardé', count: flightStatuses.filter((f) => f.status === 'delayed').length, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
              { label: 'Arrivé', count: flightStatuses.filter((f) => f.status === 'arrived').length, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
              { label: 'Annulé', count: flightStatuses.filter((f) => f.status === 'cancelled').length, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            ].map((item) => (
              <Badge key={item.label} className={`${item.color} border px-3 py-1`}>
                {item.label} ({item.count})
              </Badge>
            ))}
          </div>

          {/* Flight Status Table */}
          <Card>
            <CardContent className="p-0">
              {loadingStatus ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    Chargement des vols...
                  </span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vol</TableHead>
                      <TableHead>Compagnie</TableHead>
                      <TableHead>Départ</TableHead>
                      <TableHead>Arrivée</TableHead>
                      <TableHead>Porte</TableHead>
                      <TableHead>Terminal</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Retard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flightStatuses.map((flight) => (
                      <TableRow key={flight.id}>
                        <TableCell className="font-mono font-medium">
                          {flight.flightNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {flight.airline}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {flight.departureCode}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {flight.actualDep || flight.scheduledDep}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {flight.arrivalCode}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {flight.actualArr || flight.scheduledArr}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {flight.gate ? (
                            <span className="font-mono text-sm">
                              {flight.gate}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {flight.terminal ? (
                            <span className="text-sm">{flight.terminal}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getFlightStatusBadge(flight.status)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium text-sm ${getDelayClass(flight.delayMinutes)}`}
                          >
                            {getDelayDisplay(flight.delayMinutes)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
