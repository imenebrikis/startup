import { MapContainer, TileLayer, Marker, Circle, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const ALGERIA_BOUNDS = [[18.96, -8.67], [41.0, 11.98]]
const ALGERIA_CENTER = [28.0, 2.6]

function MapSettings() {
  const map = useMap()
  useEffect(() => { map.options.closePopupOnClick = false }, [map])
  return null
}

function ZoomTracker({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

function createPinIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:38px;height:38px;
      background:#1a1a1a;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,0.30);
      border:2.5px solid #ffffff;
    ">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"/>
      </svg>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -10],
  })
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount()
  const size = count >= 20 ? 52 : count >= 10 ? 46 : 40
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:#1a1a1a;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 16px rgba(0,0,0,0.35);
      border:3px solid #ffffff;
      font-family:'Inter',sans-serif;
      font-size:${count >= 10 ? 14 : 13}px;
      font-weight:700;
      color:#ffffff;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function PopupContent({ listing, navigate }) {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", width: '180px', padding: '2px' }}>
      {listing.images?.[0] && (
        <img
          src={listing.images[0]}
          alt={listing.title}
          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px', display: 'block' }}
        />
      )}
      <p style={{ fontWeight: '700', margin: '0 0 3px', fontSize: '13px', color: '#1a1a1a', lineHeight: 1.3 }}>
        {listing.title || listing.wilaya}
      </p>
      <p style={{ color: '#717182', fontSize: '11px', margin: '0 0 8px' }}>
        {[listing.wilaya, listing.city || listing.quartier].filter(Boolean).join(', ')}
      </p>
      {listing.is_for_sale && listing.price && (
        <p style={{ color: '#4B3FD8', fontWeight: '700', fontSize: '12px', margin: '0 0 10px' }}>
          {new Intl.NumberFormat('fr-DZ').format(listing.price)} DZD
        </p>
      )}
      <button
        onClick={() => navigate(`/listing/${listing.id}`)}
        style={{
          width: '100%', padding: '8px 0', border: 'none',
          borderRadius: '999px', background: '#004949', color: '#fff',
          fontSize: '12px', fontWeight: '600', cursor: 'pointer',
          fontFamily: "'Inter',sans-serif",
        }}
      >
        Voir les détails
      </button>
    </div>
  )
}

export default function MapView({ listings }) {
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(6)

  const valid = listings.filter(l => {
    const lat = Number(l.latitude)
    const lng = Number(l.longitude)
    return l.latitude && l.longitude && !isNaN(lat) && !isNaN(lng)
  })

  return (
    <div style={{ height: 'calc(100vh - 122px)', width: '100%', position: 'relative' }}>
      <MapContainer
        center={ALGERIA_CENTER}
        zoom={6}
        minZoom={6}
        maxZoom={16}
        maxBounds={ALGERIA_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapSettings />
        <ZoomTracker onZoom={setZoom} />
        <ZoomControl position="bottomright" />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {zoom >= 13 ? (
          valid.map(listing => (
            <Circle
              key={listing.id}
              center={[Number(listing.latitude), Number(listing.longitude)]}
              radius={500}
              pathOptions={{ color: '#0A3D3D', fillColor: '#0A3D3D', fillOpacity: 0.20, weight: 2, opacity: 0.65 }}
            >
              <Popup autoClose={false} closeOnClick={false}>
                <PopupContent listing={listing} navigate={navigate} />
              </Popup>
            </Circle>
          ))
        ) : (
          <MarkerClusterGroup
            iconCreateFunction={createClusterIcon}
            maxClusterRadius={60}
            chunkedLoading
            showCoverageOnHover={false}
            zoomToBoundsOnClick
          >
            {valid.map(listing => (
              <Marker
                key={listing.id}
                position={[Number(listing.latitude), Number(listing.longitude)]}
                icon={createPinIcon()}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <PopupContent listing={listing} navigate={navigate} />
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>

      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.14) !important;
          padding: 0 !important;
          border: none !important;
        }
        .leaflet-popup-content { margin: 12px !important; }
        .leaflet-popup-tip { box-shadow: none !important; }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12) !important;
          border-radius: 10px !important;
          overflow: hidden;
          margin-bottom: 24px !important;
          margin-right: 14px !important;
        }
        .leaflet-control-zoom a {
          width: 36px !important; height: 36px !important;
          line-height: 36px !important; font-size: 16px !important;
          color: #1a1a1a !important; background: #fff !important;
        }
        .leaflet-control-zoom a:hover { background: #f4f4f4 !important; }
        .leaflet-cluster-anim .leaflet-marker-icon,
        .leaflet-cluster-anim .leaflet-marker-shadow {
          transition: transform 0.3s ease-out, opacity 0.3s ease-in;
        }
      `}</style>
    </div>
  )
}
