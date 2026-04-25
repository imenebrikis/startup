import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Phone, Edit, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [initials, setInitials] = useState('?')
  const [activeTab, setActiveTab] = useState('Mes échanges')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/'); return }
      setUser(user)
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0]
      if (fullName) {
        setInitials(fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2))
      }
    })
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  // Helper styles
  const card = { background: '#F7F7EC', borderRadius: '16px', padding: '32px' }
  const label = { fontSize: '13px', fontWeight: '600', color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }
  const muted = { fontSize: '13px', color: '#717182', fontFamily: "'Inter', sans-serif" }

  const MOCK_EXCHANGES = [
    { id: 1, initial: 'F', title: 'Studio près de la plage', location: 'Béjaïa', date: 'Juillet 2026', status: 'Confirmé' },
    { id: 2, initial: 'K', title: 'Maison familiale', location: 'Constantine', date: 'Juin 2026', status: 'En attente' },
  ]

  const MOCK_REVIEWS = [
    { id: 1, initial: 'F', name: 'Fatima Z.', date: 'Mars 2026', rating: 5, comment: 'Excellent échange! Logement conforme et hôte très accueillant.' },
    { id: 2, initial: 'Y', name: 'Yacine K.', date: 'Février 2026', rating: 4, comment: 'Très bon séjour, appartement propre et bien situé.' },
  ]

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
            justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '14px',
          }}>
            {initials}
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main style={{ padding: '48px 24px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '32px', fontWeight: '700', color: '#1a1a1a',
            marginBottom: '6px'
          }}>
            Mon profil
          </h1>
          <p style={{ ...muted, fontSize: '14px' }}>
            Gérez vos informations personnelles
          </p>
        </div>

        {/* ── Top Profile Card ── */}
        <div style={{ ...card, marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{
                width: '80px', height: '80px', background: '#4B3FD8',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '28px',
                flexShrink: 0
              }}>
                {initials !== '?' ? initials : 'AK'}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '20px', fontWeight: '700', color: '#1a1a1a',
                  marginBottom: '8px', margin: 0
                }}>
                  {user?.user_metadata?.full_name || 'Ahmed Kaddour'}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#717182' }}>
                    <MapPin style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Alger, Hydra</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#717182' }}>
                    <Phone style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>+213 555 123 456</span>
                  </div>
                </div>
              </div>
            </div>

            <button style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '999px', border: 'none',
              background: '#4B3FD8', color: '#fff', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              transition: 'background 0.2s'
            }}>
              <Edit style={{ width: '14px', height: '14px' }} />
              Modifier
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '32px 0' }} />

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '28px', fontWeight: '700', color: '#0A3D3D' }}>
                2
              </div>
              <div style={{ fontSize: '13px', color: '#717182', marginTop: '4px' }}>
                Annonces actives
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '28px', fontWeight: '700', color: '#0A3D3D' }}>
                5
              </div>
              <div style={{ fontSize: '13px', color: '#717182', marginTop: '4px' }}>
                Échanges réalisés
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '28px', fontWeight: '700', color: '#0A3D3D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                4.8 <Star style={{ width: '20px', height: '20px', color: '#F59E0B', fill: '#F59E0B', position: 'relative', top: '-2px' }} />
              </div>
              <div style={{ fontSize: '13px', color: '#717182', marginTop: '4px' }}>
                Note moyenne
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Content Card ── */}
        <div style={{ ...card }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px', gap: '24px' }}>
            {['Mes annonces', 'Mes échanges', 'Avis reçus'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0 0 12px 0', border: 'none', background: 'none',
                  fontSize: '14px', fontWeight: activeTab === tab ? '600' : '500',
                  color: activeTab === tab ? '#4B3FD8' : '#717182',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  borderBottom: activeTab === tab ? '2px solid #4B3FD8' : '2px solid transparent',
                  marginBottom: '-1px'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {activeTab === 'Mes annonces' && (
              <p style={{ ...muted, textAlign: 'center', padding: '32px 0' }}>Aucune annonce active.</p>
            )}

            {activeTab === 'Mes échanges' && MOCK_EXCHANGES.map(exchange => (
              <div key={exchange.id} style={{
                background: '#ffffff', borderRadius: '16px', padding: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px', height: '40px', background: '#0A3D3D',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: '600', fontSize: '14px', flexShrink: 0
                  }}>
                    {exchange.initial}
                  </div>
                  <div>
                    <h3 style={{ ...label, fontSize: '14px', margin: '0 0 4px 0' }}>{exchange.title}</h3>
                    <p style={{ ...muted, fontSize: '12px', margin: 0 }}>{exchange.location} • {exchange.date}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {exchange.status === 'Confirmé' ? (
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>Confirmé</span>
                  ) : (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>En attente</span>
                  )}
                  <button style={{
                    padding: '8px 16px', borderRadius: '999px', border: '1.5px solid #4B3FD8',
                    background: 'transparent', color: '#4B3FD8', fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: "'Inter', sans-serif"
                  }}>
                    Détails
                  </button>
                </div>
              </div>
            ))}

            {activeTab === 'Avis reçus' && MOCK_REVIEWS.map(review => (
              <div key={review.id} style={{
                background: '#ffffff', borderRadius: '16px', padding: '24px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', background: '#0A3D3D',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: '600', fontSize: '14px', flexShrink: 0
                    }}>
                      {review.initial}
                    </div>
                    <div>
                      <h3 style={{ ...label, fontSize: '14px', margin: '0 0 2px 0' }}>{review.name}</h3>
                      <p style={{ ...muted, fontSize: '12px', margin: 0 }}>{review.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} style={{
                        width: '14px', height: '14px',
                        color: i < review.rating ? '#F59E0B' : '#d1d5db',
                        fill: i < review.rating ? '#F59E0B' : 'none'
                      }} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5, margin: 0 }}>
                  {review.comment}
                </p>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
