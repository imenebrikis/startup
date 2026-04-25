import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Bed, Calendar, SlidersHorizontal, Home } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Constants ───────────────────────────────────────────────────────────────

const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', "M'Sila", 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
  'Illizi', 'Bordj Bou Arreridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued',
  'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal', 'Béni Abbès',
  'In Salah', 'In Guezzam', 'Touggourt', 'Djanet', "El M'Ghair", 'El Meniaa', 'Aflou',
  'Barika', 'Ksar Chellala', 'Messaad', 'Aïn Oussera', 'Bou Saâda', 'El Abiodh Sidi Cheikh',
  'El Kantara', 'Bir El Ater', 'Ksar El Boukhari', 'El Aricha',
]

const MONTHS_FR = [
  'jan', 'fév', 'mar', 'avr', 'mai', 'juin',
  'juil', 'août', 'sep', 'oct', 'nov', 'déc',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

function formatPrice(price) {
  if (!price) return null
  return new Intl.NumberFormat('fr-DZ').format(price) + ' DZD'
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const selectStyle = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1.5px solid #e5e7eb',
  fontSize: '13px',
  color: '#1a1a1a',
  background: '#ffffff',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  minWidth: '160px',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: '#ffffff', borderRadius: '16px',
      border: '1px solid #e5e7eb', overflow: 'hidden',
    }}>
      <div style={{
        height: '200px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[80, 60, 45].map((w, i) => (
          <div key={i} style={{
            height: '12px', width: `${w}%`,
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        ))}
        <div style={{
          height: '36px', borderRadius: '999px', marginTop: '8px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }} />
      </div>
    </div>
  )
}

function TypeBadge({ listing }) {
  const { is_for_exchange, is_for_sale } = listing
  if (is_for_exchange && is_for_sale) {
    return (
      <span style={{
        position: 'absolute', top: '10px', right: '10px',
        background: 'linear-gradient(135deg, #0A3D3D, #4B3FD8)',
        color: '#fff', fontSize: '11px', fontWeight: '600',
        padding: '3px 10px', borderRadius: '999px',
        fontFamily: "'Inter', sans-serif",
      }}>
        Échange &amp; Vente
      </span>
    )
  }
  if (is_for_exchange) {
    return (
      <span style={{
        position: 'absolute', top: '10px', right: '10px',
        background: '#0A3D3D', color: '#fff',
        fontSize: '11px', fontWeight: '600',
        padding: '3px 10px', borderRadius: '999px',
        fontFamily: "'Inter', sans-serif",
      }}>
        Échange
      </span>
    )
  }
  return (
    <span style={{
      position: 'absolute', top: '10px', right: '10px',
      background: '#4B3FD8', color: '#fff',
      fontSize: '11px', fontWeight: '600',
      padding: '3px 10px', borderRadius: '999px',
      fontFamily: "'Inter', sans-serif",
    }}>
      Vente
    </span>
  )
}

function ListingCard({ listing, navigate }) {
  const [hovered, setHovered] = useState(false)
  const photo = listing.images?.[0]
  const from = formatDate(listing.available_from)
  const to = formatDate(listing.available_to)
  const location = [listing.wilaya, listing.quartier || listing.city].filter(Boolean).join(', ')

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        transition: 'box-shadow 0.22s, transform 0.22s',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
      }}
    >
      {/* Photo */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {photo ? (
          <img
            src={photo}
            alt={listing.title}
            style={{
              width: '100%', height: '200px',
              objectFit: 'cover', display: 'block',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '200px',
            background: '#F7F7EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Home style={{ width: '40px', height: '40px', color: '#c4c4d4' }} />
          </div>
        )}
        <TypeBadge listing={listing} />
      </div>

      {/* Body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <h3 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '16px', fontWeight: '700',
          color: '#1a1a1a', lineHeight: 1.3,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {listing.title}
        </h3>

        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MapPin style={{ width: '13px', height: '13px', color: '#4B3FD8', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#4B3FD8', fontWeight: '500' }}>{location}</span>
          </div>
        )}

        {listing.rooms && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Bed style={{ width: '13px', height: '13px', color: '#717182', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#717182' }}>{listing.rooms} chambre{listing.rooms > 1 ? 's' : ''}</span>
          </div>
        )}

        {(from || to) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar style={{ width: '13px', height: '13px', color: '#717182', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#717182' }}>
              {from && to ? `${from} – ${to}` : from || to}
            </span>
          </div>
        )}

        {listing.is_for_sale && listing.price && (
          <p style={{
            fontSize: '14px', fontWeight: '700',
            color: '#4B3FD8', margin: 0, marginTop: '2px',
          }}>
            {formatPrice(listing.price)}
          </p>
        )}

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <button
          onClick={() => navigate(`/listing/${listing.id}`)}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '10px',
            borderRadius: '999px',
            border: '1.5px solid #4B3FD8',
            background: hovered ? '#4B3FD8' : 'transparent',
            color: hovered ? '#ffffff' : '#4B3FD8',
            fontSize: '13px',
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Browse() {
  const navigate = useNavigate()
  const [initials, setInitials] = useState('?')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  // filters
  const [filterWilaya, setFilterWilaya] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterRooms, setFilterRooms] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // auth + fetch
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/'); return }
      const fullName = user.user_metadata?.full_name
      if (fullName) setInitials(fullName.split(' ').map(n => n[0]).join('').toUpperCase())
      else if (user.email) setInitials(user.email[0].toUpperCase())
    })

    supabase
      .from('listings')
      .select('*')
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setListings(data || [])
        setLoading(false)
      })
  }, [navigate])

  // client-side filtering
  const filtered = useMemo(() => {
    return listings.filter(l => {
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
  }, [listings, filterWilaya, filterType, filterRooms, filterDate])

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav style={{
        borderBottom: '1px solid #e5e7eb', background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 10,
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/dashboard" style={{
          fontSize: '22px', fontWeight: '700', color: '#0A3D3D',
          textDecoration: 'none', fontFamily: "'Bricolage Grotesque', sans-serif",
        }}>
          DarBelDar
        </Link>
        <div style={{
          width: '40px', height: '40px', background: '#4B3FD8',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '14px',
        }}>
          {initials}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main style={{ padding: '48px 48px 80px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '34px', fontWeight: '700',
            color: '#1a1a1a', marginBottom: '8px', lineHeight: 1.2,
          }}>
            Parcourir les logements
          </h1>
          <p style={{ fontSize: '15px', color: '#4B3FD8', fontWeight: '500' }}>
            Découvrez des propriétés dans les 69 wilayas
          </p>
        </div>

        {/* ── Filters bar ── */}
        <div style={{
          background: '#F7F7EC', borderRadius: '16px',
          padding: '24px', marginBottom: '32px',
        }}>
          {/* Header row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal style={{ width: '16px', height: '16px', color: '#1a1a1a' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Filtres</span>
            </div>
            {(filterWilaya || filterType || filterRooms || filterDate) && (
              <button
                onClick={() => { setFilterWilaya(''); setFilterType(''); setFilterRooms(''); setFilterDate('') }}
                style={{
                  padding: '6px 16px', borderRadius: '999px',
                  border: '1.5px solid #d1d5db', background: 'transparent',
                  fontSize: '12px', fontWeight: '600', color: '#717182',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* 4-column equal-width filter grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}>
            {/* Wilaya */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontSize: '12px', fontWeight: '600', color: '#1a1a1a',
                fontFamily: "'Inter', sans-serif",
              }}>Wilaya</label>
              <select
                value={filterWilaya}
                onChange={e => setFilterWilaya(e.target.value)}
                style={{ ...selectStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              >
                <option value="">Toutes les wilayas</option>
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            {/* Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontSize: '12px', fontWeight: '600', color: '#1a1a1a',
                fontFamily: "'Inter', sans-serif",
              }}>Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{ ...selectStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              >
                <option value="">Tous</option>
                <option value="exchange">Échange</option>
                <option value="sale">Vente</option>
                <option value="both">Échange &amp; Vente</option>
              </select>
            </div>

            {/* Chambres */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontSize: '12px', fontWeight: '600', color: '#1a1a1a',
                fontFamily: "'Inter', sans-serif",
              }}>Chambres</label>
              <select
                value={filterRooms}
                onChange={e => setFilterRooms(e.target.value)}
                style={{ ...selectStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              >
                <option value="">Toutes</option>
                {['1', '2', '3', '4', '5+'].map(r => (
                  <option key={r} value={r}>{r} {r === '1' ? 'chambre' : 'chambres'}</option>
                ))}
              </select>
            </div>

            {/* Dates disponibles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontSize: '12px', fontWeight: '600', color: '#1a1a1a',
                fontFamily: "'Inter', sans-serif",
              }}>Dates disponibles</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                style={{ ...selectStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p style={{ fontSize: '13px', color: '#717182', marginBottom: '24px' }}>
            {filtered.length} logement{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div style={{
            textAlign: 'center', padding: '80px 24px',
          }}>
            <div style={{
              width: '72px', height: '72px', background: '#F7F7EC',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Home style={{ width: '32px', height: '32px', color: '#c4c4d4' }} />
            </div>
            <p style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px',
            }}>
              Aucun logement trouvé
            </p>
            <p style={{ fontSize: '14px', color: '#717182' }}>
              Essayez de modifier vos filtres
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} navigate={navigate} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 900px) {
          main { padding: 32px 24px 60px !important; }
        }
      `}</style>
    </div>
  )
}
