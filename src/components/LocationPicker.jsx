import { useCallback, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default icon asset resolution in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ── Constants ─────────────────────────────────────────────────────────────────

const ALGERIA_BOUNDS = [
  [18.9, -8.7], // SW
  [39.5, 12.0], // NE — extended north into Mediterranean for search bar dead space
];

const CIRCLE_STYLE = {
  color: "#00a699",
  fillColor: "#00a699",
  fillOpacity: 0.3,
  weight: 2,
  opacity: 0.7,
};

// ── Jitter ────────────────────────────────────────────────────────────────────

// Obfuscate exact coordinates by ±~250 m before persisting
function applyJitter(lat, lng) {
  return [
    lat + (Math.random() - 0.5) * 0.004,
    lng + (Math.random() - 0.5) * 0.005,
  ];
}

// ── Inner components (must be children of MapContainer) ───────────────────────

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      const [jLat, jLng] = applyJitter(e.latlng.lat, e.latlng.lng);
      onPick(jLat, jLng);
    },
  });
  return null;
}

// Invalidates map size after the expand/collapse CSS transition finishes (250ms + buffer)
function MapResizer({ expanded }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [expanded, map]);
  return null;
}

function SearchBox({ onPick }) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  // Prevent map click from firing when the user clicks the search overlay
  const containerRef = useCallback((node) => {
    if (node) L.DomEvent.disableClickPropagation(node);
  }, []);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setNotice("");
    setResults([]);
    try {
      const params = new URLSearchParams({
        q,
        format: "json",
        limit: "6",
        countrycodes: "dz",
        viewbox: "-9,37.5,12,19",
        bounded: "1",
        addressdetails: "1",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "Accept-Language": "fr" } },
      );
      const data = await res.json();
      if (data.length === 0)
        setNotice("Aucun résultat. Cliquez directement sur la carte.");
      else setResults(data);
    } catch {
      setNotice("Erreur réseau. Cliquez directement sur la carte.");
    } finally {
      setLoading(false);
    }
  }

  function select(r) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    // Fly to exact searched location for visual clarity
    map.flyTo([lat, lng], 14, { duration: 1 });
    // Store jittered coordinates to protect exact address
    const [jLat, jLng] = applyJitter(lat, lng);
    onPick(jLat, jLng);
    setQuery(r.display_name.split(",")[0]);
    setResults([]);
    setNotice("");
  }

  function clear() {
    setResults([]);
    setNotice("");
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "91.666%",
        maxWidth: 440,
      }}
    >
      {/* Input row */}
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) clear();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
              if (e.key === "Escape") clear();
            }}
            placeholder="Rechercher une adresse en Algérie…"
            style={{
              width: "100%",
              padding: "9px 34px 9px 13px",
              borderRadius: 10,
              border: "1px solid #E5DFCE",
              fontSize: 13,
              fontFamily: "inherit",
              background: "#FFFFFF",
              outline: "none",
              color: "#0F2A2A",
              boxSizing: "border-box",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                clear();
              }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6E7B79",
                padding: 2,
                lineHeight: 1,
              }}
              aria-label="Effacer"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading || !query.trim()}
          style={{
            padding: "9px 15px",
            borderRadius: 10,
            border: "none",
            background: loading || !query.trim() ? "#9CA3AF" : "#005B5B",
            color: "#ADEBB3",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !query.trim() ? "default" : "pointer",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            transition: "background 0.15s",
          }}
        >
          {loading ? "…" : "Chercher"}
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div
          style={{
            marginTop: 4,
            padding: "8px 12px",
            background: "#FFFFFF",
            borderRadius: 8,
            fontSize: 12,
            color: "#6E7B79",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {notice}
        </div>
      )}

      {/* Results dropdown */}
      {results.length > 0 && (
        <div
          style={{
            marginTop: 4,
            background: "#FFFFFF",
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.16)",
            border: "1px solid #E5DFCE",
            overflow: "hidden",
          }}
        >
          {results.map((r, i) => {
            const parts = r.display_name.split(",");
            const name = parts[0].trim();
            const sub = parts.slice(1, 3).join(",").trim();
            return (
              <button
                key={r.place_id}
                type="button"
                onClick={() => select(r)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  border: "none",
                  borderBottom:
                    i < results.length - 1 ? "1px solid #F3EEE0" : "none",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#F3EEE0")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#005B5B"
                    strokeWidth="2"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#0F2A2A" }}
                  >
                    {name}
                  </span>
                </span>
                {sub && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#6E7B79",
                      marginTop: 2,
                      display: "block",
                      paddingLeft: 20,
                    }}
                  >
                    {sub}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Public component ───────────────────────────────────────────────────────────

export default function LocationPicker({ lat, lng, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const mapHeight = expanded ? 520 : 320;

  return (
    <div>
      {/* Click-to-drop hint */}
      <p
        style={{
          fontSize: 12,
          color: "#6E7B79",
          margin: "0 0 6px",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00a699"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Recherchez une adresse ou cliquez directement sur la carte pour placer
        la zone.
      </p>

      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid #E5DFCE",
          height: mapHeight,
          position: "relative",
          transition: "height 0.25s ease",
        }}
      >
        <MapContainer
          center={[34.0, 3.0]}
          zoom={5}
          minZoom={5}
          style={{ height: "100%", width: "100%" }}
          maxBounds={ALGERIA_BOUNDS}
          maxBoundsViscosity={1.0}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <ZoomControl position="bottomright" />
          <SearchBox onPick={onChange} />
          <ClickHandler onPick={onChange} />
          <MapResizer expanded={expanded} />
          {lat != null && lng != null && (
            <Circle
              center={[lat, lng]}
              radius={400}
              pathOptions={CIRCLE_STYLE}
            />
          )}
        </MapContainer>

        {/* Fullscreen toggle — positioned over the map */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Réduire la carte" : "Agrandir la carte"}
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            zIndex: 1001,
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          {expanded ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F2A2A"
              strokeWidth="2"
            >
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="10" y1="14" x2="3" y2="21" />
              <line x1="21" y1="3" x2="14" y2="10" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F2A2A"
              strokeWidth="2"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
      </div>

      <p style={{ fontSize: 12, color: "#6E7B79", margin: "8px 0 0" }}>
        Votre adresse exacte restera privée. Les voyageurs ne verront que cette
        zone de 400 m.
      </p>
    </div>
  );
}
