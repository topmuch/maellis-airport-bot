'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Bed,
  Clock,
  MapPin,
  Star,
  Search,
  Plus,
  Phone,
  Calendar,
  Users,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────

interface Hotel {
  id: string
  name: string
  description: string | null
  starRating: number
  address: string
  distanceKm: number
  terminal: string
  imageUrl: string | null
  amenities: string
}

interface HotelRoom {
  id: string
  roomType: string
  name: string
  hourPrice: number
  minHours: number
  maxHours: number
  maxGuests: number
  availableRooms: number
}

interface DayUseBooking {
  id: string
  bookingRef: string
  passengerName: string
  phone: string
  hotelId: string
  bookingDate: string
  startTime: string
  durationHours: number
  totalPrice: number
  status: string
  hotel: { name: string; starRating: number } | null
}

interface Stats {
  totalHotels: number
  totalBookings: number
  activeBookings: number
  totalRevenue: number
}

// ─── Module Component ───────────────────────────────────

export function HotelsModule() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [bookings, setBookings] = useState<DayUseBooking[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'hotels' | 'bookings' | 'stats'>('hotels')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [hotelsRes, bookingsRes] = await Promise.all([
        fetch('/api/hotels?airportCode=DSS'),
        fetch('/api/hotels/bookings?stats=true'),
      ])
      const hotelsData = await hotelsRes.json()
      const bookingsData = await bookingsRes.json()
      setHotels(hotelsData.data || [])
      setBookings(bookingsData.data?.bookings || [])
      setStats(bookingsData.data || null)
    } catch (error) {
      console.error('Failed to load hotels data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHotels = hotels.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'checked_in': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🏨 Marketplace Hôtels Day-Use</h1>
          <p className="text-sm text-muted-foreground">
            Réservation de chambres pour escales — à proximité de l&apos;aéroport
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="size-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalHotels}</p>
                  <p className="text-xs text-muted-foreground">Hôtels Partenaires</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="size-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Réservations Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="size-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeBookings}</p>
                  <p className="text-xs text-muted-foreground">En Cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-teal-500">FCFA</span>
                <div>
                  <p className="text-2xl font-bold">{(stats.totalRevenue || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Chiffre d&apos;Affaires</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['hotels', 'bookings', 'stats'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {tab === 'hotels' ? '🏨 Hôtels' : tab === 'bookings' ? '📋 Réservations' : '📊 Statistiques'}
          </Button>
        ))}
      </div>

      {/* Hotels Tab */}
      {activeTab === 'hotels' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un hôtel..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredHotels.map(hotel => (
              <Card key={hotel.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{hotel.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: hotel.starRating }).map((_, i) => (
                          <Star key={i} className="size-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="mr-1 size-3" /> {hotel.distanceKm} km
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{hotel.address}</p>
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(hotel.amenities || '[]').slice(0, 4).map((a: string) => (
                      <Badge key={a} variant="secondary" className="text-[10px]">
                        {a}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs">
                    À partir de <span className="font-bold text-orange-600">3 000 FCFA</span>/heure
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Réf</th>
                    <th className="p-3 text-left">Passager</th>
                    <th className="p-3 text-left">Téléphone</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-right">Montant</th>
                    <th className="p-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{b.bookingRef}</td>
                      <td className="p-3">{b.passengerName}</td>
                      <td className="p-3">{b.phone}</td>
                      <td className="p-3">{b.bookingDate}</td>
                      <td className="p-3 text-right font-medium">{b.totalPrice.toLocaleString()} FCFA</td>
                      <td className="p-3 text-center">
                        <Badge className={statusColor(b.status)} variant="secondary">
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Aucune réservation
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Répartition par Statut</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Confirmées</span><span className="font-bold">{stats.activeBookings}</span></div>
                <div className="flex justify-between"><span>Terminées</span><span className="font-bold">{stats.totalBookings - stats.activeBookings}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Revenu Moyen</span><span className="font-bold">
                  {stats.totalBookings > 0 ? Math.round((stats.totalRevenue || 0) / stats.totalBookings).toLocaleString() : 0} FCFA
                </span></div>
                <div className="flex justify-between"><span>Taux d&apos;Occupation</span><span className="font-bold text-green-600">--</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
