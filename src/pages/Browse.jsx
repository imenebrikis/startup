import { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Search, Home, Plus, X, Heart, MessageSquare, User, Map as MapIcon, List, ChevronDown, ArrowRightLeft } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { supabase } from '../lib/supabase'

const MapView = lazy(() => import('../components/MapView'))

// ── Constants ─────────────────────────────────────────────────────────────────

const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', "M'Sila", 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
  'Illizi', 'Bordj Bou Arreridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued',
  'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal', 'Béni Abbès',
  'In Salah', 'In Guezzam', 'Touggourt', 'Djanet', "El M'Ghair", 'El Meniaa',
]

const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const month = MONTHS_FR[d.getMonth()]
  return `${d.getDate()} ${month.charAt(0).toUpperCase() + month.slice(1)}`
}

function getInitials(name) {
  if (!name) return ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Shared dropdown pill style ────────────────────────────────────────────────

const CHEVRON_DARK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%231a1a1a'/%3E%3C/svg%3E")`
const CHEVRON_WHITE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23ffffff'/%3E%3C/svg%3E")`

function pillSelectStyle(active) {
  return {
    padding: '7px 30px 7px 14px',
    borderRadius: '999px',
    border: `1.5px solid ${active ? '#1a1a1a' : '#d1d5db'}`,
    background: active ? '#1a1a1a' : 'transparent',
    color: active ? '#ffffff' : '#1a1a1a',
    fontSize: '13px',
    fontWeight: active ? '600' : '500',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: active ? CHEVRON_WHITE : CHEVRON_DARK,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    flexShrink: 0,
  }
}

function pillTriggerStyle(active) {
  return {
    padding: '7px 14px',
    borderRadius: '999px',
    border: `1.5px solid ${active ? '#1a1a1a' : '#d1d5db'}`,
    background: active ? '#1a1a1a' : 'transparent',
    color: active ? '#ffffff' : '#1a1a1a',
    fontSize: '13px',
    fontWeight: active ? '600' : '500',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
      {/* Image area */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="skeleton-pulse" style={{ width: '100%', height: '200px', borderRadius: '16px 16px 0 0' }} />
        {/* Hanging owner avatar */}
        <div className="skeleton-pulse" style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #ffffff', zIndex: 2 }} />
      </div>
      {/* Card body */}
      <div style={{ paddingTop: '30px', paddingLeft: '14px', paddingRight: '14px', paddingBottom: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
        <div className="skeleton-pulse" style={{ height: '11px', width: '55%', borderRadius: '6px' }} />
        <div className="skeleton-pulse" style={{ height: '11px', width: '40%', borderRadius: '6px' }} />
        <div className="skeleton-pulse" style={{ height: '34px', width: '100%', borderRadius: '999px', marginTop: '4px' }} />
      </div>
    </div>
  )
}

// ── ListingCard ───────────────────────────────────────────────────────────────

function TypeBadge({ listing }) {
  const { is_for_exchange, is_for_sale } = listing
  let label, bg
  if (is_for_exchange && is_for_sale) {
    label = 'Éch. & Vente'
    bg = '#004949'
  } else if (is_for_exchange) {
    label = 'Échange'
    bg = '#004949'
  } else {
    label = 'Vente'
    bg = '#004949'
  }
  return (
    <span style={{
      position: 'absolute', top: '10px', left: '10px',
      background: bg,
      color: '#fff', fontSize: '11px', fontWeight: '600',
      padding: '3px 10px', borderRadius: '999px',
      fontFamily: "'Inter', sans-serif",
      letterSpacing: '0.01em',
    }}>
      {label}
    </span>
  )
}

function ListingCard({ listing, navigate, userId }) {
  const [hovered, setHovered] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listing.id)
      .maybeSingle()
      .then(({ data }) => setIsFavorited(Boolean(data)))
  }, [userId, listing.id])

  const handleToggleFavorite = async (e) => {
    e.stopPropagation()
    if (!userId || likeLoading) return
    setLikeLoading(true)
    if (isFavorited) {
      await supabase.from('user_favorites').delete().eq('user_id', userId).eq('listing_id', listing.id)
      setIsFavorited(false)
    } else {
      await supabase.from('user_favorites').insert({ user_id: userId, listing_id: listing.id })
      setIsFavorited(true)
    }
    setLikeLoading(false)
  }

  const photo = listing.images?.[0]
  const from = formatDate(listing.available_from)
  const to = formatDate(listing.available_to)
  const location = [listing.wilaya, listing.quartier || listing.city].filter(Boolean).join(', ')
  const ownerInitials = getInitials(listing.profiles?.full_name)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'visible',
        transition: 'box-shadow 0.22s, transform 0.22s',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.10)' : '0 1px 6px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
      }}
    >
      {/* Image + badges + avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {photo ? (
          <img
            src={photo}
            alt={listing.title}
            style={{
              width: '100%', height: '200px',
              objectFit: 'cover', display: 'block',
              borderRadius: '16px 16px 0 0',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '200px',
            background: '#e8e8e8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '16px 16px 0 0',
          }}>
            <Home style={{ width: '36px', height: '36px', color: '#c4c4d4' }} />
          </div>
        )}

        {/* Type badge — top left text pill */}
        <TypeBadge listing={listing} />

        {/* Favorite heart — top right */}
        <button
          onClick={handleToggleFavorite}
          disabled={likeLoading}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'none', border: 'none', padding: '4px',
            cursor: likeLoading ? 'wait' : 'pointer', lineHeight: 0,
          }}
        >
          <Heart
            strokeWidth={2}
            style={{
              width: '22px',
              height: '22px',
              fill: isFavorited ? '#f43f5e' : 'none',
              color: isFavorited ? '#f43f5e' : '#ffffff',
              filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
              transition: 'fill 0.18s, color 0.18s',
            }}
          />
        </button>

        {/* Owner avatar — centered at bottom edge */}
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '40px', height: '40px',
          borderRadius: '50%',
          border: '3px solid #ffffff',
          background: ownerInitials ? '#4B3FD8' : '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: '700', fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden',
          flexShrink: 0,
          zIndex: 2,
        }}>
          {listing.profiles?.avatar_url ? (
            <img
              src={listing.profiles.avatar_url}
              alt={listing.profiles.full_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : ownerInitials || (
            <User style={{ width: '18px', height: '18px', color: '#aaa' }} />
          )}
        </div>
      </div>

      {/* Card body — date, location, CTA only */}
      <div style={{
        paddingTop: '26px',
        paddingLeft: '14px',
        paddingRight: '14px',
        paddingBottom: '14px',
        display: 'flex', flexDirection: 'column', gap: '6px', flex: 1,
        background: '#ffffff',
        borderRadius: '0 0 16px 16px',
        overflow: 'hidden',
      }}>

        {/* Location row */}
        {location && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <MapPin style={{ width: '12px', height: '12px', color: '#717182', flexShrink: 0 }} />
            <span style={{
              fontSize: '12px', color: '#1a1a1a', fontWeight: '500',
              maxWidth: '160px', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {location}
            </span>
          </div>
        )}

        {/* Date row */}
        {(from || to) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Calendar style={{ width: '12px', height: '12px', color: '#717182', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#717182', fontWeight: '500' }}>
              {from && to ? `${from} – ${to}` : from || to}
            </span>
          </div>
        )}

        {/* Swap destinations row */}
        {listing.is_for_exchange && (() => {
          const anyWilaya = listing.any_wilaya
          const raw = listing.destination_wilayas
          const wilayas = typeof raw === 'string'
            ? raw.split(',').map(w => w.trim()).filter(w => w && isNaN(w))
            : Array.isArray(raw) ? raw.map(String).map(w => w.trim()).filter(w => w && isNaN(w)) : []
          if (!anyWilaya && wilayas.length === 0) return null
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', minWidth: 0 }}>
              <ArrowRightLeft style={{ width: '11px', height: '11px', color: '#717182', flexShrink: 0 }} />
              {anyWilaya ? (
                <span style={{ fontSize: '11px', color: '#717182', fontWeight: '500' }}>
                  Toutes les wilayas
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                  <span style={{
                    fontSize: '11px', color: '#717182', fontWeight: '500',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}>
                    {wilayas.slice(0, 2).join(' · ')}
                  </span>
                  {wilayas.length > 2 && (
                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600', flexShrink: 0 }}>
                      +{wilayas.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {listing.is_for_sale && listing.price && (
          <p style={{
            fontSize: '13px', fontWeight: '700', color: '#4B3FD8',
            margin: 0, textAlign: 'center',
          }}>
            {new Intl.NumberFormat('fr-DZ').format(listing.price)} DZD
          </p>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => navigate(`/listing/${listing.id}`)}
          style={{
            marginTop: '6px',
            width: '100%',
            padding: '9px',
            borderRadius: '999px',
            border: 'none',
            background: hovered ? '#004949' : '#f4f4f4',
            color: hovered ? '#ffffff' : '#004949',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.18s, color 0.18s',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {listing.is_for_exchange ? "Demande d'échange" : 'Voir les détails'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Browse() {
  const navigate = useNavigate()
  const [initials, setInitials] = useState('?')
  const [userId, setUserId] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterWilaya, setFilterWilaya] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterRooms, setFilterRooms] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [isMapView, setIsMapView] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/'); return }
      setUserId(user.id)
      const fullName = user.user_metadata?.full_name
      if (fullName) setInitials(fullName.split(' ').map(n => n[0]).join('').toUpperCase())
      else if (user.email) setInitials(user.email[0].toUpperCase())
    })

    supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setListings(data || [])
        setLoading(false)
      })
  }, [navigate])

  const hasAnyFilter = search || filterWilaya || filterType || filterRooms || filterDate

  function applyUserFilters(list) {
    return list.filter(l => {
      if (search) {
        const q = search.toLowerCase()
        const blob = [l.title, l.wilaya, l.city, l.quartier].filter(Boolean).join(' ').toLowerCase()
        if (!blob.includes(q)) return false
      }
      if (filterWilaya && l.wilaya !== filterWilaya) return false
      if (filterType === 'exchange' && !l.is_for_exchange) return false
      if (filterType === 'sale' && !l.is_for_sale) return false
      if (filterType === 'both' && !(l.is_for_exchange && l.is_for_sale)) return false
      if (filterRooms) {
        const r = parseInt(filterRooms)
        if (filterRooms === '5+' ? l.rooms < 5 : l.rooms !== r) return false
      }
      if (filterDate && l.available_from && l.available_from > filterDate) return false
      return true
    })
  }

  const filtered = useMemo(() =>
    applyUserFilters(listings),
    [listings, search, filterWilaya, filterType, filterRooms, filterDate]
  )

  const filteredMap = useMemo(() =>
    applyUserFilters(listings.filter(l => l.latitude && l.longitude)),
    [listings, search, filterWilaya, filterType, filterRooms, filterDate]
  )

  function clearAll() {
    setSearch('')
    setFilterWilaya('')
    setFilterType('')
    setFilterRooms('')
    setFilterDate('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7EC', fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════════════
          BLACK TOP NAV — logo, search, favorites, chat
      ══════════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#004949',
        padding: '0 28px',
        height: '62px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>

        {/* Logo */}
        <Link to="/dashboard" style={{
          fontSize: '18px', fontWeight: '700', color: '#ffffff',
          textDecoration: 'none', fontFamily: "'Bricolage Grotesque', sans-serif",
          flexShrink: 0, marginRight: '8px',
        }}>
          DarBelDar
        </Link>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
          <Search style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)',
            width: '14px', height: '14px', color: 'rgba(255,255,255,0.45)',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Rechercher une wilaya, titre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px 8px 34px',
              borderRadius: '999px',
              border: '1.5px solid rgba(255,255,255,0.15)',
              fontSize: '13px',
              color: '#ffffff',
              background: 'rgba(255,255,255,0.10)',
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Favoris → Maisons aimées tab on profile */}
        <Link to="/profile?tab=likes" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          textDecoration: 'none', flexShrink: 0,
        }}>
          <Heart style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.85)' }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter', sans-serif", fontWeight: '500' }}>Favoris</span>
        </Link>

        {/* Chat → messagerie */}
        <Link to="/messages" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          textDecoration: 'none', flexShrink: 0,
        }}>
          <MessageSquare style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.85)' }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter', sans-serif", fontWeight: '500' }}>Chat</span>
        </Link>

        {/* User avatar → profile */}
        <Link to="/profile" style={{
          width: '34px', height: '34px', background: '#4B3FD8',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '12px',
          flexShrink: 0, textDecoration: 'none',
        }}>
          {initials}
        </Link>

        {/* CTA */}
        <Link
          to="/add-listing"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: '#ADEBB3',
            color: '#000000',
            fontSize: '13px', fontWeight: '700',
            textDecoration: 'none',
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Plus style={{ width: '13px', height: '13px' }} />
          Publier
        </Link>
      </header>

      {/* ══════════════════════════════════════════════════
          WHITE FILTER BAR — filters centred, map toggle right
      ══════════════════════════════════════════════════ */}
      <div style={{
        position: 'sticky', top: '62px', zIndex: 99,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '10px 28px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>

        {/* Centred filter pills */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', flexWrap: 'wrap', flex: 1,
        }}>

          {/* 1 — Wilaya */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={pillTriggerStyle(!!filterWilaya)}>
                {filterWilaya || 'Wilaya'}
                <ChevronDown style={{ width: '10px', height: '10px' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '200px',
              maxHeight: '260px',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              zIndex: 9999,
            }}>
              <DropdownMenuRadioGroup value={filterWilaya} onValueChange={setFilterWilaya}>
                <DropdownMenuRadioItem value="" style={{
                  padding: '9px 36px 9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#1f2937',
                  backgroundColor: filterWilaya === '' ? '#f3f4f6' : 'transparent',
                  fontFamily: "'Inter', sans-serif",
                }}>Toutes les wilayas</DropdownMenuRadioItem>
                {WILAYAS.map(w => (
                  <DropdownMenuRadioItem key={w} value={w} style={{
                    padding: '9px 36px 9px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#1f2937',
                    backgroundColor: filterWilaya === w ? '#f3f4f6' : 'transparent',
                    fontFamily: "'Inter', sans-serif",
                  }}>{w}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2 — Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={pillTriggerStyle(!!filterType)}>
                {filterType === 'exchange' ? 'Échange'
                  : filterType === 'sale' ? 'Vente'
                  : filterType === 'both' ? 'Échange & Vente'
                  : 'Type'}
                <ChevronDown style={{ width: '10px', height: '10px' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '170px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              zIndex: 9999,
            }}>
              <DropdownMenuRadioGroup value={filterType} onValueChange={setFilterType}>
                {[
                  { value: '', label: 'Tous les types' },
                  { value: 'exchange', label: 'Échange' },
                  { value: 'sale', label: 'Vente' },
                  { value: 'both', label: 'Échange & Vente' },
                ].map(({ value, label }) => (
                  <DropdownMenuRadioItem key={value} value={value} style={{
                    padding: '9px 36px 9px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#1f2937',
                    backgroundColor: filterType === value ? '#f3f4f6' : 'transparent',
                    fontFamily: "'Inter', sans-serif",
                  }}>{label}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 3 — Chambres */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={pillTriggerStyle(!!filterRooms)}>
                {filterRooms === '1' ? '1 chambre'
                  : filterRooms ? `${filterRooms} chambres`
                  : 'Chambres'}
                <ChevronDown style={{ width: '10px', height: '10px' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '160px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              zIndex: 9999,
            }}>
              <DropdownMenuRadioGroup value={filterRooms} onValueChange={setFilterRooms}>
                {[
                  { value: '', label: 'Toutes' },
                  { value: '1', label: '1 chambre' },
                  { value: '2', label: '2 chambres' },
                  { value: '3', label: '3 chambres' },
                  { value: '4', label: '4 chambres' },
                  { value: '5+', label: '5+ chambres' },
                ].map(({ value, label }) => (
                  <DropdownMenuRadioItem key={value} value={value} style={{
                    padding: '9px 36px 9px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#1f2937',
                    backgroundColor: filterRooms === value ? '#f3f4f6' : 'transparent',
                    fontFamily: "'Inter', sans-serif",
                  }}>{label}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 4 — Date */}
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            title="Disponible dès"
            style={{
              ...pillSelectStyle(!!filterDate),
              backgroundImage: 'none',
              paddingRight: '14px',
              colorScheme: filterDate ? 'dark' : 'light',
            }}
          />

          {/* Clear — appears only when something is active */}
          {hasAnyFilter && (
            <button
              onClick={clearAll}
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                border: '1.5px solid #e5e7eb',
                background: 'transparent',
                color: '#717182',
                fontSize: '13px', fontWeight: '500',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', gap: '5px',
                flexShrink: 0,
              }}
            >
              <X style={{ width: '12px', height: '12px' }} />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Map / List toggle */}
        <button
          onClick={() => setIsMapView(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 16px',
            borderRadius: '999px',
            border: `1.5px solid ${isMapView ? '#1a1a1a' : '#d1d5db'}`,
            background: isMapView ? '#1a1a1a' : 'transparent',
            color: isMapView ? '#ffffff' : '#1a1a1a',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
            transition: 'all 0.18s',
          }}
        >
          {isMapView
            ? <List style={{ width: '13px', height: '13px' }} />
            : <MapIcon style={{ width: '13px', height: '13px' }} />
          }
          {isMapView ? 'Liste' : 'Carte'}
        </button>
      </div>

      {/* ── Main content ── */}
      <main className={isMapView ? '' : 'browse-main'} style={isMapView ? {} : { maxWidth: '1440px', margin: '0 auto' }}>

        {isMapView ? (
          <Suspense fallback={
            <div style={{
              height: 'calc(100vh - 122px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#F7F7EC',
            }}>
              <span style={{ color: '#717182', fontFamily: "'Inter',sans-serif", fontSize: '14px' }}>
                Chargement de la carte…
              </span>
            </div>
          }>
            <MapView key={filteredMap.length} listings={filteredMap} />
          </Suspense>
        ) : (
          <>
            {/* Results count */}
            {!loading && (
              <p style={{ fontSize: '12px', color: '#717182', marginBottom: '20px' }}>
                {filtered.length} logement{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
              </p>
            )}

            {/* Grid */}
            {loading ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '20px',
              }}>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <div style={{
                  width: '64px', height: '64px', background: '#ffffff',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}>
                  <Home style={{ width: '28px', height: '28px', color: '#c4c4d4' }} />
                </div>
                <p style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '18px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px',
                }}>
                  Aucun logement trouvé
                </p>
                <p style={{ fontSize: '13px', color: '#717182' }}>
                  Essayez de modifier vos filtres
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '20px',
              }}>
                {filtered.map(listing => (
                  <ListingCard key={listing.id} listing={listing} navigate={navigate} userId={userId} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        header input::placeholder { color: rgba(255,255,255,0.40); }
        .browse-main { padding: 28px 24px 80px; }
        @media (min-width: 1024px) {
          .browse-main { padding: 36px 48px 80px; }
        }
      `}</style>
    </div>
  )
}
