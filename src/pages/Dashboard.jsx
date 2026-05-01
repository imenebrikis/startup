import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, List, Repeat, MessageSquare, User, Plus, Clock, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ listings: 0, exchanges: 0, messages: 0 })
  const [activity, setActivity] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const navigate = useNavigate()

  const fetchDashboardData = async (userId) => {
    try {
      const { count: listingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const { count: exchangesCount } = await supabase
        .from('exchange_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)

      setStats({
        listings: listingsCount || 0,
        exchanges: exchangesCount || 0,
        messages: messagesCount || 0
      })

      const { data: requests } = await supabase
        .from('exchange_requests')
        .select(`*, listings(title, wilaya, user_id)`)
        .order('created_at', { ascending: false })
        .limit(2)

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false })
        .limit(2)

      const { data: verifiedListings } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(2)

      const activityItems = []

      const timeAgo = (dateStr) => {
        const date = new Date(dateStr)
        const seconds = Math.floor((new Date() - date) / 1000)
        let interval = seconds / 86400
        if (interval >= 1) return `Il y a ${Math.floor(interval)} jour${Math.floor(interval) > 1 ? 's' : ''}`
        interval = seconds / 3600
        if (interval >= 1) return `Il y a ${Math.floor(interval)} heure${Math.floor(interval) > 1 ? 's' : ''}`
        interval = seconds / 60
        if (interval >= 1) return `Il y a ${Math.floor(interval)} minute${Math.floor(interval) > 1 ? 's' : ''}`
        return "À l'instant"
      }

      requests?.forEach(r => {
        if (r.listings) {
          activityItems.push({
            text: "Nouvelle demande d'échange reçue",
            sub: `${r.listings.title} à ${r.listings.wilaya} - ${timeAgo(r.created_at)}`,
            time: new Date(r.created_at)
          })
        }
      })

      messages?.forEach(m => {
        activityItems.push({
          text: "Nouveau message reçu",
          sub: `${timeAgo(m.created_at)}`,
          time: new Date(m.created_at)
        })
      })

      verifiedListings?.forEach(l => {
        activityItems.push({
          text: "Votre annonce a été vérifiée",
          sub: `${l.title} à ${l.wilaya} - ${timeAgo(l.created_at)}`,
          time: new Date(l.created_at)
        })
      })

      activityItems.sort((a, b) => b.time - a.time)
      setActivity(activityItems.slice(0, 4))

    } catch (err) {
      console.error(err)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate('/')
      else {
        setUser(user)
        fetchDashboardData(user.id)
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0].toUpperCase() || '?'

  const firstName = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ')[0]
    : user?.email?.split('@')[0]

  const navLinks = [
    { to: '/browse', icon: <Search className="w-5 h-5" />, label: 'Parcourir' },
  { to: '/profile', icon: <List className="w-5 h-5" />, label: 'Mes annonces' },
    { to: '/my-exchanges', icon: <Repeat className="w-5 h-5" />, label: 'Mes échanges' },
    { to: '/messages', icon: <MessageSquare className="w-5 h-5" />, label: 'Messages' },
    { to: '/profile', icon: <User className="w-5 h-5" />, label: 'Profil' },
  ]

  const cards = [
    { to: '/add-listing', icon: <Plus className="w-6 h-6 text-white" />, title: 'Publier une annonce', sub: 'Listez votre propriété pour échange ou vente' },
    { to: '/browse', icon: <Search className="w-6 h-6 text-white" />, title: 'Parcourir', sub: "Découvrez des propriétés à travers l'Algérie" },
    { to: '/my-exchanges', icon: <Repeat className="w-6 h-6 text-white" />, title: 'Mes échanges', sub: 'Voir et gérer vos échanges' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', sans-serif" }}>

      {/* Navbar */}
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

        {/* Sidebar */}
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
                fontSize: '14px', fontWeight: '500', transition: 'background 0.15s'
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
              <Settings className="w-5 h-5" /> Admin
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: '48px' }}>

          {/* Welcome */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: '36px', fontWeight: '600',
              color: '#1a1a1a', marginBottom: '8px', lineHeight: 1.2
            }}>
              Bienvenue, {firstName}!
            </h1>
            <p style={{ fontSize: '15px', color: '#717182' }}>
              Voici ce qui se passe avec vos échanges
            </p>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px', marginBottom: '40px'
          }}>
            {[
             { label: 'Mes annonces', value: stats.listings, to: '/profile' },
              { label: 'Échanges en attente', value: stats.exchanges, to: '/my-exchanges' },
              { label: 'Messages', value: stats.messages, to: '/messages' },
            ].map(({ label, value, to }) => (
              <Link key={to} to={to} style={{
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: '16px', padding: '24px',
                textDecoration: 'none', color: '#1a1a1a', transition: 'box-shadow 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '32px', fontWeight: '700',
                  color: '#0A3D3D', marginBottom: '4px'
                }}>
                  {value}
                </div>
                <div style={{ fontSize: '13px', color: '#717182' }}>{label}</div>
              </Link>
            ))}
          </div>

          {/* Quick action cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px', marginBottom: '40px'
          }}>
            {cards.map(({ to, icon, title, sub }) => (
              <Link key={to} to={to} style={{
                background: '#F7F7EC', borderRadius: '20px', padding: '32px',
                textDecoration: 'none', color: '#1a1a1a',
                display: 'block', transition: 'box-shadow 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{
                  width: '48px', height: '48px', background: '#4B3FD8',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '20px'
                }}>
                  {icon}
                </div>
                <h3 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '18px', fontWeight: '600', marginBottom: '8px'
                }}>
                  {title}
                </h3>
                <p style={{ fontSize: '13px', color: '#717182', lineHeight: 1.5 }}>
                  {sub}
                </p>
              </Link>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{ background: '#F7F7EC', borderRadius: '20px', padding: '32px' }}>
            <h2 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: '22px', fontWeight: '600',
              marginBottom: '24px', color: '#1a1a1a'
            }}>
              Activité récente
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingData ? (
                <p style={{ fontSize: '14px', color: '#717182' }}>Chargement...</p>
              ) : activity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#717182' }}>
                  <p style={{ fontSize: '15px' }}>Aucune activité récente</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    Commencez par publier une annonce !
                  </p>
                </div>
              ) : (
                activity.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    background: '#ffffff', borderRadius: '14px', padding: '16px 20px'
                  }}>
                    <div style={{
                      width: '42px', height: '42px', background: '#0A3D3D',
                      borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0
                    }}>
                      <Clock style={{ width: '18px', height: '18px', color: '#ffffff' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '3px' }}>
                        {item.text}
                      </p>
                      <p style={{ fontSize: '13px', color: '#717182' }}>{item.sub}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}