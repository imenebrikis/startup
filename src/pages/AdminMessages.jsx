import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ini(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

function fmtSidebarTime(s) {
  if (!s) return "";
  const d = new Date(s);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtMsgTime(s) {
  if (!s) return "";
  return new Date(s).toLocaleString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const TONES = [
  { bg: "#E0F2FE", color: "#0369A1" },
  { bg: "#F3E8FF", color: "#7E22CE" },
  { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" },
  { bg: "#FFE4E6", color: "#BE123C" },
  { bg: "#F1F5F9", color: "#334155" },
];
function toneFor(name) {
  if (!name) return TONES[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

function Avatar({ name, size = 32 }) {
  const t = toneFor(name);
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      display: "grid", placeItems: "center", flexShrink: 0,
      fontSize: size * 0.35, fontWeight: 700,
      background: t.bg, color: t.color,
      border: `1.5px solid ${t.color}22`,
    }}>
      {ini(name)}
    </span>
  );
}

function HomeSvg({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 11l8-7 8 7v9H4z"/>
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminMessages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [conversations, setConversations] = useState([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") { setLoading(false); return; }
    setAdminProfile({ ...profile, email: user.email });
    setAuthorized(true);
    await Promise.all([fetchConversations(), fetchPending()]);
    setLoading(false);
  }

  async function fetchPending() {
    const { count } = await supabase
      .from("listings").select("*", { count: "exact", head: true }).eq("status", "pending");
    setPendingCount(count || 0);
  }

  async function fetchConversations() {
    setConvsLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select(`
        *,
        profile_one:profiles!conversations_participant_one_fkey(id, full_name),
        profile_two:profiles!conversations_participant_two_fkey(id, full_name),
        listing:listings!conversations_listing_id_fkey(id, title, wilaya)
      `)
      .order("last_message_at", { ascending: false });
    setConversations(data || []);
    setConvsLoading(false);
  }

  const loadMessages = useCallback(async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    setMsgsLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("id, content, created_at, sender_id")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setMsgsLoading(false);
  }, []);

  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = conversations.filter(conv => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (conv.profile_one?.full_name || "").toLowerCase().includes(q) ||
      (conv.profile_two?.full_name || "").toLowerCase().includes(q) ||
      (conv.listing?.title || "").toLowerCase().includes(q)
    );
  });

  // ── Loading / auth guards ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F8FAFC" }}>
      <div style={{ width: 26, height: 26, border: "3px solid #ADEBB3", borderTopColor: "#006E6E", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!authorized) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p style={{ color: "#64748B", fontSize: 15, fontFamily: "'Inter', sans-serif" }}>Accès non autorisé.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebar active="messages" pendingCount={pendingCount} adminProfile={adminProfile} />

      {/* ══ Conversation list panel ══════════════════════════════════════════ */}
      <div style={{
        width: 310, flexShrink: 0, borderRight: "1px solid #E2E8F0",
        display: "flex", flexDirection: "column", background: "#FFFFFF",
      }}>

        {/* Panel header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Conversations
            </h2>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}>
              {conversations.length}
            </span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, cursor: "text" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{ border: 0, outline: 0, fontSize: 13, color: "#0F172A", background: "transparent", fontFamily: "'Inter', sans-serif", flex: 1 }}
            />
          </label>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convsLoading ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 62, borderRadius: 10, background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.3" style={{ margin: "0 auto 10px" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <div style={{ fontSize: 13.5, color: "#0F172A", fontWeight: 600 }}>
                {search ? "Aucun résultat" : "Aucune conversation"}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                {search ? "Essayez d'autres termes." : "Les échanges entre utilisateurs apparaîtront ici."}
              </div>
            </div>
          ) : filtered.map(conv => {
            const isActive = activeConv?.id === conv.id;
            const n1 = conv.profile_one?.full_name || "Utilisateur";
            const n2 = conv.profile_two?.full_name || "Utilisateur";
            const t2 = toneFor(n2);
            return (
              <button
                key={conv.id}
                onClick={() => loadMessages(conv)}
                style={{
                  width: "100%", textAlign: "left", padding: "11px 16px",
                  background: isActive ? "#F0FDF4" : "transparent",
                  border: "none", borderBottom: "1px solid #F1F5F9",
                  borderLeft: `3px solid ${isActive ? "#006E6E" : "transparent"}`,
                  cursor: "pointer", transition: "background .1s",
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Stacked avatars */}
                <div style={{ position: "relative", width: 38, height: 38, flexShrink: 0 }}>
                  <Avatar name={n1} size={30} />
                  <span style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 20, height: 20, borderRadius: "50%",
                    display: "grid", placeItems: "center",
                    background: t2.bg, color: t2.color,
                    fontSize: 8, fontWeight: 700,
                    border: "2px solid #fff",
                  }}>
                    {ini(n2)}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n1}</span>
                    <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 11, flexShrink: 0 }}>↔</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n2}</span>
                  </div>
                  {conv.listing?.title && (
                    <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      <HomeSvg />
                      {conv.listing.title}
                    </div>
                  )}
                  {conv.last_message_preview && (
                    <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {conv.last_message_preview}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: 10.5, color: "#94A3B8", whiteSpace: "nowrap", marginTop: 2, flexShrink: 0 }}>
                  {fmtSidebarTime(conv.last_message_at)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Chat window ═════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {!activeConv ? (
          /* Empty state */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#94A3B8", padding: 40 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "#F1F5F9", display: "grid", placeItems: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Aucune conversation sélectionnée</div>
              <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
                Cliquez sur une conversation à gauche<br />pour afficher l'historique complet.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: "14px 24px", borderBottom: "1px solid #E2E8F0",
              background: "#FFFFFF", display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 1px 3px rgba(15,23,42,.04)", flexShrink: 0,
            }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={activeConv.profile_one?.full_name} size={42} />
                <span style={{
                  position: "absolute", bottom: -3, right: -9,
                  width: 24, height: 24, borderRadius: "50%",
                  display: "grid", placeItems: "center",
                  background: toneFor(activeConv.profile_two?.full_name).bg,
                  color: toneFor(activeConv.profile_two?.full_name).color,
                  fontSize: 9.5, fontWeight: 700, border: "2px solid #fff",
                }}>
                  {ini(activeConv.profile_two?.full_name)}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                  {activeConv.profile_one?.full_name || "—"}
                  <span style={{ color: "#CBD5E1", fontWeight: 400, fontSize: 13 }}>↔</span>
                  {activeConv.profile_two?.full_name || "—"}
                </div>
                {activeConv.listing && (
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                    <HomeSvg size={11} />
                    <span>{activeConv.listing.title}</span>
                    {activeConv.listing.wilaya && <span style={{ color: "#CBD5E1" }}>·</span>}
                    {activeConv.listing.wilaya && <span>{activeConv.listing.wilaya}</span>}
                  </div>
                )}
              </div>

              {/* Surveillance badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 999,
                background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A",
                flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Mode surveillance
              </span>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: 8, background: "#F8FAFC" }}>
              {msgsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                      alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
                      width: `${35 + (i * 13) % 30}%`, height: 48,
                      borderRadius: 14,
                      background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)",
                      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
                    }} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>Aucun message dans cette conversation.</span>
                </div>
              ) : messages.map((msg, idx) => {
                const isOne = msg.sender_id === activeConv.participant_one;
                const senderName = isOne
                  ? activeConv.profile_one?.full_name
                  : activeConv.profile_two?.full_name;
                const prevMsg = messages[idx - 1];
                const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                // group messages within 5 minutes by the same sender
                const showTime = !messages[idx + 1] || messages[idx + 1].sender_id !== msg.sender_id ||
                  new Date(messages[idx + 1].created_at) - new Date(msg.created_at) > 300000;

                return (
                  <div
                    key={msg.id}
                    style={{ display: "flex", flexDirection: "column", alignItems: isOne ? "flex-start" : "flex-end", gap: 2, marginTop: showSender && idx > 0 ? 10 : 0 }}
                  >
                    {showSender && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: isOne ? 0 : 0 }}>
                        {isOne && <Avatar name={senderName} size={18} />}
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>{senderName || "Utilisateur"}</span>
                        {!isOne && <Avatar name={senderName} size={18} />}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isOne ? "row" : "row-reverse" }}>
                      <div style={{
                        maxWidth: 440,
                        padding: "9px 14px",
                        borderRadius: isOne ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                        background: isOne ? "#FFFFFF" : "#E8F5E9",
                        border: `1px solid ${isOne ? "#E2E8F0" : "#C8E6C9"}`,
                        fontSize: 13.5, color: "#0F172A", lineHeight: 1.55,
                        boxShadow: "0 1px 2px rgba(15,23,42,.05)",
                        wordBreak: "break-word",
                      }}>
                        {msg.content}
                      </div>
                      {showTime && (
                        <span style={{ fontSize: 10.5, color: "#94A3B8", whiteSpace: "nowrap", paddingBottom: 2 }}>
                          {fmtMsgTime(msg.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Read-only footer */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF", flexShrink: 0 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
                background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0",
                cursor: "not-allowed",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style={{ fontSize: 13, color: "#CBD5E1", fontStyle: "italic", userSelect: "none" }}>
                  Lecture seule — les administrateurs ne peuvent pas envoyer de messages.
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
