import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPin, Calendar, ArrowLeft, ArrowRight, Check, X,
  Loader2, Home, MessageSquare, Send, Inbox, AlertCircle, BedDouble,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

const MONTHS = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
const fmtDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const initials = (name) => name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

function StatusBadge({ status }) {
  const map = {
    pending:  { label: "En attente", bg: "#FBEACB", color: "#C77A1E", dot: "#C77A1E" },
    accepted: { label: "Accepté",    bg: "#D6EEDD", color: "#1F7A4F", dot: "#1F7A4F" },
    refused:  { label: "Refusé",     bg: "#F7DCD8", color: "#C0392B", dot: "#C0392B" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: s.bg, color: s.color, padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function InfoBlock({ label, children, refused }) {
  return (
    <div style={{
      background: refused ? "#FBEFEC" : "#E4F6E6",
      border: `1px solid ${refused ? "#F2D6CF" : "#D5E9D8"}`,
      borderRadius: 16, padding: "16px 18px",
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: refused ? "#C0392B" : "#005B5B", fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      {children}
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
  const refused = ex.status === "refused";

  return (
    <article style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <StatusBadge status={ex.status} />
        <span style={{ fontSize: 12.5, color: "#6E7B79" }}>{dateStr}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 22 }}>
        {/* Left: photo + title + user */}
        <div>
          <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 16, overflow: "hidden", background: "#E5DFCE" }}>
            {requested?.images?.[0] ? (
              <img src={requested.images[0]} alt={requested.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                <Home style={{ width: 28, height: 28, color: "#6E7B79" }} />
                <span style={{ fontSize: 11, color: "#6E7B79" }}>property photo</span>
              </div>
            )}
          </div>

          {requested && (
            <>
              <h3 style={{ margin: "16px 0 4px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A" }}>
                {requested.title}
              </h3>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#005B5B", fontWeight: 500 }}>
                <MapPin style={{ width: 13, height: 13 }} />
                {requested.wilaya}{requested.city ? `, ${requested.city}` : ""}
              </div>
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15, flexShrink: 0 }}>
              {initials(mode === "sent" ? receiverProfile?.full_name : senderProfile?.full_name)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2A2A" }}>
              {(mode === "sent" ? receiverProfile?.full_name : senderProfile?.full_name) || "Utilisateur"}
            </div>
          </div>
        </div>

        {/* Right: info blocks + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <InfoBlock label={mode === "sent" ? "Votre logement proposé" : "Votre logement demandé"} refused={refused}>
            {offered ? (
              <>
                <p style={{ fontSize: 15.5, fontWeight: 700, color: "#0F2A2A", margin: "0 0 8px", letterSpacing: "-0.005em" }}>{offered.title}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13.5, color: refused ? "#C0392B" : "#005B5B" }}>
                  {offered.wilaya && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MapPin style={{ width: 13, height: 13, opacity: 0.85 }} />
                      {offered.wilaya}{offered.city ? `, ${offered.city}` : ""}
                    </span>
                  )}
                  {offered.rooms && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <BedDouble style={{ width: 13, height: 13, opacity: 0.85 }} />
                      {offered.rooms} chambres
                    </span>
                  )}
                  {(offered.available_from || offered.available_to) && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Calendar style={{ width: 13, height: 13, opacity: 0.85 }} />
                      {[fmtDate(offered.available_from), fmtDate(offered.available_to)].filter(Boolean).join(" – ")}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#6E7B79", margin: 0 }}>Non disponible</p>
            )}
          </InfoBlock>

          {ex.message && (
            <InfoBlock label={mode === "sent" ? "Votre message" : "Message du demandeur"} refused={refused}>
              <p style={{ fontSize: 14, color: "#0F2A2A", lineHeight: 1.5, margin: 0 }}>{ex.message}</p>
            </InfoBlock>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {mode === "sent" && (
              <>
                <Link
                  to="/messages"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 14, fontSize: 14, fontWeight: 600, background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#005B5B", textDecoration: "none" }}
                >
                  <MessageSquare style={{ width: 15, height: 15 }} />
                  Envoyer un message
                </Link>
                {ex.status === "pending" && (
                  <button
                    onClick={() => onCancel(ex.id)}
                    disabled={busy}
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 14, fontSize: 14, fontWeight: 600, background: "#C0392B", color: "#fff", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                  >
                    {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <X style={{ width: 14, height: 14 }} />}
                    Annuler la demande
                  </button>
                )}
              </>
            )}

            {mode === "received" && ex.status === "pending" && (
              <>
                <button
                  onClick={() => onAccept(ex.id)}
                  disabled={busy}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 14, fontSize: 14, fontWeight: 600, background: "#005B5B", color: "#F3EEE0", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}
                  Accepter
                </button>
                <button
                  onClick={() => onRefuse(ex.id)}
                  disabled={busy}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 14, fontSize: 14, fontWeight: 600, background: "#C0392B", color: "#fff", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <X style={{ width: 14, height: 14 }} />}
                  Refuser
                </button>
              </>
            )}

            {mode === "received" && ex.status !== "pending" && (
              <Link
                to="/messages"
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 14, fontSize: 14, fontWeight: 600, background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#005B5B", textDecoration: "none" }}
              >
                <MessageSquare style={{ width: 15, height: 15 }} />
                Envoyer un message
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ mode }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 32px", color: "#6E7B79" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid #E5DFCE" }}>
        {mode === "sent" ? <Send style={{ width: 28, height: 28, color: "#6E7B79" }} /> : <Inbox style={{ width: 28, height: 28, color: "#6E7B79" }} />}
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#0F2A2A", marginBottom: 8 }}>
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

    if (sentError) { console.error("Error fetching sent:", sentError); setDbError(`Sent: ${sentError.message}`); }

    const { data: receivedData, error: receivedError } = await supabase
      .from("exchanges")
      .select(`id, status, message, created_at,
        requested_house:listings!listing_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        offered_house:listings!offered_house_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        sender_profile:profiles!requester_id ( full_name, wilaya )`)
      .eq("receiver_id", uid)
      .order("created_at", { ascending: false });

    if (receivedError) { console.error("Error fetching received:", receivedError); if (!sentError) setDbError(`Received: ${receivedError.message}`); }

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
    <div style={{ minHeight: "100vh", background: "#F3EEE0", display: "grid", gridTemplateColumns: "auto 1fr", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar active="Mes échanges" />

      <main style={{ padding: "26px 42px 56px", maxWidth: 1440, width: "100%" }}>
        {/* Topbar avatar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingBottom: 22 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>
            {initials(user?.user_metadata?.full_name || user?.email || "")}
          </div>
        </header>

        {/* Page header */}
        <section style={{ margin: "6px 0 22px" }}>
          <h1 style={{ fontSize: 42, lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 700, margin: 0, color: "#0F2A2A" }}>Mes échanges</h1>
          <p style={{ margin: "10px 0 0", color: "#6E7B79", fontSize: 15 }}>Gérez vos demandes d'échange envoyées et reçues</p>
        </section>

        {dbError && (
          <div style={{ background: "#F7DCD8", border: "1px solid #C0392B", color: "#C0392B", padding: 16, borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertCircle style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Erreur:</p>
              <p style={{ fontSize: 13, fontFamily: "monospace" }}>{dbError}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {[
            { id: "sent",     label: "Demandes envoyées", Icon: ArrowRight, count: sent.length },
            { id: "received", label: "Demandes reçues",   Icon: ArrowLeft,  count: received.length },
          ].map(({ id, label, Icon, count }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, padding: "11px 18px", borderRadius: 999,
                  background: on ? "#E4F6E6" : "#FFFFFF", border: on ? "1px solid #8FD89A" : "1px solid #E5DFCE",
                  fontSize: 14, fontWeight: 500, color: "#005B5B", cursor: "pointer",
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {label}
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, padding: "0 7px",
                  borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: on ? "#005B5B" : "rgba(0,91,91,0.08)", color: on ? "#ADEBB3" : "#005B5B",
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[0, 1].map((i) => <div key={i} style={{ height: 280, borderRadius: 22, background: "#E5DFCE", opacity: 0.5 }} />)}
          </div>
        ) : current.length === 0 ? (
          <EmptyState mode={tab} />
        ) : (
          <div>
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
