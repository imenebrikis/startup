import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, memo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ALGERIA_BOUNDS = [
  [18.96, -8.67],
  [41.0, 11.98],
];
const ALGERIA_CENTER = [28.0, 2.6];

// ── Stable icon instances (created once, reused across all renders) ──

const PIN_ICON = L.divIcon({
  className: "",
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
});

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count >= 20 ? 52 : count >= 10 ? 46 : 40;
  return L.divIcon({
    className: "",
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
  });
}

// ── Small map-internal components ──

function MapSettings() {
  const map = useMap();
  useEffect(() => {
    if (map && map.options) {
      map.options.closePopupOnClick = false;
    }
  }, [map]);
  return null;
}

function ZoomTracker({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

// Leaflet caches the container's pixel size at init. When the map mounts into a
// freshly-sized container (List→Map toggle) or the container resizes (window
// resize, phone rotation, or a header-height change that shifts our height calc),
// we must tell Leaflet to re-measure or tiles render gray/misaligned.
function InvalidateOnMount({ headerHeight }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 60);
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [map, headerHeight]);
  return null;
}

// Auto-frame the whole country to the actual screen on mount, instead of a
// fixed zoom that only looks right on wide screens.
function FitAlgeriaOnMount() {
  const map = useMap();
  useEffect(() => {
    const fit = () => map.fitBounds(ALGERIA_BOUNDS, { padding: [10, 10] });
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [map]);
  return null;
}

// ── Memoized popup to prevent re-render when parent zoom state changes ──

const PopupContent = memo(function PopupContent({ listing, navigate }) {
  return (
    <div
      style={{
        fontFamily: "'Inter',sans-serif",
        width: "180px",
        padding: "2px",
      }}
    >
      {listing.images?.[0] && (
        <img
          src={listing.images[0]}
          alt={listing.title}
          loading="lazy"
          style={{
            width: "100%",
            height: "100px",
            objectFit: "cover",
            borderRadius: "10px",
            marginBottom: "10px",
            display: "block",
          }}
        />
      )}
      <p
        style={{
          fontWeight: "700",
          margin: "0 0 3px",
          fontSize: "13px",
          color: "#1a1a1a",
          lineHeight: 1.3,
        }}
      >
        {listing.title || listing.wilaya}
      </p>
      <p style={{ color: "#717182", fontSize: "11px", margin: "0 0 8px" }}>
        {[listing.wilaya, listing.city || listing.quartier]
          .filter(Boolean)
          .join(", ")}
      </p>
      {listing.is_for_sale && listing.price && (
        <p
          style={{
            color: "#4B3FD8",
            fontWeight: "700",
            fontSize: "12px",
            margin: "0 0 10px",
          }}
        >
          {new Intl.NumberFormat("fr-DZ").format(listing.price)} DZD
        </p>
      )}
      <button
        onClick={() => navigate(`/listing/${listing.id}`)}
        style={{
          width: "100%",
          padding: "8px 0",
          border: "none",
          borderRadius: "999px",
          background: "#004949",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
          fontFamily: "'Inter',sans-serif",
        }}
      >
        Voir les détails
      </button>
    </div>
  );
});

// ── Stable style objects (created once, never cause re-renders) ──

const MAP_STYLE = { height: "100%", width: "100%" };

const CIRCLE_PATH_OPTIONS = {
  color: "#0A3D3D",
  fillColor: "#0A3D3D",
  fillOpacity: 0.2,
  weight: 2,
  opacity: 0.65,
};

// ── Main component ──

export default function MapView({ listings, headerHeight = 76 }) {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(6);

  // Memoize: parse coordinates & filter once when listings change.
  // This prevents re-running Number() conversions + validity checks on every
  // render (zoom change, popup open, etc.) which was blocking the main thread.
  const valid = useMemo(() => {
    return listings
      .map((l) => {
        const lat = Number(l.latitude);
        const lng = Number(l.longitude);
        if (!l.latitude || !l.longitude || isNaN(lat) || isNaN(lng))
          return null;
        // Pre-compute the position array so Marker/Circle get a stable reference
        return { ...l, _pos: [lat, lng] };
      })
      .filter(Boolean);
  }, [listings]);

  // Stable callback so ZoomTracker doesn't re-render from a new function ref
  const handleZoom = useCallback((z) => setZoom(z), []);

  const containerStyle = useMemo(
    () => ({
      height: `calc(100vh - ${headerHeight}px)`,
      width: "100%",
      position: "relative",
    }),
    [headerHeight]
  );

  return (
    <div style={containerStyle}>
      <MapContainer
        center={ALGERIA_CENTER}
        zoom={6}
        minZoom={3}
        maxZoom={16}
        maxBounds={ALGERIA_BOUNDS}
        maxBoundsViscosity={1.0}
        style={MAP_STYLE}
        zoomControl={false}
        preferCanvas={true}
      >
        <MapSettings />
        <InvalidateOnMount headerHeight={headerHeight} />
        <FitAlgeriaOnMount />
        <ZoomTracker onZoom={handleZoom} />
        <ZoomControl position="bottomright" />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          keepBuffer={6}
          updateWhenIdle={false}
          updateWhenZooming={false}
          loading="lazy"
        />

        {zoom >= 13 ? (
          valid.map((listing) => (
            <Circle
              key={listing.id}
              center={listing._pos}
              radius={500}
              pathOptions={CIRCLE_PATH_OPTIONS}
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
            chunkDelay={50}
            chunkInterval={100}
          >
            {valid.map((listing) => (
              <Marker
                key={listing.id}
                position={listing._pos}
                icon={PIN_ICON}
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
  );
}
