import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Send, Search, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

const initFrom = (name) =>
  name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

const fmtRelativeTime = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "maintenant";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000)
    return new Date(ts).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" });
  return new Date(ts).toLocaleDateString("fr-DZ", { day: "numeric", month: "short" });
};

const fmtClock = (ts) =>
  ts ? new Date(ts).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" }) : "";

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedConvId = location.state?.conversationId ?? null;

  const [user, setUser]                   = useState(null);
  const [navInitials, setNavInitials]     = useState("?");
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId]   = useState(null);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [newMessage, setNewMessage]       = useState("");
  const [sending, setSending]             = useState(false);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");

  const messagesEndRef = useRef(null);
  const channelRef     = useRef(null);
  const didAutoSelect  = useRef(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/"); return; }
      setUser(user);
      const fn = user.user_metadata?.full_name;
      setNavInitials(
        fn
          ? fn.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
          : user.email?.[0]?.toUpperCase() || "?",
      );
    });
  }, [navigate]);

  // ── Fetch conversations ───────────────────────────────────────────────────
  // Two-step approach: fetch conversations first, then fetch partner profiles
  // in a single IN query. Avoids PostgREST FK-name ambiguity that occurs when
  // two columns in the same table both reference profiles.
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoadingConvs(false);
      return;
    }

    const partnerIds = [
      ...new Set(
        convs.map((c) =>
          c.participant_one === user.id ? c.participant_two : c.participant_one,
        ),
      ),
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", partnerIds);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    setConversations(
      convs.map((c) => {
        const partnerId =
          c.participant_one === user.id ? c.participant_two : c.participant_one;
        return { ...c, partner: profileMap[partnerId] ?? null };
      }),
    );
    setLoadingConvs(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Fetch messages ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoadingMsgs(false);
  }, []);

  // ── Auto-select when arriving from ListingDetail ──────────────────────────
  useEffect(() => {
    if (!preselectedConvId || !user || didAutoSelect.current || conversations.length === 0) return;
    const conv = conversations.find((c) => c.id === preselectedConvId);
    if (!conv) return;
    didAutoSelect.current = true;
    setActiveConvId(conv.id);
    setActivePartner(conv.partner);
    fetchMessages(conv.id);
  }, [conversations, user, preselectedConvId, fetchMessages]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (!activeConvId || !user) return;

    const ch = supabase
      .channel(`conv-${activeConvId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev) =>
              prev.find((m) => m.id === data.id) ? prev : [...prev, data],
            );
          }
          fetchConversations();
        },
      )
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [activeConvId, user, fetchConversations]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectConversation = (conv) => {
    setActiveConvId(conv.id);
    setActivePartner(conv.partner);
    fetchMessages(conv.id);
  };

  const goToProfile = (e, partnerId) => {
    e.stopPropagation();
    navigate(`/profile/${partnerId}`);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const conv = conversations.find((c) => c.id === activeConvId);
    const receiverId =
      conv?.participant_one === user.id ? conv.participant_two : conv.participant_one;

    const { data: msg } = await supabase
      .from("messages")
      .insert({ conversation_id: activeConvId, sender_id: user.id, receiver_id: receiverId, content })
      .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)")
      .single();

    if (msg) {
      setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString(), last_message_preview: content.slice(0, 80) })
      .eq("id", activeConvId);

    fetchConversations();
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true;
    return c.partner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const avatarStyle = (size) => ({
    width: size, height: size, borderRadius: "50%", background: "#ADEBB3",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#0A3D3D", fontWeight: "700", flexShrink: 0,
    fontSize: size > 36 ? "16px" : "12px",
    border: "none", cursor: "pointer",
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", background: "#ffffff", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid #e5e7eb", background: "#ffffff",
        position: "sticky", top: 0, zIndex: 10, padding: "0 32px", height: "64px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <Link to="/dashboard" style={{ fontSize: "22px", fontWeight: "700", color: "#0A3D3D", textDecoration: "none", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          DarBelDar
        </Link>
        <div style={{ width: "40px", height: "40px", background: "#4B3FD8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "600", fontSize: "14px" }}>
          {navInitials}
        </div>
      </nav>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ══ LEFT: conversation list ═══════════════════════════════════════ */}
        <aside style={{
          width: "320px", borderRight: "1px solid #e5e7eb", background: "#fff",
          flexShrink: 0, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "22px", fontWeight: "700", color: "#1a1a1a", margin: "0 0 14px" }}>
              Messages
            </h1>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "15px", height: "15px", color: "#717182", pointerEvents: "none" }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une conversation…"
                style={{
                  width: "100%", padding: "9px 12px 9px 36px", borderRadius: "10px",
                  border: "1.5px solid #e5e7eb", fontSize: "13px",
                  fontFamily: "'Inter', sans-serif", background: "#F7F7EC",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingConvs ? (
              <p style={{ padding: "32px", textAlign: "center", color: "#717182", fontSize: "14px" }}>Chargement…</p>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <MessageCircle style={{ width: "36px", height: "36px", color: "#d1d5db", margin: "0 auto 12px", display: "block" }} />
                <p style={{ fontSize: "14px", color: "#717182", margin: 0 }}>Aucune conversation</p>
              </div>
            ) : (
              filtered.map((conv) => {
                const { partner } = conv;
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    style={{
                      padding: "14px 20px",
                      background: isActive ? "#F7F7EC" : "transparent",
                      borderLeft: `3px solid ${isActive ? "#0A3D3D" : "transparent"}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Avatar → partner profile */}
                    <button
                      onClick={(e) => goToProfile(e, partner?.id)}
                      title={`Voir le profil de ${partner?.full_name || "cet utilisateur"}`}
                      style={avatarStyle(44)}
                    >
                      {initFrom(partner?.full_name)}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
                        {/* Name → partner profile */}
                        <button
                          onClick={(e) => goToProfile(e, partner?.id)}
                          style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                        >
                          {partner?.full_name || "Utilisateur"}
                        </button>
                        <span style={{ fontSize: "11px", color: "#717182", flexShrink: 0, marginLeft: "8px" }}>
                          {fmtRelativeTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#717182", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.last_message_preview || "Démarrer la conversation…"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ══ RIGHT: chat window ════════════════════════════════════════════ */}
        {activeConvId ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Chat header — full row navigates to partner's profile */}
            <button
              onClick={() => navigate(`/profile/${activePartner?.id}`)}
              style={{
                padding: "16px 28px", borderBottom: "1px solid #e5e7eb",
                display: "flex", alignItems: "center", gap: "14px",
                background: "#fff", flexShrink: 0,
                border: "none", borderBottom: "1px solid #e5e7eb",
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F7EC")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <div style={avatarStyle(42)}>{initFrom(activePartner?.full_name)}</div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a1a", margin: "0 0 2px", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {activePartner?.full_name || "Utilisateur"}
                </p>
                <p style={{ fontSize: "12px", color: "#717182", margin: 0 }}>Voir le profil →</p>
              </div>
            </button>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "4px", background: "#fafafa" }}>
              {loadingMsgs ? (
                <p style={{ textAlign: "center", color: "#717182", fontSize: "14px" }}>Chargement…</p>
              ) : messages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center" }}>
                  <MessageCircle style={{ width: "36px", height: "36px", color: "#d1d5db", margin: "0 auto 10px", display: "block" }} />
                  <p style={{ fontSize: "14px", color: "#717182", margin: 0 }}>Aucun message. Dites bonjour !</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn    = msg.sender_id === user?.id;
                  const prevMsg  = messages[i - 1];
                  const showTime = !prevMsg || new Date(msg.created_at) - new Date(prevMsg.created_at) > 300_000;

                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <p style={{ textAlign: "center", margin: "14px 0 8px", fontSize: "11px", color: "#9ca3af" }}>
                          {fmtClock(msg.created_at)}
                        </p>
                      )}
                      <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px", marginBottom: "2px" }}>
                        {!isOwn && (
                          <button
                            onClick={() => navigate(`/profile/${msg.sender?.id}`)}
                            title={`Voir le profil de ${msg.sender?.full_name || "cet utilisateur"}`}
                            style={avatarStyle(28)}
                          >
                            {initFrom(msg.sender?.full_name)}
                          </button>
                        )}
                        <div style={{
                          maxWidth: "62%", padding: "10px 14px",
                          borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: isOwn ? "#0A3D3D" : "#ADEBB3",
                          color: isOwn ? "#fff" : "#0A3D3D",
                          fontSize: "14px", lineHeight: 1.55, wordBreak: "break-word",
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div style={{
              padding: "14px 28px", borderTop: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", gap: "12px",
              background: "#fff", flexShrink: 0,
            }}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre message…"
                style={{
                  flex: 1, padding: "12px 18px", borderRadius: "24px",
                  border: "1.5px solid #e5e7eb", fontSize: "14px",
                  fontFamily: "'Inter', sans-serif", outline: "none",
                  background: "#F7F7EC",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  background: newMessage.trim() ? "#0A3D3D" : "#e5e7eb",
                  border: "none", cursor: newMessage.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.18s", flexShrink: 0,
                }}
              >
                <Send style={{ width: "17px", height: "17px", color: newMessage.trim() ? "#ADEBB3" : "#9ca3af" }} />
              </button>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", background: "#fafafa" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle style={{ width: "32px", height: "32px", color: "#0A3D3D" }} />
            </div>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#1a1a1a", fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0 }}>
              Vos conversations
            </p>
            <p style={{ fontSize: "13px", color: "#717182", margin: 0, textAlign: "center", maxWidth: "260px" }}>
              Sélectionnez une conversation à gauche pour commencer à échanger.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
