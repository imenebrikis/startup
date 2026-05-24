import { useCallback, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── helpers ────────────────────────────────────────────────────────────────

function createPickerIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;
      border-radius:50% 50% 50% 0;
      background:#0A3D3D;
      transform:rotate(-45deg);
      border:2px solid #ffffff;
      box-shadow:0 4px 10px rgba(10,61,61,0.35);
      display:flex;align-items:center;justify-content:center;
    "><div style="width:7px;height:7px;border-radius:50%;background:#ADEBB3;transform:rotate(45deg)"></div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

// ── inner components (must be children of MapContainer) ────────────────────

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function SearchBox({ onPick }) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  // Prevent map click from firing when the user interacts with this overlay
  const containerRef = useCallback((node) => {
    if (node) L.DomEvent.disableClickPropagation(node);
  }, []);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setNotice("");
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=dz`,
        { headers: { "Accept-Language": "fr" } },
      );
      const data = await res.json();
      if (data.length === 0) setNotice("Aucun résultat. Essayez un nom de wilaya ou de quartier.");
      else setResults(data);
    } catch {
      setNotice("Erreur de connexion. Vérifiez votre réseau.");
    } finally {
      setLoading(false);
    }
  };

  const select = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    map.flyTo([lat, lng], 14, { duration: 1 });
    onPick(lat, lng);
    setQuery(r.display_name.split(",")[0]);
    setResults([]);
    setNotice("");
  };

  const clear = () => { setResults([]); setNotice(""); };

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 1000 }}
    >
      {/* Input row */}
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (!e.target.value) clear(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } if (e.key === "Escape") clear(); }}
            placeholder="Rechercher une adresse en Algérie…"
            style={{
              width: "100%", padding: "9px 34px 9px 13px", borderRadius: 10,
              border: "1px solid #E5DFCE", fontSize: 13, fontFamily: "inherit",
              background: "#FFFFFF", outline: "none", color: "#0F2A2A",
              boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); clear(); }}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6E7B79", padding: 2, lineHeight: 1 }}
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
            padding: "9px 15px", borderRadius: 10, border: "none",
            background: loading || !query.trim() ? "#6E7B79" : "#005B5B",
            color: "#ADEBB3", fontSize: 13, fontWeight: 600,
            cursor: loading || !query.trim() ? "default" : "pointer",
            flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            transition: "background 0.15s",
          }}
        >
          {loading ? "…" : "Chercher"}
        </button>
      </div>

      {/* Notice (no results / error) */}
      {notice && (
        <div style={{ marginTop: 4, padding: "8px 12px", background: "#FFFFFF", borderRadius: 8, fontSize: 12, color: "#6E7B79", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          {notice}
        </div>
      )}

      {/* Results dropdown */}
      {results.length > 0 && (
        <div style={{ marginTop: 4, background: "#FFFFFF", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.16)", border: "1px solid #E5DFCE", overflow: "hidden" }}>
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
                  display: "block", width: "100%", padding: "10px 14px", textAlign: "left",
                  border: "none", borderBottom: i < results.length - 1 ? "1px solid #F3EEE0" : "none",
                  background: "none", cursor: "pointer", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F3EEE0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#005B5B" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0F2A2A" }}>{name}</span>
                </span>
                {sub && <span style={{ fontSize: 11, color: "#6E7B79", marginTop: 2, display: "block", paddingLeft: 20 }}>{sub}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── public component ───────────────────────────────────────────────────────

export default function LocationPicker({ lat, lng, onChange }) {
  return (
    <div>
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E5DFCE", height: 280, position: "relative" }}>
        <MapContainer
          center={[36.7, 3.2]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <SearchBox onPick={onChange} />
          <ClickHandler onPick={onChange} />
          {lat != null && lng != null && (
            <>
              <Marker position={[lat, lng]} icon={createPickerIcon()} />
              <Circle
                center={[lat, lng]}
                radius={400}
                pathOptions={{ color: "#0A3D3D", fillColor: "#0A3D3D", fillOpacity: 0.12, weight: 2, opacity: 0.7 }}
              />
            </>
          )}
        </MapContainer>
      </div>
      <p style={{ fontSize: 12, color: "#6E7B79", margin: "8px 0 0" }}>
        Votre adresse exacte restera privée. Les voyageurs ne verront que cette zone de 400 m.
      </p>
    </div>
  );
}
