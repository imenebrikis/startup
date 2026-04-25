import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, MapPin, BedDouble, Calendar, Home,
  Wind, Thermometer, Wifi, Droplets, Flame, Zap, Car, Trees,
  Waves, UtensilsCrossed, WashingMachine, ArrowUpDown, Star, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Amenity icon map ────────────────────────────────────────────────────────
const AMENITY_ICONS = {
  'Climatisation': Wind, 'Chauffage': Thermometer, 'Wifi': Wifi,
  "Citerne d'eau": Droplets, 'Chauffe-eau': Flame, 'Groupe électrogène': Zap,
  'Parking / Garage': Car, 'Jardin / Terrasse': Trees, 'Piscine': Waves,
  'Cuisine équipée': UtensilsCrossed, 'Machine à laver': WashingMachine,
  'Ascenseur': ArrowUpDown,
}

const MONTHS_FR = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc']
const fmtDate = s => { if (!s) return null; const d = new Date(s); return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}` }
const fmtPrice = p => p ? new Intl.NumberFormat('fr-DZ').format(p) + ' DZD' : null
const initFrom = name => name ? name.split(' ').map(n=>n[0]).join('').toUpperCase() : '?'

// ── Shared styles ────────────────────────────────────────────────────────────
const card = { background:'#ffffff', borderRadius:'16px', border:'1px solid #e5e7eb', padding:'24px' }
const muted = { fontSize:'13px', color:'#717182', fontFamily:"'Inter',sans-serif" }
const label = { fontSize:'13px', fontWeight:'600', color:'#1a1a1a', fontFamily:"'Inter',sans-serif" }

// ── Star component ────────────────────────────────────────────────────────────
function Stars({ rating, max = 5, onClick, hoveredStar, setHoveredStar }) {
  return (
    <div style={{ display:'flex', gap:'2px' }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = onClick ? i < (hoveredStar ?? rating) : i < rating
        return (
          <Star
            key={i}
            onClick={() => onClick?.(i + 1)}
            onMouseEnter={() => setHoveredStar?.(i + 1)}
            onMouseLeave={() => setHoveredStar?.(null)}
            style={{
              width:'16px', height:'16px', cursor: onClick ? 'pointer' : 'default',
              color: filled ? '#F59E0B' : '#d1d5db',
              fill: filled ? '#F59E0B' : 'none',
              transition:'color 0.12s',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', radius = 8 }) {
  return <div style={{
    height: h, width: w, borderRadius: radius,
    background:'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
    backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite',
  }} />
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [initials, setInitials] = useState('?')
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('description')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // reviews
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(null)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // exchange
  const [exchangeSent, setExchangeSent] = useState(false)
  const [exchangeLoading, setExchangeLoading] = useState(false)

  // fetch listing + auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/'); return }
      setUser(user)
      const fn = user.user_metadata?.full_name
      setInitials(fn ? fn.split(' ').map(n=>n[0]).join('').toUpperCase() : user.email?.[0]?.toUpperCase() || '?')
    })

    supabase
      .from('listings')
      .select('*, profiles(full_name, wilaya, created_at, avatar_url)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setListing(data); setLoading(false) })
  }, [id, navigate])

  const fetchReviews = () =>
    supabase.from('reviews')
      .select('*, profiles(full_name, avatar_url)')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []))

  useEffect(() => { fetchReviews() }, [id])

  // photo nav
  const photos = listing?.images || []
  const prevPhoto = () => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)
  const nextPhoto = () => setPhotoIdx(i => (i + 1) % photos.length)

  // exchange request
  const handleExchange = async () => {
    if (!user) return
    setExchangeLoading(true)
    await supabase.from('exchange_requests').insert({
      requester_id: user.id, listing_id: id,
      status: 'pending', created_at: new Date(),
    })
    setExchangeLoading(false)
    setExchangeSent(true)
  }

  // submit review
  const handleReview = async () => {
    if (!rating || !user) return
    setSubmittingReview(true)
    await supabase.from('reviews').insert({
      listing_id: id, reviewer_id: user.id,
      rating, comment, created_at: new Date(),
    })
    setRating(0); setComment(''); setSubmittingReview(false)
    fetchReviews()
  }

  const isOwner = user && listing && user.id === listing.user_id

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#ffffff', fontFamily:"'Inter',sans-serif" }}>

      {/* Navbar */}
      <nav style={{
        borderBottom:'1px solid #e5e7eb', background:'#ffffff',
        position:'sticky', top:0, zIndex:10,
        padding:'0 32px', height:'64px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <Link to="/dashboard" style={{
          fontSize:'22px', fontWeight:'700', color:'#0A3D3D',
          textDecoration:'none', fontFamily:"'Bricolage Grotesque',sans-serif",
        }}>DarBelDar</Link>
        <div style={{
          width:'40px', height:'40px', background:'#4B3FD8',
          borderRadius:'50%', display:'flex', alignItems:'center',
          justifyContent:'center', color:'#fff', fontWeight:'600', fontSize:'14px',
        }}>{initials}</div>
      </nav>

      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 32px 80px' }}>

        {/* Back link */}
        <Link to="/browse" style={{
          display:'inline-flex', alignItems:'center', gap:'6px',
          color:'#4B3FD8', fontSize:'14px', fontWeight:'500',
          textDecoration:'none', marginBottom:'24px',
        }}>
          <ChevronLeft style={{ width:'16px', height:'16px' }} />
          Retour aux annonces
        </Link>

        {loading ? (
          /* ── Skeleton ── */
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <Skeleton h={420} radius={16} />
            <Skeleton h={32} w="50%" />
            <Skeleton h={16} w="30%" />
            <Skeleton h={120} />
          </div>
        ) : !listing ? (
          <p style={muted}>Annonce introuvable.</p>
        ) : (
          <>
            {/* ── Photo carousel ── */}
            <div style={{
              position:'relative', borderRadius:'16px', overflow:'hidden',
              height:'420px', background:'#F7F7EC', marginBottom:'32px',
            }}>
              {photos.length > 0 ? (
                <>
                  <img src={photos[photoIdx]} alt="photo"
                    onClick={() => setIsFullscreen(true)}
                    style={{ width:'100%', height:'100%', objectFit:'contain', display:'block', cursor:'pointer', background: '#000' }} />
                  {photos.length > 1 && (
                    <>
                      {/* Arrows */}
                      {[
                        { side:'left', action: prevPhoto, Icon: ChevronLeft },
                        { side:'right', action: nextPhoto, Icon: ChevronRight },
                      ].map(({ side, action, Icon }) => (
                        <button key={side} onClick={action} style={{
                          position:'absolute', top:'50%', [side]:'16px',
                          transform:'translateY(-50%)',
                          width:'40px', height:'40px', borderRadius:'50%',
                          background:'rgba(255,255,255,0.9)', border:'none',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                        }}>
                          <Icon style={{ width:'20px', height:'20px', color:'#1a1a1a' }} />
                        </button>
                      ))}
                      {/* Dots */}
                      <div style={{
                        position:'absolute', bottom:'16px', left:'50%',
                        transform:'translateX(-50%)',
                        display:'flex', gap:'6px',
                      }}>
                        {photos.map((_, i) => (
                          <button key={i} onClick={() => setPhotoIdx(i)} style={{
                            width: i === photoIdx ? '24px' : '8px',
                            height:'8px', borderRadius:'999px', border:'none',
                            background: i === photoIdx ? '#ffffff' : 'rgba(255,255,255,0.5)',
                            cursor:'pointer', transition:'all 0.2s', padding:0,
                          }} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Home style={{ width:'48px', height:'48px', color:'#c4c4d4' }} />
                </div>
              )}
            </div>

            {/* ── Two-column layout ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'32px', alignItems:'start' }}>

              {/* LEFT */}
              <div>
                {/* Title + meta */}
                <h1 style={{
                  fontFamily:"'Bricolage Grotesque',sans-serif",
                  fontSize:'30px', fontWeight:'700',
                  color:'#1a1a1a', marginBottom:'12px', lineHeight:1.25,
                }}>{listing.title}</h1>

                <div style={{ display:'flex', flexWrap:'wrap', gap:'16px', marginBottom:'12px' }}>
                  {listing.wilaya && (
                    <span style={{ display:'flex', alignItems:'center', gap:'5px', ...muted }}>
                      <MapPin style={{ width:'14px', height:'14px', color:'#4B3FD8' }} />
                      {[listing.wilaya, listing.quartier || listing.city].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {listing.rooms && (
                    <span style={{ display:'flex', alignItems:'center', gap:'5px', ...muted }}>
                      <BedDouble style={{ width:'14px', height:'14px' }} />
                      {listing.rooms} chambre{listing.rooms > 1 ? 's' : ''}
                    </span>
                  )}
                  {(listing.available_from || listing.available_to) && (
                    <span style={{ display:'flex', alignItems:'center', gap:'5px', ...muted }}>
                      <Calendar style={{ width:'14px', height:'14px' }} />
                      {[fmtDate(listing.available_from), fmtDate(listing.available_to)].filter(Boolean).join(' – ')}
                    </span>
                  )}
                </div>

                {/* Type badge */}
                <div style={{ marginBottom:'28px' }}>
                  {listing.is_for_exchange && listing.is_for_sale ? (
                    <span style={{ background:'linear-gradient(135deg,#0A3D3D,#4B3FD8)', color:'#fff', fontSize:'12px', fontWeight:'600', padding:'4px 14px', borderRadius:'999px' }}>Échange &amp; Vente</span>
                  ) : listing.is_for_exchange ? (
                    <span style={{ background:'#0A3D3D', color:'#fff', fontSize:'12px', fontWeight:'600', padding:'4px 14px', borderRadius:'999px' }}>Échange</span>
                  ) : (
                    <span style={{ background:'#4B3FD8', color:'#fff', fontSize:'12px', fontWeight:'600', padding:'4px 14px', borderRadius:'999px' }}>Vente</span>
                  )}
                </div>

                {/* Tabs */}
                <div style={{ display:'flex', borderBottom:'2px solid #e5e7eb', marginBottom:'24px', gap:'0' }}>
                  {['description','équipements','carte','avis'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      padding:'10px 20px', border:'none', background:'none',
                      fontSize:'14px', fontWeight: activeTab === tab ? '700' : '500',
                      color: activeTab === tab ? '#4B3FD8' : '#717182',
                      cursor:'pointer', fontFamily:"'Inter',sans-serif",
                      borderBottom: activeTab === tab ? '2px solid #4B3FD8' : '2px solid transparent',
                      marginBottom:'-2px', textTransform:'capitalize',
                    }}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ background:'#F7F7EC', borderRadius:'16px', padding:'24px' }}>

                  {activeTab === 'description' && (
                    <p style={{ fontSize:'15px', color:'#1a1a1a', lineHeight:1.7, margin:0 }}>
                      {listing.description || <span style={muted}>Aucune description fournie.</span>}
                    </p>
                  )}

                  {activeTab === 'équipements' && (
                    listing.amenities?.length > 0 ? (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
                        {listing.amenities.map(name => {
                          const Icon = AMENITY_ICONS[name] || Wifi
                          return (
                            <div key={name} style={{
                              background:'#fff', borderRadius:'12px',
                              border:'1px solid #e5e7eb', padding:'14px 16px',
                              display:'flex', alignItems:'center', gap:'10px',
                            }}>
                              <Icon style={{ width:'18px', height:'18px', color:'#4B3FD8', flexShrink:0 }} />
                              <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1a1a' }}>{name}</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : <p style={muted}>Aucun équipement renseigné.</p>
                  )}

                  {activeTab === 'carte' && (
                    <div style={{
                      height:'300px', borderRadius:'12px', background:'#e8e8e8',
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center', gap:'12px',
                    }}>
                      <MapPin style={{ width:'36px', height:'36px', color:'#4B3FD8' }} />
                      <p style={{ ...label, fontSize:'15px' }}>Carte disponible prochainement</p>
                      <p style={{ ...muted, fontSize:'12px', textAlign:'center', maxWidth:'280px' }}>
                        La localisation exacte est protégée pour la confidentialité
                      </p>
                    </div>
                  )}

                  {activeTab === 'avis' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                      {reviews.length === 0 && (
                        <p style={muted}>Aucun avis pour le moment.</p>
                      )}
                      {reviews.map(r => (
                        <div key={r.id} style={{
                          background:'#fff', borderRadius:'12px',
                          border:'1px solid #e5e7eb', padding:'16px',
                        }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
                            <div style={{
                              width:'36px', height:'36px', background:'#0A3D3D',
                              borderRadius:'50%', display:'flex', alignItems:'center',
                              justifyContent:'center', color:'#fff', fontSize:'13px', fontWeight:'600',
                              flexShrink:0,
                            }}>
                              {initFrom(r.profiles?.full_name)}
                            </div>
                            <div>
                              <p style={{ ...label, marginBottom:'2px' }}>{r.profiles?.full_name || 'Utilisateur'}</p>
                              <Stars rating={r.rating} />
                            </div>
                            <span style={{ ...muted, marginLeft:'auto', fontSize:'12px' }}>
                              {fmtDate(r.created_at)}
                            </span>
                          </div>
                          {r.comment && <p style={{ fontSize:'14px', color:'#1a1a1a', lineHeight:1.6, margin:0 }}>{r.comment}</p>}
                        </div>
                      ))}

                      {/* Add review form — only for non-owners */}
                      {!isOwner && user && (
                        <div style={{
                          background:'#fff', borderRadius:'12px',
                          border:'1px solid #e5e7eb', padding:'20px',
                          marginTop:'8px',
                        }}>
                          <p style={{ ...label, marginBottom:'12px', fontSize:'14px' }}>Laisser un avis</p>
                          <Stars
                            rating={rating}
                            onClick={setRating}
                            hoveredStar={hoveredStar}
                            setHoveredStar={setHoveredStar}
                          />
                          <textarea
                            rows={3}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Partagez votre expérience..."
                            style={{
                              width:'100%', marginTop:'12px', padding:'10px 14px',
                              borderRadius:'10px', border:'1.5px solid #e5e7eb',
                              fontSize:'14px', fontFamily:"'Inter',sans-serif",
                              resize:'vertical', outline:'none', boxSizing:'border-box',
                            }}
                          />
                          <button
                            onClick={handleReview}
                            disabled={!rating || submittingReview}
                            style={{
                              marginTop:'10px', padding:'10px 24px',
                              borderRadius:'999px', border:'none',
                              background: !rating ? '#9ca3af' : '#4B3FD8',
                              color:'#fff', fontSize:'13px', fontWeight:'600',
                              cursor: !rating ? 'not-allowed' : 'pointer',
                              fontFamily:"'Inter',sans-serif",
                            }}
                          >
                            {submittingReview ? 'Publication...' : "Publier l'avis"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — sticky sidebar */}
              <div style={{ position:'sticky', top:'80px', ...card, display:'flex', flexDirection:'column', gap:'20px' }}>

                {/* Exchange button */}
                {listing.is_for_exchange && (
                  exchangeSent ? (
                    <div style={{
                      background:'#d1fae5', border:'1px solid #6ee7b7',
                      borderRadius:'12px', padding:'14px 16px',
                      color:'#065f46', fontSize:'14px', fontWeight:'500',
                    }}>
                      ✅ Demande envoyée avec succès !
                    </div>
                  ) : (
                    <button
                      onClick={handleExchange}
                      disabled={exchangeLoading || isOwner}
                      style={{
                        width:'100%', padding:'13px',
                        borderRadius:'999px', border:'none',
                        background: isOwner ? '#9ca3af' : '#4B3FD8',
                        color:'#fff', fontSize:'14px', fontWeight:'700',
                        cursor: isOwner ? 'not-allowed' : 'pointer',
                        fontFamily:"'Inter',sans-serif",
                        transition:'background 0.18s',
                      }}
                    >
                      {exchangeLoading ? 'Envoi...' : "Demande d'échange"}
                    </button>
                  )
                )}

                {/* Price + contact */}
                {listing.is_for_sale && (
                  <div>
                    {listing.price && (
                      <p style={{
                        fontSize:'22px', fontWeight:'800', color:'#4B3FD8',
                        margin:'0 0 12px', fontFamily:"'Bricolage Grotesque',sans-serif",
                      }}>
                        {fmtPrice(listing.price)}
                      </p>
                    )}
                    <button style={{
                      width:'100%', padding:'13px',
                      borderRadius:'999px', border:'1.5px solid #4B3FD8',
                      background:'transparent', color:'#4B3FD8',
                      fontSize:'14px', fontWeight:'700',
                      cursor:'pointer', fontFamily:"'Inter',sans-serif",
                    }}>
                      Contacter le vendeur
                    </button>
                  </div>
                )}

                <hr style={{ border:'none', borderTop:'1px solid #e5e7eb', margin:0 }} />

                {/* Owner info */}
                <Link to="/profile" style={{ display:'flex', alignItems:'center', gap:'14px', textDecoration:'none', color:'inherit', cursor:'pointer' }}>
                  <div style={{
                    width:'48px', height:'48px', background:'#0A3D3D',
                    borderRadius:'50%', display:'flex', alignItems:'center',
                    justifyContent:'center', color:'#fff', fontWeight:'700',
                    fontSize:'16px', flexShrink:0,
                  }}>
                    {initFrom(listing.profiles?.full_name || (isOwner ? (user?.user_metadata?.full_name || user?.email?.split('@')[0]) : null) || 'Propriétaire')}
                  </div>
                  <div>
                    <p style={{ ...label, fontSize:'14px', marginBottom:'2px' }}>
                      {listing.profiles?.full_name || (isOwner ? (user?.user_metadata?.full_name || user?.email?.split('@')[0]) : null) || 'Propriétaire'}
                    </p>
                    {listing.profiles?.wilaya && (
                      <p style={{ fontSize:'12px', color:'#4B3FD8', fontWeight:'500', marginBottom:'2px' }}>
                        {listing.profiles.wilaya}
                      </p>
                    )}
                    {(listing.profiles?.created_at || (isOwner && user?.created_at)) && (
                      <p style={{ ...muted, fontSize:'11px' }}>
                        Membre depuis {fmtDate(listing.profiles?.created_at || (isOwner ? user?.created_at : null))}
                      </p>
                    )}
                  </div>
                </Link>
              </div>

            </div>
          </>
        )}
      </div>

      {/* ── Fullscreen Modal ── */}
      {isFullscreen && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.9)', zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <button onClick={() => setIsFullscreen(false)} style={{
            position:'absolute', top:'24px', right:'24px',
            background:'rgba(255,255,255,0.1)', border:'none',
            borderRadius:'50%', width:'48px', height:'48px',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', cursor:'pointer', zIndex:101,
          }}>
            <X style={{ width:'24px', height:'24px' }} />
          </button>
          
          <img src={photos[photoIdx]} alt="fullscreen" style={{
            maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain',
          }} />

          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} style={{
                position:'absolute', left:'24px', top:'50%', transform:'translateY(-50%)',
                background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
                width:'48px', height:'48px', borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:101,
              }}>
                <ChevronLeft style={{ width:'24px', height:'24px' }} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} style={{
                position:'absolute', right:'24px', top:'50%', transform:'translateY(-50%)',
                background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
                width:'48px', height:'48px', borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:101,
              }}>
                <ChevronRight style={{ width:'24px', height:'24px' }} />
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
