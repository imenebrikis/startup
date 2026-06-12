import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Logo from '../components/Logo'
import FilterBar from '../components/FilterBar'
import FilterSheet from '../components/filters/FilterSheet'
import { fr, enUS } from 'date-fns/locale' // date deps passed to FilterSheet's DateControl
import LanguageSelector from '../components/LanguageSelector'
import { MapPin, Calendar, Search, Home, Plus, X, Heart, MessageSquare, User, Map as MapIcon, List, ChevronDown, ArrowRightLeft, Menu, LogOut, LayoutDashboard } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Day + short month in the active language, keeping day-month order in both
// (e.g. "12 Mai" in FR, "12 May" in EN).
function formatDate(dateStr, locale = 'fr-FR') {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const month = new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(d)
    .replace('.', '')
  return `${d.getDate()} ${month.charAt(0).toUpperCase() + month.slice(1)}`
}

function getInitials(name) {
  if (!name) return ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Shared dropdown pill style ────────────────────────────────────────────────

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
  const { t } = useTranslation()
  const { is_for_exchange, is_for_sale } = listing
  let label
  const bg = '#004949'
  if (is_for_exchange && is_for_sale) {
    label = t('browse.badge.exchangeSale')
  } else if (is_for_exchange) {
    label = t('browse.badge.exchange')
  } else {
    label = t('browse.badge.sale')
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
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR'
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
    if (!userId) { navigate('/register'); return }
    if (likeLoading) return
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
  const from = formatDate(listing.available_from, dateLocale)
  const to = formatDate(listing.available_to, dateLocale)
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
                  {t('browse.card.allWilayas')}
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
          {listing.is_for_exchange ? t('browse.card.requestExchange') : t('browse.card.viewDetails')}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Browse() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [initials, setInitials] = useState('?')
  const [userId, setUserId] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeFilters, setActiveFilters] = useState({
    wilaya: null,
    type: null,        // 'exchange' | 'sale' | 'both'
    logement: null,    // property_type: 'maison' | 'appart' | 'villa' | 'studio' | 'penthouse'
    chambres: 0,
    dateRange: { from: null, to: null },
    equipments: [],    // array of amenity strings
    rules: {},         // { smoking, pets, [ruleLabel]: label }
  })
  const patchFilters = (partial) => setActiveFilters((prev) => ({ ...prev, ...partial }))
  const [isMapView, setIsMapView] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const fullName = user.user_metadata?.full_name
      if (fullName) setInitials(fullName.split(' ').map(n => n[0]).join('').toUpperCase())
      else if (user.email) setInitials(user.email[0].toUpperCase())
    })
  }, [])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    ;(async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'approved')           // respect admin moderation
        .eq('is_active', true)              // not hidden by the owner
        .or(`available_to.gte.${today},available_to.is.null`)  // not expired (null = never expires)
        .order('created_at', { ascending: false })

      // Auto-hide listings inside their confirmed-exchange window:
      // hidden when exchange_date - 1 day <= today <= exchange_date (24h before until the day itself).
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      const { data: hiddenExchanges } = await supabase
        .from('exchanges')
        .select('listing_id, offered_house_id')
        .eq('status', 'confirmed')
        .not('exchange_date', 'is', null)
        .gte('exchange_date', today)        // exchange hasn't passed yet
        .lte('exchange_date', tomorrow)     // hide starts 24h before the exchange date
      const hiddenIds = new Set()
      ;(hiddenExchanges || []).forEach((e) => {
        if (e.listing_id) hiddenIds.add(e.listing_id)
        if (e.offered_house_id) hiddenIds.add(e.offered_house_id)
      })

      setListings((data || []).filter((l) => !hiddenIds.has(l.id)))
      setLoading(false)
    })()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserId(null)
    setInitials('?')
    navigate('/')
  }

  const applyUserFilters = useCallback((list) => {
    const { wilaya, type, logement, chambres, dateRange, equipments, rules } = activeFilters
    const reqFrom = dateRange?.from ? new Date(dateRange.from) : null
    const reqTo = dateRange?.to ? new Date(dateRange.to) : reqFrom
    return list.filter(l => {
      // Wilaya & Type — exact match when a value is selected
      if (wilaya && l.wilaya !== wilaya) return false
      if (type === 'exchange' && !l.is_for_exchange) return false
      if (type === 'sale' && !l.is_for_sale) return false
      if (type === 'both' && !(l.is_for_exchange && l.is_for_sale)) return false
      // Logement — housing type must match exactly when selected
      if (logement && l.property_type !== logement) return false
      // Chambres — capacity must be >= the selected count
      if (chambres > 0 && !(l.rooms >= chambres)) return false
      // Date range — listing availability must cover the requested period
      if (reqFrom) {
        if (l.available_from && new Date(l.available_from) > reqFrom) return false
        if (l.available_to && new Date(l.available_to) < reqTo) return false
      }
      // Équipements — must include ALL selected options
      if (equipments.length && !equipments.every(e => (l.amenities || []).includes(e))) return false
      // Règles de la maison — every active rule must hold; unselected keys are ignored
      for (const key in rules) {
        const required = rules[key]
        if (!required) continue
        if (!(l.house_rules || '').includes(required)) return false
      }
      return true
    })
  }, [activeFilters])

  const filteredProperties = useMemo(() =>
    applyUserFilters(listings),
    [listings, applyUserFilters]
  )

  const filteredMap = useMemo(() =>
    applyUserFilters(listings.filter(l => l.latitude && l.longitude)),
    [listings, applyUserFilters]
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7EC', fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════════════
          BLACK TOP NAV — logo, search, favorites, chat
      ══════════════════════════════════════════════════ */}
      <header className="browse-hdr" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#004949',
        minHeight: '76px',
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', rowGap: '12px',
      }}>

        {/* Logo */}
        <Link to="/" className="hdr-logo" style={{
          fontSize: '18px', fontWeight: '700', color: '#ffffff',
          textDecoration: 'none', fontFamily: "'Bricolage Grotesque', sans-serif",
          flexShrink: 0, marginRight: '8px',
        }}>
          <Logo size={23} color="#ffffff" />
        </Link>

        {/* CENTER — chip filter bar (inside the teal navbar) */}
        {/* flex:1 / min-width:0 live in the scoped <style> (.filterbar-slot) so the
            phone media query can override them to flex:0 0 100% for the 2nd row. */}
        <div className="filterbar-slot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FilterBar filters={activeFilters} onChange={patchFilters} wilayas={WILAYAS} onOpenSheet={() => setSheetOpen(true)} />
        </div>

        {/* ── Compact controls cluster (right-aligned on phone, inline on desktop) ── */}
        <div className="hdr-cluster">

        {/* Language switcher (FR / EN) — hidden on phone, shown at lg+ */}
        <div className="hidden lg:flex">
          <LanguageSelector />
        </div>

        {/* Carte / Liste toggle */}
        <button
          onClick={() => setIsMapView(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '999px',
            border: '1.5px solid rgba(255,255,255,0.25)',
            background: isMapView ? '#ffffff' : 'transparent',
            color: isMapView ? '#004949' : '#ffffff',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", flexShrink: 0, whiteSpace: 'nowrap',
            transition: 'all 0.18s',
          }}
        >
          {isMapView
            ? <List style={{ width: '14px', height: '14px' }} />
            : <MapIcon style={{ width: '14px', height: '14px' }} />}
          <span className="hidden lg:inline">{isMapView ? t('browse.nav.list') : t('browse.nav.map')}</span>
        </button>

        {/* CTA */}
        <button
          onClick={() => navigate(userId ? '/add-listing' : '/register')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: '#ADEBB3',
            color: '#000000',
            fontSize: '13px', fontWeight: '700',
            border: 'none',
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          <Plus style={{ width: '13px', height: '13px' }} />
          {t('browse.nav.publish')}
        </button>

        {/* Airbnb-style profile menu pill — authenticated only */}
        {userId && (
          <div style={{ display: 'flex', alignItems: 'center', borderRadius: '999px', border: '1px solid #e5e7eb', background: '#ffffff', flexShrink: 0, overflow: 'hidden' }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={t('browse.nav.profileMenu')}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '8px 8px 8px 14px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Menu style={{ width: '16px', height: '16px', color: '#1a1a1a' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} style={{
                backgroundColor: '#ffffff', border: '1px solid #e5e7eb',
                borderRadius: '12px', padding: '6px', minWidth: '200px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                zIndex: 9999,
              }}>
                <DropdownMenuItem asChild>
                  <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#1f2937', textDecoration: 'none', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}>
                    <User style={{ width: '15px', height: '15px' }} /> {t('browse.nav.profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile?tab=likes" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#1f2937', textDecoration: 'none', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}>
                    <Heart style={{ width: '15px', height: '15px' }} /> {t('browse.nav.favorites')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/messages" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#1f2937', textDecoration: 'none', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}>
                    <MessageSquare style={{ width: '15px', height: '15px' }} /> {t('browse.nav.messages')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#1f2937', textDecoration: 'none', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}>
                    <LayoutDashboard style={{ width: '15px', height: '15px' }} /> {t('browse.nav.dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#ef4444', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                >
                  <LogOut style={{ width: '15px', height: '15px' }} /> {t('browse.nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', padding: '5px 6px', textDecoration: 'none' }}>
              <span style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: '#4B3FD8', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '600', fontFamily: "'Inter', sans-serif",
              }}>
                {initials}
              </span>
            </Link>
          </div>
        )}
        </div>
      </header>

      {/* ── Main content ── */}
      {/* Wrapper centers the capped <main> via flexbox. mx-auto can't be used here:
          the global `* { margin: 0 }` reset (index.css) overrides margin-inline:auto. */}
      <div className={isMapView ? 'contents' : 'flex justify-center'}>
      <main className={isMapView ? '' : 'w-full max-w-7xl px-6 lg:px-12 pt-7 lg:pt-9 pb-20'}>

        {isMapView ? (
          <Suspense fallback={
            <div style={{
              height: 'calc(100vh - 76px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#F7F7EC',
            }}>
              <span style={{ color: '#717182', fontFamily: "'Inter',sans-serif", fontSize: '14px' }}>
                {t('browse.nav.loadingMap')}
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
                {t('browse.results', { count: filteredProperties.length })}
              </p>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredProperties.length === 0 ? (
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
                  {t('browse.empty.title')}
                </p>
                <p style={{ fontSize: '13px', color: '#717182' }}>
                  {t('browse.empty.subtitle')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredProperties.map(listing => (
                  <ListingCard key={listing.id} listing={listing} navigate={navigate} userId={userId} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      </div>

      <style>{`
        header input::placeholder { color: rgba(255,255,255,0.40); }

        /* ── Header layout: desktop base (lg+) — reproduces the original single row ──
           Header padding lives here (not inline) so the phone media query can shrink it;
           the desktop value (10px 32px) is unchanged. */
        .browse-hdr { padding: 10px 32px; }
        .browse-hdr .hdr-cluster { display: flex; align-items: center; gap: 16px; }
        .browse-hdr .filterbar-slot { flex: 1; min-width: 0; }

        /* ── Header layout: phone (below lg) — search pill on top, controls beneath ──
           DOM order is unchanged; only phone reorders via flex order. Logo + language
           are hidden below lg (they remain in the desktop base, which has no query). */
        @media (max-width: 1023px) {
          header.browse-hdr { padding: 10px 14px; }
          header.browse-hdr .hdr-logo { display: none; }
          header.browse-hdr .filterbar-slot { order: 1; flex: 0 0 100%; width: 100%; }
          header.browse-hdr .fb-root { width: 100%; }
          header.browse-hdr .hdr-cluster { order: 2; flex: 0 0 100%; width: 100%; justify-content: center; gap: 10px; }
        }
      `}</style>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={activeFilters}
        onChange={patchFilters}
        wilayas={WILAYAS}
        minDate={new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate())}
        maxDate={new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate())}
        locale={i18n.language === 'en' ? enUS : fr}
      />
    </div>
  )
}
