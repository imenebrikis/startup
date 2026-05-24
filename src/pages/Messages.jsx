import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

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

const fmtDay = (ts) =>
  ts ? new Date(ts).toLocaleDateString("fr-DZ", { day: "numeric", month: "long" }) : "";

function SkeletonConversation() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 12, alignItems: "center", padding: "12px 12px", borderRadius: 14, marginBottom: 2 }}>
      <div className="skeleton-pulse" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="skeleton-pulse" style={{ height: 13, width: "60%", borderRadius: 6 }} />
        <div className="skeleton-pulse" style={{ height: 11, width: "85%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

function SkeletonMessage({ align = "left" }) {
  const isRight = align === "right";
  return (
    <div style={{ display: "flex", gap: 10, maxWidth: "60%", alignSelf: isRight ? "flex-end" : "flex-start", flexDirection: isRight ? "row-reverse" : "row" }}>
      <div className="skeleton-pulse" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div className="skeleton-pulse" style={{ height: 40, borderRadius: 18, borderTopLeftRadius: isRight ? 18 : 6, borderTopRightRadius: isRight ? 6 : 18 }} />
        <div className="skeleton-pulse" style={{ height: 10, width: "40%", borderRadius: 6, alignSelf: isRight ? "flex-end" : "flex-start" }} />
      </div>
    </div>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedConvId = location.state?.conversationId ?? null;

  const [user, setUser]                   = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId]       = useState(null);
  const [activePartner, setActivePartner]     = useState(null);
  const [activeConvListing, setActiveConvListing] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [newMessage, setNewMessage]       = useState("");
  const [sending, setSending]             = useState(false);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [isRecording, setIsRecording]     = useState(false);
  const [activeExchange, setActiveExchange] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(false);

  const messagesEndRef   = useRef(null);
  const channelRef       = useRef(null);
  const didAutoSelect    = useRef(false);
  const imageInputRef    = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);

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
        listing:listings(id, title, wilaya, city, rooms, images, is_for_exchange, is_for_sale)
      `)
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("[fetchConversations]", error);
      setConversations([]);
      setLoadingConvs(false);
      return;
    }

    const partnerIds = [...new Set(
      (convs || []).map((c) => c.participant_one === user.id ? c.participant_two : c.participant_one)
    )].filter(Boolean);

    console.log("[fetchConversations] user.id:", user.id, "partnerIds:", partnerIds);

    const { data: profiles, error: profilesError } = partnerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", partnerIds)
      : { data: [], error: null };

    console.log("[fetchConversations] profiles:", profiles, "error:", profilesError);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const mapped = (convs || []).map((c) => {
      const partnerId = c.participant_one === user.id ? c.participant_two : c.participant_one;
      const partner = profileMap[partnerId] ?? null;
      console.log(`[conv ${c.id}] participant_one=${c.participant_one} participant_two=${c.participant_two} → partnerId=${partnerId} → full_name=${partner?.full_name}`);
      return { ...c, partner };
    });

    setConversations(mapped);
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
    setActiveConvListing(conv.listing ?? null);
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

  // ── Fetch exchange for active conversation ────────────────────────────────
  const fetchExchange = useCallback(async (listingId, partnerId) => {
    if (!listingId || !partnerId) { setActiveExchange(null); return; }
    const { data } = await supabase
      .from("exchanges")
      .select("id, status, requester_id, listing_id")
      .eq("listing_id", listingId)
      .or(`requester_id.eq.${user.id},requester_id.eq.${partnerId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    setActiveExchange(data ?? null);
  }, [user]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectConversation = (conv) => {
    setActiveConvId(conv.id);
    setActivePartner(conv.partner);
    setActiveConvListing(conv.listing ?? null);
    setActiveExchange(null);
    fetchMessages(conv.id);
    fetchExchange(conv.listing?.id ?? null, conv.partner?.id ?? null);
  };

  const handleExchangeAction = async (newStatus) => {
    if (!activeExchange || exchangeLoading) return;
    setExchangeLoading(true);
    const { data, error } = await supabase
      .from("exchanges")
      .update({ status: newStatus })
      .eq("id", activeExchange.id)
      .select("id, status, requester_id, listing_id")
      .single();
    if (!error && data) setActiveExchange(data);
    setExchangeLoading(false);
  };

  // ── Pillar 4: Text send ───────────────────────────────────────────────────
  const handleSend = async (contentArg) => {
    const content = (contentArg ?? newMessage).trim();
    if (!content || !activeConvId || sending) return;
    setSending(true);
    setNewMessage("");
    const conv = conversations.find((c) => c.id === activeConvId);
    const receiverId = conv?.participant_one === user.id ? conv.participant_two : conv.participant_one;
    const { data: msg } = await supabase
      .from("messages")
      .insert({ conversation_id: activeConvId, sender_id: user.id, receiver_id: receiverId, content })
      .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)")
      .single();
    if (msg) setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);
    const previewText = content.includes(".webm") ? "🎤 Message vocal" : content.slice(0, 80);
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString(), last_message_preview: previewText })
      .eq("id", activeConvId);
    fetchConversations();
    setSending(false);
  };

  const handleSendMessage = (text) => {
    if (!text.trim() || !activeConvId || sending) return;
    setNewMessage("");
    handleSend(text.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(newMessage); }
  };

  // ── Pillar 2: Photo upload ────────────────────────────────────────────────
  const handleImageUpload = (file) => {
    // TODO: wire to Supabase Storage
    console.log("[handleImageUpload] ready:", file.name, file.type, file.size);
  };

  // ── Pillar 3: Voice recording ─────────────────────────────────────────────
  const handleVoiceMessage = async (audioBlob) => {
    if (!activeConvId || !user) return;
    const path = `${user.id}/voice_${Date.now()}.webm`;
    const { error } = await supabase.storage
      .from("listings")
      .upload(path, audioBlob, { contentType: "audio/webm" });
    if (error) {
      console.error("[handleVoiceMessage] upload failed:", error);
      alert("Impossible d'envoyer le message vocal : " + error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("listings").getPublicUrl(path);
    await handleSend(urlData.publicUrl);
  };

  const handleMicClick = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        handleVoiceMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    });
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const userInitials = initFrom(user?.user_metadata?.full_name || user?.email);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar active="Messages" />

      <main style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", minHeight: "100vh", background: "#F3EEE0" }}>

        {/* ── Topbar ── */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#0F2A2A" }}>Messages</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              aria-label="Notifications"
              style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E5DFCE", background: "#FFFFFF", color: "#005B5B", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/>
                <path d="M10 21a2 2 0 0 0 4 0"/>
              </svg>
              <span style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: "50%", background: "#8FD89A", border: "2px solid #FFFFFF" }} />
            </button>
            <div
              style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}
              title={user?.user_metadata?.full_name || user?.email}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* ── 3-column messenger ── */}
        <section style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 18, alignItems: "stretch", minHeight: 0 }}>

          {/* ════ INBOX (LEFT) ════ */}
          <aside style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

            <div style={{ padding: "18px 18px 12px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #E5DFCE" }}>
              <div style={{ display: "flex", gap: 14, flex: 1 }}>
                <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 2px", fontSize: 14, fontWeight: 600, color: "#005B5B", background: "none", border: "none", borderBottom: "2px solid #005B5B", cursor: "pointer" }}>
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 7l9 6 9-6"/><rect x="3" y="5" width="18" height="14" rx="2"/>
                  </svg>
                  Boîte
                </button>
              </div>
              <button
                aria-label="Rechercher"
                style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#005B5B", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,91,91,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
                </svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 14px" }}>
              {loadingConvs ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonConversation key={i} />)
              ) : conversations.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <MessageCircle style={{ width: 36, height: 36, color: "#E5DFCE", margin: "0 auto 12px", display: "block" }} />
                  <p style={{ fontSize: 14, color: "#6E7B79", margin: 0 }}>Aucune conversation</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const { partner } = conv;
                  const isActive = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      style={{
                        display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 12,
                        alignItems: "center", padding: isActive ? "11px 11px" : "12px 12px",
                        borderRadius: 14, cursor: "pointer", position: "relative",
                        background: isActive ? "#E4F6E6" : "transparent",
                        border: `1px solid ${isActive ? "#D5E9D8" : "transparent"}`,
                        transition: "background 0.15s",
                        marginBottom: 2,
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#FAF7EC"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                        {initFrom(partner?.full_name)}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0F2A2A", letterSpacing: "-0.005em", margin: "0 0 2px", lineHeight: 1.1 }}>
                          {partner?.full_name || "Utilisateur"}
                          {conv.last_message_at && (
                            <span style={{ color: "#6E7B79", fontWeight: 500, fontSize: 11.5, marginLeft: 8 }}>
                              {fmtRelativeTime(conv.last_message_at)}
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: 12.5, color: "#6E7B79", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 185 }}>
                          {conv.last_message_preview?.includes(".webm") || conv.last_message_preview?.startsWith("https://") ? "🎤 Message vocal" : (conv.last_message_preview || "Démarrer la conversation…")}
                        </p>
                      </div>
                      <div />
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ════ CHAT (CENTER) ════ */}
          <section style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {activeConvId ? (
              <>
                {/* Chat header */}
                <header style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #E5DFCE" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                    {initFrom(activePartner?.full_name)}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#0F2A2A", margin: 0, lineHeight: 1.1 }}>
                      {activePartner?.full_name || "Utilisateur"}
                    </p>
                    <button
                      onClick={() => navigate(`/profile/${activePartner?.id}`)}
                      style={{ fontSize: 12.5, color: "#005B5B", fontWeight: 500, margin: "2px 0 0", display: "inline-flex", gap: 4, alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Voir le profil →
                    </button>
                  </div>
                </header>

                {/* Message stream */}
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 8px", display: "flex", flexDirection: "column", gap: 14, background: "linear-gradient(180deg, #FFFFFF, #FFFDF7)" }}>
                  {loadingMsgs ? (
                    ["left", "right", "left"].map((align, i) => <SkeletonMessage key={i} align={align} />)
                  ) : messages.length === 0 ? (
                    <div style={{ margin: "auto", textAlign: "center" }}>
                      <MessageCircle style={{ width: 36, height: 36, color: "#E5DFCE", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: 14, color: "#6E7B79", margin: 0 }}>Aucun message. Dites bonjour&nbsp;!</p>
                    </div>
                  ) : (
                    messages.reduce((els, msg, i) => {
                      const msgDay  = fmtDay(msg.created_at);
                      const prevDay = i > 0 ? fmtDay(messages[i - 1].created_at) : null;
                      const isOwn   = msg.sender_id === user?.id;

                      if (i === 0 || msgDay !== prevDay) {
                        els.push(
                          <div key={`day-${msg.created_at}`} style={{ display: "flex", justifyContent: "center", color: "#6E7B79", fontSize: 12, fontWeight: 500, margin: "4px 0 0" }}>
                            {msgDay}
                          </div>
                        );
                      }

                      els.push(
                        <div
                          key={msg.id}
                          style={{ display: "flex", gap: 10, maxWidth: "78%", alignSelf: isOwn ? "flex-end" : "flex-start", flexDirection: isOwn ? "row-reverse" : "row" }}
                        >
                          {/* Avatar */}
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: isOwn ? "#ADEBB3" : "#005B5B", color: isOwn ? "#005B5B" : "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12.5, flexShrink: 0 }}>
                            {isOwn ? userInitials : initFrom(msg.sender?.full_name)}
                          </div>
                          <div>
                            {/* Bubble */}
                            <div style={{
                              background: isOwn ? "#005B5B" : "#E4F6E6",
                              border: `1px solid ${isOwn ? "#005B5B" : "#D5E9D8"}`,
                              padding: "12px 14px",
                              borderRadius: 18,
                              borderTopLeftRadius: isOwn ? 18 : 6,
                              borderTopRightRadius: isOwn ? 6 : 18,
                              fontSize: 14, lineHeight: 1.45,
                              color: isOwn ? "#F3EEE0" : "#0F2A2A",
                              maxWidth: "100%", wordBreak: "break-word",
                            }}>
                              {msg.content?.includes("voice_") && msg.content?.includes(".webm") ? (
                                <audio
                                  controls
                                  src={msg.content}
                                  style={{ display: "block", minWidth: 220, maxWidth: "100%", accentColor: isOwn ? "#ADEBB3" : "#005B5B" }}
                                />
                              ) : (
                                msg.content
                              )}
                            </div>
                            {/* Timestamp */}
                            <p style={{ fontSize: 11.5, color: "#6E7B79", margin: isOwn ? "4px 4px 0 0" : "4px 0 0 4px", textAlign: isOwn ? "right" : "left" }}>
                              {fmtClock(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );

                      return els;
                    }, [])
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(newMessage); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px 16px", borderTop: "1px solid #E5DFCE" }}
                >
                  {/* User avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                    {userInitials}
                  </div>

                  {/* Pill input */}
                  <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#E4F6E6", border: "1px solid #D5E9D8", borderRadius: 999, padding: "8px 8px 8px 14px" }}>
                    {/* Hidden file input — Pillar 2 */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); e.target.value = ""; }}
                    />
                    {/* Clip icon triggers file picker */}
                    <span
                      aria-hidden="true"
                      onClick={() => imageInputRef.current?.click()}
                      style={{ color: "#005B5B", opacity: 0.7, display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M21 10.5L12 19a5 5 0 1 1-7-7l9-9a3.5 3.5 0 1 1 5 5L9.5 17a2 2 0 1 1-3-3l8-8"/>
                      </svg>
                    </span>

                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Votre message"
                      style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 14, color: "#0F2A2A", fontFamily: "inherit" }}
                    />
                  </label>

                  {/* Mic button — Pillar 3 (red when recording) */}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : handleMicClick}
                    aria-label={isRecording ? "Arrêter l'enregistrement" : "Enregistrer"}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: isRecording ? "#C13C26" : "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none", cursor: "pointer", transition: "background 0.2s" }}
                  >
                    {isRecording ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="9" y="3" width="6" height="12" rx="3"/>
                        <path d="M5 11a7 7 0 0 0 14 0"/>
                        <path d="M12 18v3"/>
                      </svg>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* No conversation selected */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <MessageCircle style={{ width: 40, height: 40, color: "#E5DFCE" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0F2A2A", margin: 0 }}>Sélectionnez une conversation</p>
                <p style={{ fontSize: 13, color: "#6E7B79", margin: 0, textAlign: "center", maxWidth: 240 }}>
                  Choisissez un contact à gauche pour commencer à échanger.
                </p>
              </div>
            )}
          </section>

          {/* ════ CONTEXT (RIGHT) ════ */}
          <aside style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <div style={{ padding: 14, gap: 14, display: "flex", flexDirection: "column", overflowY: "auto", flex: 1 }}>
              {activeConvId ? (
                <>
                  {/* ── Listing card (pc-card) ── */}
                  {activeConvListing ? (
                    <article style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      {/* Photo area */}
                      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "#E5DFCE", overflow: "hidden" }}>
                        {activeConvListing.images?.[0] ? (
                          <img
                            src={activeConvListing.images[0]}
                            alt={activeConvListing.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #005B5B, #1F7878)" }} />
                        )}
                        {/* Exchange / sale badge */}
                        <span style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "#005B5B", color: "#F3EEE0", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>
                          </svg>
                          {activeConvListing.is_for_exchange && activeConvListing.is_for_sale ? "Échange & Vente" : activeConvListing.is_for_sale ? "Vente" : "Échange"}
                        </span>
                        {/* Owner icon */}
                        <div style={{ position: "absolute", left: "50%", bottom: -20, transform: "translateX(-50%)", width: 44, height: 44, borderRadius: "50%", background: "#E4F6E6", color: "#005B5B", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #FFFFFF", boxShadow: "0 4px 10px rgba(0,0,0,.15)" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/>
                          </svg>
                        </div>
                      </div>

                      {/* Card body */}
                      <div style={{ padding: "30px 14px 16px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Location title */}
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F2A2A", letterSpacing: "-0.005em", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#005B5B" strokeWidth="1.8">
                            <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>
                          </svg>
                          {[activeConvListing.city, activeConvListing.wilaya].filter(Boolean).join(", ")}
                        </h3>
                        {/* Rooms */}
                        {activeConvListing.rooms && (
                          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, color: "#0F2A2A", fontWeight: 500 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#005B5B" strokeWidth="1.8">
                              <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>
                            </svg>
                            {activeConvListing.rooms} chambre{activeConvListing.rooms > 1 ? "s" : ""}
                          </div>
                        )}
                        {/* CTA */}
                        <button
                          onClick={() => navigate(`/listing/${activeConvListing.id}`)}
                          style={{ margin: "4px 6px 0", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#E4F6E6", border: "1px solid #D5E9D8", color: "#005B5B", fontWeight: 600, fontSize: 13.5, padding: "11px 14px", borderRadius: 999, cursor: "pointer", transition: "background 0.15s, border-color 0.15s, transform 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#ADEBB3"; e.currentTarget.style.borderColor = "#ADEBB3"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#E4F6E6"; e.currentTarget.style.borderColor = "#D5E9D8"; e.currentTarget.style.transform = "none"; }}
                        >
                          Voir l'annonce
                        </button>
                      </div>
                    </article>
                  ) : (
                    <div style={{ background: "#F3EEE0", border: "1px solid #E5DFCE", borderRadius: 22, padding: "28px 16px", textAlign: "center", color: "#6E7B79", fontSize: 13 }}>
                      Aucune annonce associée
                    </div>
                  )}

                  {/* ── Match card ── */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18, padding: "18px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                      {initFrom(activePartner?.full_name)}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ flex: 1, borderTop: "1.5px dashed #E5DFCE" }} />
                      <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#E4F6E6", color: "#005B5B", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #D5E9D8", flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 6h16v11H8l-4 3z"/>
                        </svg>
                      </span>
                      <span style={{ flex: 1, borderTop: "1.5px dashed #E5DFCE" }} />
                    </div>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#E4F6E6", color: "#005B5B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/>
                      </svg>
                    </div>
                  </div>

                  {/* ── Action buttons ── */}
                  {activeExchange ? (
                    activeExchange.status === "pending" ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                        <button
                          onClick={() => handleExchangeAction("rejected")}
                          disabled={exchangeLoading}
                          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: exchangeLoading ? "not-allowed" : "pointer", border: "1px solid #E5DFCE", background: "#FFFFFF", color: "#005B5B", transition: "border-color 0.15s", opacity: exchangeLoading ? 0.6 : 1 }}
                          onMouseEnter={(e) => { if (!exchangeLoading) e.currentTarget.style.borderColor = "#005B5B"; }}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5DFCE")}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>
                          </svg>
                          Annuler
                        </button>
                        <button
                          onClick={() => handleExchangeAction("accepted")}
                          disabled={exchangeLoading}
                          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: exchangeLoading ? "not-allowed" : "pointer", border: "1px solid #ADEBB3", background: "#ADEBB3", color: "#005B5B", transition: "background 0.15s, border-color 0.15s", opacity: exchangeLoading ? 0.6 : 1 }}
                          onMouseEnter={(e) => { if (!exchangeLoading) { e.currentTarget.style.background = "#8FD89A"; e.currentTarget.style.borderColor = "#8FD89A"; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#ADEBB3"; e.currentTarget.style.borderColor = "#ADEBB3"; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>
                          </svg>
                          Confirmer
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 2, padding: "11px 14px", borderRadius: 999, textAlign: "center", fontSize: 13.5, fontWeight: 600, background: activeExchange.status === "accepted" ? "#ADEBB3" : "#F3EEE0", color: activeExchange.status === "accepted" ? "#005B5B" : "#6E7B79", border: `1px solid ${activeExchange.status === "accepted" ? "#ADEBB3" : "#E5DFCE"}` }}>
                        {activeExchange.status === "accepted" ? "✓ Échange confirmé" : "✕ Échange annulé"}
                      </div>
                    )
                  ) : null}
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6E7B79", fontSize: 13, textAlign: "center" }}>
                  Sélectionnez une conversation pour voir les détails
                </div>
              )}
            </div>
          </aside>

        </section>
      </main>
    </div>
  );
}
