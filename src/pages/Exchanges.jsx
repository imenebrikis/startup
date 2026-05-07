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
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  "jan",
  "fév",
  "mar",
  "avr",
  "mai",
  "juin",
  "juil",
  "août",
  "sep",
  "oct",
  "nov",
  "déc",
];
const fmtDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const initials = (name) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending: {
      label: "En attente",
      bg: "#FEF3C7",
      color: "#92400E",
      dot: "#F59E0B",
    },
    accepted: {
      label: "Accepté",
      bg: "#D1FAE5",
      color: "#065F46",
      dot: "#10B981",
    },
    refused: {
      label: "Refusé",
      bg: "#FEE2E2",
      color: "#991B1B",
      dot: "#EF4444",
    },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: s.bg,
        color: s.color,
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

// ── House info box ────────────────────────────────────────────────────────────
function HouseBox({ house, label }) {
  if (!house)
    return (
      <div
        style={{
          background: "#F7F7EC",
          borderRadius: "12px",
          padding: "14px 16px",
        }}
      >
        <p style={{ fontSize: "13px", color: "#717182" }}>{label}</p>
        <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: 4 }}>
          Non disponible
        </p>
      </div>
    );
  return (
    <div
      style={{
        background: "#F7F7EC",
        borderRadius: "12px",
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          color: "#717182",
          marginBottom: 6,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "14px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: 4,
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        {house.title}
      </p>
      {house.wilaya && (
        <p
          style={{
            fontSize: "13px",
            color: "#4B3FD8",
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 4,
          }}
        >
          <MapPin style={{ width: 12, height: 12 }} />
          {house.wilaya}
          {house.city ? `, ${house.city}` : ""}
          {house.rooms
            ? ` · ${house.rooms} chambre${house.rooms > 1 ? "s" : ""}`
            : ""}
        </p>
      )}
      {(house.available_from || house.available_to) && (
        <p
          style={{
            fontSize: "12px",
            color: "#717182",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Calendar style={{ width: 12, height: 12 }} />
          {[fmtDate(house.available_from), fmtDate(house.available_to)]
            .filter(Boolean)
            .join(" – ")}
        </p>
      )}
    </div>
  );
}

// ── Sender avatar ─────────────────────────────────────────────────────────────
function Avatar({ name, sub, color = "#0A3D3D" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "700",
          flexShrink: 0,
        }}
      >
        {initials(name)}
      </div>
      <div>
        <p style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a" }}>
          {name || "Utilisateur"}
        </p>
        {sub && <p style={{ fontSize: "12px", color: "#717182" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Exchange card ─────────────────────────────────────────────────────────────
function ExchangeCard({
  ex,
  mode,
  onAccept,
  onRefuse,
  onCancel,
  actionLoading,
}) {
  const requested = ex.requested_house;
  const offered = ex.offered_house;
  const senderProfile = ex.sender_profile;
  const receiverProfile = ex.receiver_profile;
  const dateStr = ex.created_at
    ? `Demandé le ${new Date(ex.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  const busy = actionLoading === ex.id;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "20px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <StatusBadge status={ex.status} />
        <span style={{ fontSize: "12px", color: "#717182" }}>{dateStr}</span>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              height: "160px",
              background: "#F7F7EC",
              flexShrink: 0,
            }}
          >
            {requested?.images?.[0] ? (
              <img
                src={requested.images[0]}
                alt={requested.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Home style={{ width: 32, height: 32, color: "#c4c4d4" }} />
              </div>
            )}
          </div>

          {requested && (
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  marginBottom: 4,
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                {requested.title}
              </p>
              {requested.wilaya && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#4B3FD8",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 3,
                  }}
                >
                  <MapPin style={{ width: 12, height: 12 }} />
                  {requested.wilaya}
                  {requested.city ? `, ${requested.city}` : ""}
                </p>
              )}
            </div>
          )}

          <Avatar
            name={
              mode === "sent"
                ? receiverProfile?.full_name
                : senderProfile?.full_name
            }
            sub={
              mode === "sent" ? receiverProfile?.wilaya : senderProfile?.wilaya
            }
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <HouseBox
            house={offered}
            label={
              mode === "sent"
                ? "Votre logement proposé"
                : "Votre logement demandé"
            }
          />

          {ex.message && (
            <div
              style={{
                background: "#F7F7EC",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#717182",
                  marginBottom: 6,
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {mode === "sent" ? "Votre message" : "Message du demandeur"}
              </p>
              <p
                style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}
              >
                {ex.message}
              </p>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginTop: "auto",
            }}
          >
            {mode === "sent" && (
              <>
                <Link
                  to="/messages"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "1.5px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    fontSize: "13px",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  <MessageSquare style={{ width: 14, height: 14 }} /> Envoyer un
                  message
                </Link>
                {ex.status === "pending" && (
                  <button
                    onClick={() => onCancel(ex.id)}
                    disabled={busy}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "10px 16px",
                      borderRadius: "999px",
                      border: "none",
                      background: "#EF4444",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    {busy ? (
                      <Loader2
                        style={{
                          width: 14,
                          height: 14,
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    ) : (
                      <X style={{ width: 14, height: 14 }} />
                    )}
                    Annuler la demande
                  </button>
                )}
              </>
            )}

            {mode === "received" && ex.status === "pending" && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => onAccept(ex.id)}
                  disabled={busy}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "none",
                    background: "#10B981",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? (
                    <Loader2
                      style={{
                        width: 14,
                        height: 14,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    <Check style={{ width: 14, height: 14 }} />
                  )}
                  Accepter
                </button>
                <button
                  onClick={() => onRefuse(ex.id)}
                  disabled={busy}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "none",
                    background: "#EF4444",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? (
                    <Loader2
                      style={{
                        width: 14,
                        height: 14,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    <X style={{ width: 14, height: 14 }} />
                  )}
                  Refuser
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ mode }) {
  return (
    <div
      style={{ textAlign: "center", padding: "64px 32px", color: "#717182" }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#F7F7EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        {mode === "sent" ? (
          <Send style={{ width: 28, height: 28, color: "#9CA3AF" }} />
        ) : (
          <Inbox style={{ width: 28, height: 28, color: "#9CA3AF" }} />
        )}
      </div>
      <p
        style={{
          fontSize: "16px",
          fontWeight: "600",
          color: "#374151",
          marginBottom: 8,
        }}
      >
        {mode === "sent" ? "Aucune demande envoyée" : "Aucune demande reçue"}
      </p>
      <p style={{ fontSize: "13px" }}>
        {mode === "sent"
          ? "Parcourez les annonces pour proposer un échange."
          : "Les demandes d'autres utilisateurs apparaîtront ici."}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Exchanges() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("sent");
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [dbError, setDbError] = useState(null); // <--- ADDED ERROR STATE

  const navLinks = [
    { to: "/browse", icon: <Search className="w-5 h-5" />, label: "Parcourir" },
    {
      to: "/profile",
      icon: <List className="w-5 h-5" />,
      label: "Mes annonces",
    },
    {
      to: "/my-exchanges",
      icon: <Repeat className="w-5 h-5" />,
      label: "Mes échanges",
    },
    {
      to: "/messages",
      icon: <MessageSquare className="w-5 h-5" />,
      label: "Messages",
    },
    { to: "/profile", icon: <User className="w-5 h-5" />, label: "Profil" },
  ];

  const fetchExchanges = useCallback(async (uid) => {
    setLoading(true);
    setDbError(null);

    // 1. Fetch SENT requests
    const { data: sentData, error: sentError } = await supabase
      .from("exchanges")
      .select(
        `
        id, status, message, created_at,
        requested_house:listings!listing_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        offered_house:listings!offered_house_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        receiver_profile:profiles!receiver_id ( full_name, wilaya )
      `,
      )
      .eq("requester_id", uid)
      .order("created_at", { ascending: false });

    if (sentError) {
      console.error("Error fetching sent:", sentError);
      setDbError(`Sent Query Error: ${sentError.message}`);
    }

    // 2. Fetch RECEIVED requests
    const { data: receivedData, error: receivedError } = await supabase
      .from("exchanges")
      .select(
        `
        id, status, message, created_at,
        requested_house:listings!listing_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        offered_house:listings!offered_house_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        sender_profile:profiles!requester_id ( full_name, wilaya )
      `,
      )
      .eq("receiver_id", uid)
      .order("created_at", { ascending: false });

    if (receivedError) {
      console.error("Error fetching received:", receivedError);
      if (!sentError)
        setDbError(`Received Query Error: ${receivedError.message}`);
    }

    setSent(sentData || []);
    setReceived(receivedData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/");
        return;
      }
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

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  const current = tab === "sent" ? sent : received;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <nav
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "0 32px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          to="/dashboard"
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#0A3D3D",
            textDecoration: "none",
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          DarBelDar
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "#4B3FD8",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            {userInitials}
          </div>
        </div>
      </nav>

      <div style={{ display: "flex" }}>
        <aside
          style={{
            width: "256px",
            borderRight: "1px solid #e5e7eb",
            minHeight: "calc(100vh - 64px)",
            background: "#ffffff",
            flexShrink: 0,
            padding: "24px 16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navLinks.map(({ to, icon, label }) => (
              <Link
                key={label}
                to={to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  color: label === "Mes échanges" ? "#4B3FD8" : "#374151",
                  background:
                    label === "Mes échanges" ? "#EEF2FF" : "transparent",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: label === "Mes échanges" ? "600" : "500",
                }}
              >
                {icon} {label}
              </Link>
            ))}
          </div>
        </aside>

        <main style={{ flex: 1, padding: "48px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "32px",
                fontWeight: "700",
                color: "#1a1a1a",
                marginBottom: "8px",
              }}
            >
              Mes échanges
            </h1>
            <p style={{ fontSize: "14px", color: "#717182" }}>
              Gérez vos demandes d'échange envoyées et reçues
            </p>
          </div>

          {/* 🔴 ERROR BANNER */}
          {dbError && (
            <div
              style={{
                background: "#FEE2E2",
                border: "1px solid #EF4444",
                color: "#991B1B",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <AlertCircle
                style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <p
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    marginBottom: 4,
                  }}
                >
                  Database Error (Supabase is blocking the query):
                </p>
                <p style={{ fontSize: "13px", fontFamily: "monospace" }}>
                  {dbError}
                </p>
                <p style={{ fontSize: "13px", marginTop: 8 }}>
                  Please copy this error message and show it to me so we can run
                  the SQL to fix it!
                </p>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
            {[
              {
                id: "sent",
                label: "Demandes envoyées",
                icon: <ArrowRight style={{ width: 14, height: 14 }} />,
                count: sent.length,
              },
              {
                id: "received",
                label: "Demandes reçues",
                icon: <ArrowLeft style={{ width: 14, height: 14 }} />,
                count: received.length,
              },
            ].map(({ id, label, icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  border:
                    tab === id ? "2px solid #4B3FD8" : "2px solid #e5e7eb",
                  background: tab === id ? "#EEF2FF" : "#fff",
                  color: tab === id ? "#4B3FD8" : "#717182",
                  fontSize: "14px",
                  fontWeight: tab === id ? "700" : "500",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {icon} {label}
                <span
                  style={{
                    background: tab === id ? "#4B3FD8" : "#e5e7eb",
                    color: tab === id ? "#fff" : "#717182",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "1px 7px",
                  }}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "260px",
                    borderRadius: "20px",
                    background: "#f0f0f0",
                  }}
                />
              ))}
            </div>
          ) : current.length === 0 ? (
            <EmptyState mode={tab} />
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
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
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
