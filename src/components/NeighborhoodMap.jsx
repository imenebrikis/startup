import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { WILAYA_COORDS } from "../data/wilaya-coords";

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

const circleStyle = {
  color: "#0A3D3D",
  fillColor: "#0A3D3D",
  fillOpacity: 0.18,
  weight: 1.5,
  opacity: 0.65,
};

export default function NeighborhoodMap({ listing }) {
  const [open, setOpen] = useState(false);

  let lat = Number(listing?.latitude);
  let lng = Number(listing?.longitude);

  if (!listing?.latitude || !listing?.longitude || isNaN(lat) || isNaN(lng)) {
    const fallback = WILAYA_COORDS[listing?.wilaya];
    if (!fallback) return null;
    [lat, lng] = fallback;
  }

  const center = [lat, lng];

  return (
    <div>
      {/* ── Small preview map ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        style={{
          position: "relative", height: "240px", borderRadius: "14px",
          overflow: "hidden", border: "1px solid #e5e7eb", cursor: "pointer",
          isolation: "isolate",
        }}
      >
        <MapContainer
          center={center}
          zoom={14}
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          dragging={false}
          keyboard={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%", pointerEvents: "none" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <Circle center={center} radius={400} pathOptions={circleStyle} />
        </MapContainer>

        {/* Expand hint */}
        <div style={{
          position: "absolute", top: "10px", right: "10px", zIndex: 500,
          width: "32px", height: "32px",
          background: "rgba(255,255,255,0.92)", borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 5px rgba(0,0,0,0.15)",
        }}>
          <Maximize2 style={{ width: "14px", height: "14px", color: "#1a1a1a" }} />
        </div>
      </div>

      <p style={{
        fontSize: "12px", color: "#717182",
        fontFamily: "'Inter', sans-serif", lineHeight: 1.5,
        margin: "10px 0 0 0",
      }}>
        L'adresse exacte n'est pas communiquée pour protéger la vie privée.
      </p>

      {/* ── Full interactive dialog map ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-none gap-0 p-0 overflow-hidden"
          style={{ width: "min(92vw, 960px)" }}
        >
          <DialogTitle
            style={{
              position: "absolute", top: "14px", left: "18px", zIndex: 500,
              fontSize: "14px", fontWeight: "600", color: "#1a1a1a",
              fontFamily: "'Inter', sans-serif", margin: 0,
              background: "rgba(255,255,255,0.9)", padding: "4px 10px",
              borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            }}
          >
            Carte du quartier
          </DialogTitle>

          <div style={{ height: "72vh" }}>
            {open && (
              <MapContainer
                key={`dialog-${lat}-${lng}`}
                center={center}
                zoom={15}
                scrollWheelZoom
                dragging
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  subdomains="abcd"
                />
                <Circle center={center} radius={400} pathOptions={circleStyle} />
                <InvalidateOnMount />
              </MapContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
