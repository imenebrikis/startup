import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Send, Search, MessageCircle,
  List, Repeat, MessageSquare, User,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const initFrom = (name) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

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

  const navLinks = [
    { to: "/browse",       icon: <Search    size={18} />, label: "Parcourir" },
    { to: "/profile",      icon: <List      size={18} />, label: "Mes annonces" },
    { to: "/my-exchanges", icon: <Repeat    size={18} />, label: "Mes échanges" },
    { to: "/messages",     icon: <MessageSquare size={18} />, label: "Messages" },
    { to: "/profile",      icon: <User      size={18} />, label: "Profil" },
  ];

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/"); return; }
      setUser(user);
    });
  }, [navigate]);

  // ── Fetch conversations ──────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);

    const { data: convs, error } = await supabase
      .from("conversations")
      .select(`
        *,
        profile_one:profiles!conversations_participant_one_fkey(id, full_name, avatar_url),
        profile_two:profiles!conversations_participant_two_fkey(id, full_name, avatar_url)
      `)
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("[fetchConversations] query failed:", error);
      setConversations([]);
      setLoadingConvs(false);
      return;
    }

    setConversations(
      (convs || []).map((c) => {
        const partner = c.participant_one === user.id ? c.profile_two : c.profile_one;
        return { ...c, partner: partner ?? null };
      }),
    );
    setLoadingConvs(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Fetch messages ───────────────────────────────────────────────────────
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

  // ── Auto-select when arriving from ListingDetail ─────────────────────────
  useEffect(() => {
    if (!preselectedConvId || !user || didAutoSelect.current || conversations.length === 0) return;
    const conv = conversations.find((c) => c.id === preselectedConvId);
    if (!conv) return;
    didAutoSelect.current = true;
    setActiveConvId(conv.id);
    setActivePartner(conv.partner);
    fetchMessages(conv.id);
  }, [conversations, user, preselectedConvId, fetchMessages]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (!activeConvId || !user) return;

    const ch = supabase
      .channel(`conv-${activeConvId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (data) setMessages((prev) => prev.find((m) => m.id === data.id) ? prev : [...prev, data]);
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
    const receiverId = conv?.participant_one === user.id ? conv.participant_two : conv.participant_one;

    const { data: msg } = await supabase
      .from("messages")
      .insert({ conversation_id: activeConvId, sender_id: user.id, receiver_id: receiverId, content })
      .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)")
      .single();

    if (msg) setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);

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

  const filtered = conversations.filter((c) =>
    !searchQuery || c.partner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const avatarBtn = (size, name, onClick) => (
    <button
      onClick={onClick}
      title={name ? `Voir le profil de ${name}` : undefined}
      style={{
        width: size, height: size, borderRadius: "50%", background: "#ADEBB3",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#0A3D3D", fontWeight: "700", flexShrink: 0,
        fontSize: size > 36 ? "15px" : "12px",
        border: "none", cursor: onClick ? "pointer" : "default",
      }}
    >
      {initFrom(name)}
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", fontFamily: "'Inter', sans-serif", display: "flex", overflow: "hidden" }}>

      {/* ══ Sidebar ══════════════════════════════════════════════════════════ */}
      <aside style={{ width: 240, background: "#F7F7EC", flexShrink: 0, display: "flex", flexDirection: "column", padding: "28px 16px", gap: 8, overflowY: "auto" }}>
        <Link
          to="/dashboard"
          style={{ fontSize: 20, fontWeight: 700, color: "#0A3D3D", textDecoration: "none", fontFamily: "'Bricolage Grotesque', sans-serif", padding: "4px 12px", marginBottom: 16, display: "block" }}
        >
          DarBelDar
        </Link>

        {navLinks.map(({ to, icon, label }) => {
          const active = label === "Messages";
          return (
            <Link
              key={label}
              to={to}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 16px", borderRadius: 12,
                color: active ? "#fff" : "#4B5563",
                background: active ? "#0A3D3D" : "transparent",
                textDecoration: "none", fontSize: 14,
                fontWeight: active ? 600 : 500,
              }}
            >
              {icon} {label}
            </Link>
          );
        })}
      </aside>

      {/* ══ Conversation list ════════════════════════════════════════════════ */}
      <div style={{ width: 300, borderRight: "1px solid #E5E7EB", background: "#fff", flexShrink: 0, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #F0F0F0" }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>
            Messages
          </h1>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9CA3AF", pointerEvents: "none" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher…"
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, fontFamily: "'Inter', sans-serif", background: "#F7F7EC", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <p style={{ padding: 32, textAlign: "center", color: "#717182", fontSize: 14 }}>Chargement…</p>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <MessageCircle style={{ width: 36, height: 36, color: "#D1D5DB", margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 14, color: "#717182", margin: 0 }}>Aucune conversation</p>
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
                    padding: "13px 20px",
                    background: isActive ? "#F7F7EC" : "transparent",
                    borderLeft: `3px solid ${isActive ? "#0A3D3D" : "transparent"}`,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    transition: "background 0.15s",
                  }}
                >
                  {avatarBtn(42, partner?.full_name, (e) => goToProfile(e, partner?.id))}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                      <button
                        onClick={(e) => goToProfile(e, partner?.id)}
                        style={{ fontSize: 14, fontWeight: 600, color: "#111827", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                      >
                        {partner?.full_name || "Utilisateur"}
                      </button>
                      <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0, marginLeft: 8 }}>
                        {fmtRelativeTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.last_message_preview || "Démarrer la conversation…"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══ Chat window ══════════════════════════════════════════════════════ */}
      {activeConvId ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Chat header */}
          <button
            onClick={() => navigate(`/profile/${activePartner?.id}`)}
            style={{
              padding: "16px 28px", borderBottom: "1px solid #E5E7EB",
              display: "flex", alignItems: "center", gap: 14,
              background: "#fff", flexShrink: 0,
              border: "none", borderBottom: "1px solid #E5E7EB",
              cursor: "pointer", textAlign: "left", width: "100%",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F7EC")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            {avatarBtn(42, activePartner?.full_name, null)}
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 2px", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {activePartner?.full_name || "Utilisateur"}
              </p>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Voir le profil →</p>
            </div>
          </button>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 4, background: "#F7F7EC" }}>
            {loadingMsgs ? (
              <p style={{ textAlign: "center", color: "#717182", fontSize: 14 }}>Chargement…</p>
            ) : messages.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center" }}>
                <MessageCircle style={{ width: 36, height: 36, color: "#D1D5DB", margin: "0 auto 10px", display: "block" }} />
                <p style={{ fontSize: 14, color: "#717182", margin: 0 }}>Aucun message. Dites bonjour !</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isOwn   = msg.sender_id === user?.id;
                const prevMsg = messages[i - 1];
                const showTime = !prevMsg || new Date(msg.created_at) - new Date(prevMsg.created_at) > 300_000;

                return (
                  <div key={msg.id}>
                    {showTime && (
                      <p style={{ textAlign: "center", margin: "14px 0 8px", fontSize: 11, color: "#9CA3AF" }}>
                        {fmtClock(msg.created_at)}
                      </p>
                    )}
                    <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: 2 }}>
                      {!isOwn && avatarBtn(28, msg.sender?.full_name, () => navigate(`/profile/${msg.sender?.id}`))}
                      <div style={{
                        maxWidth: "62%", padding: "10px 14px",
                        borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isOwn ? "#0A3D3D" : "#fff",
                        color: isOwn ? "#fff" : "#111827",
                        fontSize: 14, lineHeight: 1.55, wordBreak: "break-word",
                        boxShadow: isOwn ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
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
          <div style={{ padding: "14px 28px", borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12, background: "#fff", flexShrink: 0 }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Votre message…"
              style={{ flex: 1, padding: "12px 18px", borderRadius: 24, border: "1.5px solid #E5E7EB", fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none", background: "#F7F7EC" }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: newMessage.trim() ? "#0A3D3D" : "#E5E7EB",
                border: "none", cursor: newMessage.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.18s", flexShrink: 0,
              }}
            >
              <Send style={{ width: 17, height: 17, color: newMessage.trim() ? "#ADEBB3" : "#9CA3AF" }} />
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#F7F7EC" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircle style={{ width: 32, height: 32, color: "#0A3D3D" }} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0 }}>
            Vos conversations
          </p>
          <p style={{ fontSize: 13, color: "#717182", margin: 0, textAlign: "center", maxWidth: 260 }}>
            Sélectionnez une conversation à gauche pour commencer à échanger.
          </p>
        </div>
      )}
    </div>
  );
}
