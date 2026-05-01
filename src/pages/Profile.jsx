import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, List, Repeat, MessageSquare, User, Settings, MapPin, Phone, Mail, Edit2, Save, X, Calendar, Bed, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra',
  'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret',
  'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda',
  'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem',
  "M'Sila", 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi',
  'Bordj Bou Arreridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt',
  'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla',
  'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane', 'Timimoun',
  'Bordj Badji Mokhtar', 'Ouled Djellal', 'Béni Abbès', 'In Salah',
  'In Guezzam', 'Touggourt', 'Djanet', "El M'Ghair", 'El Menia', 'Aflou',
  'Barika', 'Ksar Chellala', 'Messaad', 'Aïn Oussera', 'Bou Saâda',
  'El Abiodh Sidi Cheikh', 'El Kantara', 'Bir El Ater', 'Ksar El Boukhari', 'El Aricha'
]

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ listings: 0, exchanges: 0, sales: 0 })
  const [activeTab, setActiveTab] = useState('annonces')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', wilaya: '', quartier: '', phone: '' })
  const [listings, setListings] = useState([])
  const [exchanges, setExchanges] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    
    setUser(user)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData || {})
    setEditForm({
      full_name: profileData?.full_name || user.user_metadata?.full_name || '',
      wilaya: profileData?.wilaya || '',
      quartier: profileData?.quartier || '',
      phone: profileData?.phone || ''
    })

    const { count: listingsCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_verified', true)

    const { count: exchangesCount } = await supabase
      .from('exchange_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .eq('status', 'accepted')

    const { count: salesCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_for_sale', true)
      .eq('is_verified', true)

    setStats({ listings: listingsCount || 0, exchanges: exchangesCount || 0, sales: salesCount || 0 })

    const { data: listingsData } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setListings(listingsData || [])

    const { data: exchangesData } = await supabase
      .from('exchange_requests')
      .select('*, listings(title, wilaya, city, images), profiles!requester_id(full_name)')
      .or(`requester_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    setExchanges(exchangesData || [])

    const userListingIds = listingsData?.map(l => l.id) || []
    if (userListingIds.length > 0) {
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles!reviewer_id(full_name), listings(title)')
        .in('listing_id', userListingIds)
        .order('created_at', { ascending: false })
      setReviews(reviewsData || [])
    }

    setLoading(false)
  }

  const handleSave = async () => {
    await supabase
      .from('profiles')
      .update(editForm)
      .eq('id', user.id)
    setIsEditing(false)
    fetchData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const initials = (editForm.full_name || user?.email?.[0] || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const navLinks = [
    { to: '/browse', icon: <Search className="w-5 h-5" />, label: 'Parcourir' },
    { to: '/profile', icon: <List className="w-5 h-5" />, label: 'Mes annonces' },
    { to: '/my-exchanges', icon: <Repeat className="w-5 h-5" />, label: 'Mes échanges' },
    { to: '/messages', icon: <MessageSquare className="w-5 h-5" />, label: 'Messages' },
    { to: '/profile', icon: <User className="w-5 h-5" />, label: 'Profil' },
  ]

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>Chargement...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', sans-serif" }}>
      <nav style={{
        borderBottom: '1px solid #e5e7eb', background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 10,
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Link to="/dashboard" style={{
          fontSize: '22px', fontWeight: '700', color: '#0A3D3D',
          textDecoration: 'none', fontFamily: "'Bricolage Grotesque', sans-serif"
        }}>
          DarBelDar
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={handleLogout} style={{
            fontSize: '13px', color: '#717182',
            background: 'none', border: 'none', cursor: 'pointer'
          }}>
            Déconnexion
          </button>
          <div style={{
            width: '40px', height: '40px', background: '#4B3FD8',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '14px'
          }}>
            {initials}
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex' }}>
        <aside style={{
          width: '256px', borderRight: '1px solid #e5e7eb',
          minHeight: 'calc(100vh - 64px)', background: '#ffffff',
          flexShrink: 0, padding: '24px 16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navLinks.map(({ to, icon, label }) => (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '12px',
                color: '#374151', textDecoration: 'none',
                fontSize: '14px', fontWeight: '500'
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#F7F7EC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {icon} {label}
              </Link>
            ))}
            <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
            <Link to="/admin" style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '12px',
              color: '#374151', textDecoration: 'none',
              fontSize: '14px', fontWeight: '500'
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F7EC'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
    
            </Link>
          </div>
        </aside>

        <main style={{ flex: 1, padding: '48px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: '36px', fontWeight: '600',
              color: '#1a1a1a', marginBottom: '8px'
            }}>
              Mon profil
            </h1>
            <p style={{ fontSize: '15px', color: '#717182' }}>
              Gérez vos informations personnelles
            </p>
          </div>

          <div style={{
            background: '#fff', borderRadius: '20px',
            border: '1px solid #e5e7eb', padding: '32px', marginBottom: '32px',
            position: 'relative'
          }}>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} style={{
                position: 'absolute', top: '24px', right: '24px',
                padding: '8px 16px', borderRadius: '100px',
                border: '1.5px solid #4B3FD8', background: '#fff',
                color: '#4B3FD8', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <Edit2 style={{ width: '14px', height: '14px' }} /> Modifier
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px', height: '80px', background: '#0A3D3D',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontWeight: '700',
                fontSize: '28px', marginBottom: '16px'
              }}>
                {initials}
              </div>

              {isEditing ? (
                <div style={{ width: '100%', maxWidth: '400px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #e5e7eb', fontSize: '14px'
                      }}
                      placeholder="Nom complet"
                      value={editForm.full_name}
                      onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <select
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #e5e7eb', fontSize: '14px'
                      }}
                      value={editForm.wilaya}
                      onChange={e => setEditForm({ ...editForm, wilaya: e.target.value })}
                    >
                      <option value="">Sélectionner wilaya</option>
                      {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #e5e7eb', fontSize: '14px'
                      }}
                      placeholder="Quartier"
                      value={editForm.quartier}
                      onChange={e => setEditForm({ ...editForm, quartier: e.target.value })}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #e5e7eb', fontSize: '14px'
                      }}
                      placeholder="Téléphone"
                      value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleSave} style={{
                      flex: 1, padding: '10px', borderRadius: '100px',
                      background: '#4B3FD8', color: '#fff', border: 'none',
                      fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                      <Save style={{ width: '14px', height: '14px' }} /> Sauvegarder
                    </button>
                    <button onClick={() => setIsEditing(false)} style={{
                      flex: 1, padding: '10px', borderRadius: '100px',
                      background: '#fff', color: '#717182', border: '1.5px solid #e5e7eb',
                      fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                      <X style={{ width: '14px', height: '14px' }} /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: '24px', fontWeight: '600', marginBottom: '8px'
                  }}>
                    {editForm.full_name || 'Utilisateur'}
                  </div>
                  {(profile?.wilaya || profile?.quartier) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B3FD8', fontSize: '14px', marginBottom: '4px' }}>
                      <MapPin style={{ width: '16px', height: '16px' }} />
                      {profile.wilaya}{profile.quartier ? `, ${profile.quartier}` : ''}
                    </div>
                  )}
                  {profile?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#717182', fontSize: '14px', marginBottom: '4px' }}>
                      <Phone style={{ width: '16px', height: '16px' }} />
                      {profile.phone}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#717182', fontSize: '13px' }}>
                    <Mail style={{ width: '14px', height: '14px' }} />
                    {user?.email}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
              {[
                { label: 'Annonces actives', value: stats.listings },
                { label: 'Échanges réalisés', value: stats.exchanges },
                { label: 'Ventes réalisées', value: stats.sales },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#F7F7EC', borderRadius: '16px', padding: '20px', textAlign: 'center'
                }}>
                  <div style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: '32px', fontWeight: '700', color: '#0A3D3D', marginBottom: '4px'
                  }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '13px', color: '#717182' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '32px' }}>
              {[
                { id: 'annonces', label: 'Mes annonces' },
                { id: 'exchanges', label: 'Mes échanges' },
                { id: 'reviews', label: 'Avis reçus' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    padding: '12px 0', background: 'none', border: 'none',
                    fontSize: '15px', fontWeight: activeTab === id ? '600' : '400',
                    color: activeTab === id ? '#4B3FD8' : '#717182',
                    borderBottom: activeTab === id ? '2px solid #4B3FD8' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'annonces' && (
            <div>
              {listings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#717182' }}>
                  <p style={{ marginBottom: '16px' }}>Aucune annonce publiée</p>
                  <Link to="/add-listing" style={{
                    display: 'inline-block', padding: '12px 24px', background: '#4B3FD8',
                    color: '#fff', borderRadius: '100px', textDecoration: 'none', fontSize: '14px', fontWeight: '500'
                  }}>
                    Publier une annonce
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                  {listings.map(listing => (
                    <div key={listing.id} style={{
                      background: '#fff', borderRadius: '20px', border: '1px solid #e5e7eb',
                      overflow: 'hidden', cursor: 'pointer'
                    }}>
                      <div style={{ height: '180px', background: '#f3f4f6', position: 'relative' }}>
                        {listing.images?.[0] && (
                          <img src={listing.images[0]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        <div style={{
                          position: 'absolute', top: '12px', right: '12px',
                          background: listing.is_verified ? '#10B981' : '#F59E0B',
                          color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: '500'
                        }}>
                          {listing.is_verified ? 'Vérifié' : 'En attente'}
                        </div>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <h3 style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                          fontSize: '16px', fontWeight: '600', marginBottom: '8px'
                        }}>
                          {listing.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B3FD8', marginBottom: '4px' }}>
                          <MapPin style={{ width: '14px', height: '14px' }} />
                          {listing.wilaya}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#717182', marginBottom: '8px' }}>
                          <Bed style={{ width: '14px', height: '14px' }} />
                          {listing.rooms} chambres
                        </div>
                        <div style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: '100px',
                          background: listing.is_for_exchange ? '#0A3D3D' : '#4B3FD8',
                          color: '#fff', fontSize: '11px', fontWeight: '500'
                        }}>
                          {listing.is_for_exchange && listing.is_for_sale ? 'Échange & Vente' : listing.is_for_sale ? 'Vente' : 'Échange'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'exchanges' && (
            <div>
              {exchanges.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#717182' }}>
                  Aucun échange pour le moment
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {exchanges.map(exchange => (
                    <div key={exchange.id} style={{
                      background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb',
                      padding: '16px', display: 'flex', alignItems: 'center', gap: '16px'
                    }}>
                      <div style={{
                        width: '48px', height: '48px', background: '#0A3D3D',
                        borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '16px'
                      }}>
                        {exchange.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>{exchange.listings?.title}</div>
                        <div style={{ fontSize: '13px', color: '#717182' }}>
                          {exchange.listings?.wilaya} • {new Date(exchange.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div style={{
                        padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: '500',
                        background: exchange.status === 'accepted' ? '#D1FAE5' : exchange.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                        color: exchange.status === 'accepted' ? '#065F46' : exchange.status === 'pending' ? '#92400E' : '#991B1B'
                      }}>
                        {exchange.status === 'accepted' ? 'Accepté' : exchange.status === 'pending' ? 'En attente' : 'Refusé'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              {reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#717182' }}>
                  Aucun avis reçu
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reviews.map(review => (
                    <div key={review.id} style={{
                      background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', background: '#0A3D3D',
                          borderRadius: '50%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '14px'
                        }}>
                          {review.profiles?.full_name?.[0] || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>{review.profiles?.full_name || 'Utilisateur'}</div>
                          <div style={{ fontSize: '12px', color: '#717182' }}>
                            {review.listings?.title} • {new Date(review.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              style={{
                                width: '16px', height: '16px',
                                fill: star <= review.rating ? '#F59E0B' : 'none',
                                stroke: star <= review.rating ? '#F59E0B' : '#D1D5DB'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}