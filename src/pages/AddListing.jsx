import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload, X, Lock, Wind, Thermometer, Wifi, Droplets, Flame, Zap, Car, Trees, Waves, UtensilsCrossed, WashingMachine, ArrowUpDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

const AMENITIES = [
  { name: 'Climatisation',      Icon: Wind },
  { name: 'Chauffage',          Icon: Thermometer },
  { name: 'Wifi',               Icon: Wifi },
  { name: "Citerne d'eau",      Icon: Droplets },
  { name: 'Chauffe-eau',        Icon: Flame },
  { name: 'Groupe électrogène', Icon: Zap },
  { name: 'Parking / Garage',   Icon: Car },
  { name: 'Jardin / Terrasse',  Icon: Trees },
  { name: 'Piscine',            Icon: Waves },
  { name: 'Cuisine équipée',    Icon: UtensilsCrossed },
  { name: 'Machine à laver',    Icon: WashingMachine },
  { name: 'Ascenseur',          Icon: ArrowUpDown },
]

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1.5px solid #e5e7eb',
  fontSize: '14px',
  color: '#1a1a1a',
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif",
  transition: 'border-color 0.2s',
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '6px',
  fontFamily: "'Inter', sans-serif",
}

const helperStyle = {
  fontSize: '12px',
  color: '#717182',
  marginTop: '5px',
  fontFamily: "'Inter', sans-serif",
}

