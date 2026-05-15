import { MapContainer, TileLayer, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { WILAYA_COORDS } from '../data/wilaya-coords'

export default function NeighborhoodMap({ listing }) {
  let lat = Number(listing?.latitude)
  let lng = Number(listing?.longitude)

  if (!listing?.latitude || !listing?.longitude || isNaN(lat) || isNaN(lng)) {
    const fallback = WILAYA_COORDS[listing?.wilaya]
    if (!fallback) return null
    ;[lat, lng] = fallback
  }

  return (
    <div>
      {/* ── Map box ── */}
      <div style={{ position: 'relative', height: '240px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          dragging={false}
          keyboard={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <Circle
            center={[lat, lng]}
            radius={500}
            pathOptions={{
              color: '#0A3D3D',
              fillColor: '#0A3D3D',
              fillOpacity: 0.2,
              weight: 1.5,
              opacity: 0.6,
            }}
          />
        </MapContainer>

        {/* Expand icon — top right, like SeLoger */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 500,
          width: '30px', height: '30px',
          background: 'rgba(255,255,255,0.92)',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 5px rgba(0,0,0,0.15)',
          cursor: 'default',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </div>
      </div>

      {/* ── Privacy text — below the map, like SeLoger ── */}
      <p style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#717182',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.5,
        margin: '10px 0 0 0',
      }}>
        L'adresse exacte n'est pas communiquée pour protéger la vie privée.
      </p>
    </div>
  )
}
