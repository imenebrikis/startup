import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  List,
  Repeat,
  MessageSquare,
  User,
  MapPin,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Loader2,
  Home,
  Send,
  Inbox,
  AlertCircle,
  BedDouble,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MONTHS = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
const fmtDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const initials = (name) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

const STATUS_TINT = {
  pending:  { bg: "#ECFDF5", border: "1px solid #A7F3D0" },
  accepted: { bg: "#ECFDF5", border: "1px solid #A7F3D0" },
  refused:  { bg: "#FEF2F2", border: "1px solid #FECACA" },
};

function StatusBadge({ status }) {
  const map = {
    pending:  { label: "En attente", bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B" },
    accepted: { label: "Accepté",    bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
    refused:  { label: "Refusé",     bg: "#FEE2E2", color: "#991B1B", dot: "#EF4444" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s.bg, color: s.color, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function HouseBox({ house, label, status }) {
  const tint = STATUS_TINT[status] || STATUS_TINT.pending;
  return (
    <div style={{ background: tint.bg, border: tint.border, borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      {house ? (
        <>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {house.title}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
            {house.wilaya && (
              <span style={{ fontSize: 12, color: "#4B3FD8", display: "flex", alignItems: "center", gap: 3 }}>
                <MapPin style={{ width: 11, height: 11 }} />
                {house.wilaya}{house.city ? `, ${house.city}` : ""}
              </span>
            )}
            {house.rooms && (
              <span style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 3 }}>
                <BedDouble style={{ width: 11, height: 11 }} />
                {house.rooms} chambre{house.rooms > 1 ? "s" : ""}
              </span>
            )}
            {(house.available_from || house.available_to) && (
              <span style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 3 }}>
                <Calendar style={{ width: 11, height: 11 }} />
                {[fmtDate(house.available_from), fmtDate(house.available_to)].filter(Boolean).join(" – ")}
              </span>
            )}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "#9CA3AF" }}>Non disponible</p>
      )}
    </div>
  );
}

function MessageBox({ message, label, status }) {
  if (!message) return null;
  const tint = STATUS_TINT[status] || STATUS_TINT.pending;
  return (
    <div style={{ background: tint.bg, border: tint.border, borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

function Avatar({ name, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0A3D3D", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        {initials(name)}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{name || "Utilisateur"}</p>
        {sub && <p style={{ fontSize: 12, color: "#717182" }}>{sub}</p>}
      </div>
    </div>
  );
}

function ExchangeCard({ ex, mode, onAccept, onRefuse, onCancel, actionLoading }) {
  const requested = ex.requested_house;
  const offered = ex.offered_house;
  const senderProfile = ex.sender_profile;
  const receiverProfile = ex.receiver_profile;
  const dateStr = ex.created_at
    ? `Demandé le ${new Date(ex.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  const busy = actionLoading === ex.id;

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <StatusBadge status={ex.status} />
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{dateStr}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: image + listing info + avatar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ borderRadius: 14, overflow: "hidden", height: 220, background: "#F0EFE4", flexShrink: 0 }}>
            {requested?.images?.[0] ? (
              <img src={requested.images[0]} alt={requested.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                <Home style={{ width: 28, height: 28, color: "#c4c4d4" }} />
                <span style={{ fontSize: 11, color: "#c4c4d4" }}>property photo</span>
              </div>
            )}
          </div>
          {requested && (
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {requested.title}
              </p>
              {requested.wilaya && (
                <p style={{ fontSize: 13, color: "#4B3FD8", display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin style={{ width: 12, height: 12 }} />
                  {requested.wilaya}{requested.city ? `, ${requested.city}` : ""}
                </p>
              )}
            </div>
          )}
          <Avatar
            name={mode === "sent" ? receiverProfile?.full_name : senderProfile?.full_name}
            sub={mode === "sent" ? receiverProfile?.wilaya : senderProfile?.wilaya}
          />
        </div>

        {/* Right: house info + message + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <HouseBox
            house={offered}
            label={mode === "sent" ? "Votre logement proposé" : "Votre logement demandé"}
            status={ex.status}
          />
          <MessageBox
            message={ex.message}
            label={mode === "sent" ? "Votre message" : "Message du demandeur"}
            status={ex.status}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
            {mode === "sent" && (
              <>
                <Link
                  to="/messages"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 999, border: "1.5px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                >
                  <MessageSquare style={{ width: 14, height: 14 }} /> Envoyer un message
                </Link>
                {ex.status === "pending" && (
                  <button
                    onClick={() => onCancel(ex.id)}
                    disabled={busy}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 999, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                  >
                    {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <X style={{ width: 14, height: 14 }} />}
                    Annuler la demande
                  </button>
                )}
              </>
            )}

            {mode === "received" && ex.status === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onAccept(ex.id)}
                  disabled={busy}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 999, border: "none", background: "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}
                  Accepter
                </button>
                <button
                  onClick={() => onRefuse(ex.id)}
                  disabled={busy}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 999, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <X style={{ width: 14, height: 14 }} />}
                  Refuser
                </button>
              </div>
            )}

            {mode === "received" && ex.status !== "pending" && (
              <Link
                to="/messages"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 999, border: "1.5px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                <MessageSquare style={{ width: 14, height: 14 }} /> Envoyer un message
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ mode }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 32px", color: "#717182" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        {mode === "sent" ? <Send style={{ width: 28, height: 28, color: "#9CA3AF" }} /> : <Inbox style={{ width: 28, height: 28, color: "#9CA3AF" }} />}
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
        {mode === "sent" ? "Aucune demande envoyée" : "Aucune demande reçue"}
      </p>
      <p style={{ fontSize: 13 }}>
        {mode === "sent" ? "Parcourez les annonces pour proposer un échange." : "Les demandes d'autres utilisateurs apparaîtront ici."}
      </p>
    </div>
  );
}

export default function Exchanges() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("sent");
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [dbError, setDbError] = useState(null);

  const navLinks = [
    { to: "/browse",       icon: <Search className="w-5 h-5" />,       label: "Parcourir" },
    { to: "/profile",      icon: <List className="w-5 h-5" />,         label: "Mes annonces" },
    { to: "/my-exchanges", icon: <Repeat className="w-5 h-5" />,       label: "Mes échanges" },
    { to: "/messages",     icon: <MessageSquare className="w-5 h-5" />, label: "Messages" },
    { to: "/profile",      icon: <User className="w-5 h-5" />,         label: "Profil" },
  ];

  const fetchExchanges = useCallback(async (uid) => {
    setLoading(true);
    setDbError(null);

    const { data: sentData, error: sentError } = await supabase
      .from("exchanges")
      .select(`id, status, message, created_at,
        requested_house:listings!listing_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        offered_house:listings!offered_house_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        receiver_profile:profiles!receiver_id ( full_name, wilaya )`)
      .eq("requester_id", uid)
      .order("created_at", { ascending: false });

    if (sentError) {
      console.error("Error fetching sent:", sentError);
      setDbError(`Sent Query Error: ${sentError.message}`);
    }

    const { data: receivedData, error: receivedError } = await supabase
      .from("exchanges")
      .select(`id, status, message, created_at,
        requested_house:listings!listing_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        offered_house:listings!offered_house_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        sender_profile:profiles!requester_id ( full_name, wilaya )`)
      .eq("receiver_id", uid)
      .order("created_at", { ascending: false });

    if (receivedError) {
      console.error("Error fetching received:", receivedError);
      if (!sentError) setDbError(`Received Query Error: ${receivedError.message}`);
    }

    setSent(sentData || []);
    setReceived(receivedData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/"); return; }
      setUser(user);
      fetchExchanges(user.id);
    });
  }, [navigate, fetchExchanges]);

  const updateStatus = async (id, status) => {
    setActionLoading(id);
    await supabase.from("exchanges").update({ status }).eq("id", id);
    await fetchExchanges(user.id);
    setActionLoading(null);
  };

  const handleAccept = (id) => updateStatus(id, "accepted");
  const handleRefuse = (id) => updateStatus(id, "refused");
  const handleCancel = async (id) => {
    setActionLoading(id);
    await supabase.from("exchanges").delete().eq("id", id);
    await fetchExchanges(user.id);
    setActionLoading(null);
  };

  const current = tab === "sent" ? sent : received;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7EC", fontFamily: "'Inter', sans-serif", display: "flex" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, minHeight: "100vh", background: "#F7F7EC", flexShrink: 0, padding: "28px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <Link
          to="/dashboard"
          style={{ fontSize: 20, fontWeight: 700, color: "#0A3D3D", textDecoration: "none", fontFamily: "'Bricolage Grotesque', sans-serif", padding: "4px 12px", marginBottom: 16, display: "block" }}
        >
          DarBelDar
        </Link>

        {navLinks.map(({ to, icon, label }) => {
          const active = label === "Mes échanges";
          return (
            <Link
              key={label}
              to={to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 16px",
                borderRadius: 12,
                color: active ? "#fff" : "#4B5563",
                background: active ? "#0A3D3D" : "transparent",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
              }}
            >
              {icon} {label}
            </Link>
          );
        })}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "48px 48px 48px 32px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
            Mes échanges
          </h1>
          <p style={{ fontSize: 14, color: "#717182" }}>
            Gérez vos demandes d'échange envoyées et reçues
          </p>
        </div>

        {dbError && (
          <div style={{ background: "#FEE2E2", border: "1px solid #EF4444", color: "#991B1B", padding: 16, borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertCircle style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Database Error:</p>
              <p style={{ fontSize: 13, fontFamily: "monospace" }}>{dbError}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[
            { id: "sent",     label: "Demandes envoyées", icon: <ArrowRight style={{ width: 13, height: 13 }} />, count: sent.length },
            { id: "received", label: "Demandes reçues",   icon: <ArrowLeft  style={{ width: 13, height: 13 }} />, count: received.length },
          ].map(({ id, label, icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 20px",
                borderRadius: 999,
                border: tab === id ? "none" : "1.5px solid #D1D5DB",
                background: tab === id ? "#0A3D3D" : "#fff",
                color: tab === id ? "#fff" : "#6B7280",
                fontSize: 14,
                fontWeight: tab === id ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {icon} {label}
              <span style={{ background: tab === id ? "rgba(255,255,255,0.2)" : "#E5E7EB", color: tab === id ? "#fff" : "#6B7280", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ height: 300, borderRadius: 20, background: "#E9E9DF" }} />
            ))}
          </div>
        ) : current.length === 0 ? (
          <EmptyState mode={tab} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {current.map((ex) => (
              <ExchangeCard
                key={ex.id}
                ex={ex}
                mode={tab}
                onAccept={handleAccept}
                onRefuse={handleRefuse}
                onCancel={handleCancel}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