export default function AddListing() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [user, setUser] = useState(null)
  const [initials, setInitials] = useState('?')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [city, setCity] = useState('')
  const [quartier, setQuartier] = useState('')
  const [address, setAddress] = useState('')
  const [rooms, setRooms] = useState('')
  const [type, setType] = useState('exchange')
  const [price, setPrice] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [photos, setPhotos] = useState([])
  const [previews, setPreviews] = useState([])

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [amenities, setAmenities] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/')
      } else {
        setUser(user)
        const fullName = user.user_metadata?.full_name
        if (fullName) {
          setInitials(fullName.split(' ').map(n => n[0]).join('').toUpperCase())
        } else if (user.email) {
          setInitials(user.email[0].toUpperCase())
        }
      }
    })
  }, [navigate])

  const handleFiles = (files) => {
    const accepted = Array.from(files).slice(0, 5 - photos.length)
    if (accepted.length === 0) return
    const newPhotos = [...photos, ...accepted].slice(0, 5)
    setPhotos(newPhotos)
    const newPreviews = newPhotos.map(f => URL.createObjectURL(f))
    setPreviews(newPreviews)
  }

  const removePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index)
    setPhotos(updated)
    setPreviews(updated.map(f => URL.createObjectURL(f)))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { navigate('/'); return }

      // Upload photos
      const imageUrls = []
      for (const photo of photos) {
        const ext = photo.name.split('.').pop()
        const path = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(path, photo, { contentType: photo.type })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('listings').getPublicUrl(path)
        imageUrls.push(urlData.publicUrl)
      }

      // Insert listing
      const { error: insertError } = await supabase.from('listings').insert({
        user_id: currentUser.id,
        title,
        description,
        wilaya,
        city,
        quartier,
        address,
        rooms: parseInt(rooms),
        is_for_exchange: type === 'exchange' || type === 'both',
        is_for_sale: type === 'sale' || type === 'both',
        price: (type === 'sale' || type === 'both') ? parseFloat(price) : null,
        available_from: availableFrom || null,
        available_to: availableTo || null,
        images: imageUrls,
        amenities,
        is_verified: false,
      })

      if (insertError) throw insertError

      setSuccess(true)
    setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const typeOptions = [
    { value: 'exchange', label: 'Pour échange' },
    { value: 'sale', label: 'Pour vente' },
    { value: 'both', label: 'Les deux' },
  ]

  const showPrice = type === 'sale' || type === 'both'

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
          flexShrink: 0,
        }}>
          {initials}
        </div>
      </nav>

      {/* ── Page content ── */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '34px', fontWeight: '700',
            color: '#1a1a1a', marginBottom: '10px', lineHeight: 1.2,
          }}>
            Publier une annonce
          </h1>
          <p style={{ fontSize: '15px', color: '#4B3FD8', fontWeight: '500' }}>
            Partagez votre propriété avec la communauté DarBelDar
          </p>
        </div>

        {/* Alerts */}
        {success && (
          <div style={{
            background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '12px',
            padding: '16px 20px', marginBottom: '24px', color: '#065f46',
            fontSize: '14px', fontWeight: '500',
          }}>
            ✅ Votre annonce a été soumise et est en attente de vérification !
          </div>
        )}
        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '12px',
            padding: '16px 20px', marginBottom: '24px', color: '#991b1b',
            fontSize: '14px', fontWeight: '500',
          }}>
            ❌ {error}
          </div>
        )}

        {/* ── Form card ── */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: '#F7F7EC', borderRadius: '20px',
            padding: '32px', marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* 1. Titre */}
              <div>
                <label style={labelStyle}>Titre de l'annonce *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="ex: Appartement moderne au centre-ville"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* 2. Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Décrivez votre propriété en détail..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* 3. Wilaya + Ville */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Wilaya</label>
                  <select
                    value={wilaya}
                    onChange={e => setWilaya(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
                    onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">Sélectionner...</option>
                    {WILAYAS.map((w, i) => (
                      <option key={w} value={w}>{String(i + 1).padStart(2, '0')} — {w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Nom de la ville"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              {/* 4. Quartier */}
              <div>
                <label style={labelStyle}>Quartier / Commune</label>
                <input
                  type="text"
                  value={quartier}
                  onChange={e => setQuartier(e.target.value)}
                  placeholder="ex: Bir Mourad Raïs, Hydra, Bab Ezzouar..."
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <p style={helperStyle}>Ce quartier sera visible publiquement</p>
              </div>

              {/* 5. Adresse */}
              <div>
                <label style={labelStyle}>Adresse complète</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="ex: 12 Rue des Frères Bouadou..."
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <p style={{ ...helperStyle, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Lock style={{ width: '12px', height: '12px' }} />
                  Adresse privée — jamais montrée aux autres utilisateurs
                </p>
              </div>

              {/* 6. Chambres */}
              <div>
                <label style={labelStyle}>Nombre de chambres *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={rooms}
                  onChange={e => setRooms(e.target.value)}
                  placeholder="ex: 3"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* 6b. Équipements */}
              <div>
                <label style={labelStyle}>Équipements</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                }}>
                  {AMENITIES.map(({ name, Icon }) => {
                    const selected = amenities.includes(name)
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setAmenities(prev =>
                          prev.includes(name)
                            ? prev.filter(a => a !== name)
                            : [...prev, name]
                        )}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '14px 8px',
                          borderRadius: '14px',
                          border: selected ? '2px solid #4B3FD8' : '1.5px solid #e5e7eb',
                          background: selected ? '#F5F3FF' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.18s',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <Icon style={{ width: '22px', height: '22px', color: '#4B3FD8' }} />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: selected ? '600' : '500',
                          color: selected ? '#4B3FD8' : '#374151',
                          textAlign: 'center',
                          lineHeight: 1.3,
                        }}>{name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 7. Type d'annonce */}
              <div>
                <label style={labelStyle}>Type d'annonce</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {typeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '999px',
                        border: type === opt.value ? '1.5px solid #0A3D3D' : '1.5px solid #d1d5db',
                        background: type === opt.value ? '#0A3D3D' : '#ffffff',
                        color: type === opt.value ? '#ffffff' : '#374151',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.18s',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8. Prix (conditional) */}
              {showPrice && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <label style={labelStyle}>Prix (DZD) *</label>
                  <input
                    required={showPrice}
                    type="number"
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="ex: 15 000 000"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              )}

              {/* 9. Disponibilité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Disponible à partir du</label>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={e => setAvailableFrom(e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Jusqu'au</label>
                  <input
                    type="date"
                    value={availableTo}
                    onChange={e => setAvailableTo(e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#4B3FD8'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              {/* 10. Photos */}
              <div>
                <label style={labelStyle}>Photos du logement</label>

                {/* Drop zone */}
                <div
                  onClick={() => photos.length < 5 && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragOver ? '#4B3FD8' : '#c4c4d4'}`,
                    borderRadius: '14px',
                    padding: '36px 24px',
                    textAlign: 'center',
                    cursor: photos.length < 5 ? 'pointer' : 'default',
                    background: dragOver ? '#f0eeff' : '#ffffff',
                    transition: 'all 0.2s',
                    opacity: photos.length >= 5 ? 0.5 : 1,
                  }}
                >
                  <Upload style={{
                    width: '32px', height: '32px',
                    color: '#4B3FD8', margin: '0 auto 12px',
                  }} />
                  <p style={{ fontSize: '14px', color: '#4B3FD8', fontWeight: '500', marginBottom: '4px' }}>
                    Cliquez pour télécharger ou glissez-déposez
                  </p>
                  <p style={{ fontSize: '12px', color: '#717182' }}>
                    PNG, JPG jusqu'à 10MB (5 photos max)
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg"
                  style={{ display: 'none' }}
                  onChange={e => handleFiles(e.target.files)}
                />

                {/* Previews */}
                {previews.length > 0 && (
                  <div style={{
                    display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px',
                  }}>
                    {previews.map((src, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img
                          src={src}
                          alt={`Photo ${i + 1}`}
                          style={{
                            width: '80px', height: '80px',
                            objectFit: 'cover', borderRadius: '10px',
                            border: '1.5px solid #e5e7eb',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          style={{
                            position: 'absolute', top: '-6px', right: '-6px',
                            width: '20px', height: '20px',
                            background: '#ef4444', borderRadius: '50%',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          <X style={{ width: '11px', height: '11px', color: '#fff' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Action buttons (outside card) ── */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link
              to="/dashboard"
              style={{
                padding: '13px 32px',
                borderRadius: '999px',
                border: '1.5px solid #d1d5db',
                background: 'transparent',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'border-color 0.2s, color 0.2s',
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0A3D3D'; e.currentTarget.style.color = '#0A3D3D' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151' }}
            >
              Annuler
            </Link>

            <button
              type="submit"
              disabled={loading || success}
              style={{
                padding: '13px 32px',
                borderRadius: '999px',
                border: 'none',
                background: loading || success ? '#9ca3af' : '#4B3FD8',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || success ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, transform 0.15s',
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => { if (!loading && !success) e.currentTarget.style.background = '#3d33b5' }}
              onMouseLeave={e => { if (!loading && !success) e.currentTarget.style.background = '#4B3FD8' }}
            >
              {loading ? 'Envoi en cours...' : 'Soumettre pour vérification'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
