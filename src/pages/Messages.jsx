import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageCircle, Calendar, Check, X, Trash2, ArrowLeft, Pin, PinOff, Info } from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

// Shared shape for the exchange tied to a conversation: status, proposed dates,
// and the requested house. The requested listing (listing_id) is the owner's own
// house and the sender's target at once, so it's the single house shown to BOTH
// participants — sourced from the exchange record, not a per-viewer swap.
const EXCHANGE_SELECT = `id, status, requester_id, receiver_id, listing_id, offered_house_id, start_date, end_date, exchange_date,
  requested_house:listings!listing_id ( id, title, wilaya, city, rooms, images )`;

const initFrom = (name) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

// Per-user pin state. Pinning is per-participant: participant_one's pin lives in
// pinned_by_one, participant_two's in pinned_by_two. Which column is "mine"
// depends on which side of the conversation the current user sits on — never
// read or write the other participant's column.
const myPin = (conv, userId) =>
  conv.participant_one === userId ? conv.pinned_by_one : conv.pinned_by_two;
const myPinColumn = (conv, userId) =>
  conv.participant_one === userId ? "pinned_by_one" : "pinned_by_two";

// Sort the current user's pinned conversations to the top, then newest-first
// within each group. Uses the derived per-user flag (not a raw column).
const sortConversations = (list, userId) =>
  [...list].sort((a, b) => {
    const ap = myPin(a, userId), bp = myPin(b, userId);
    if (ap !== bp) return ap ? -1 : 1;
    return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
  });

// Date helpers take the active locale (and `t` for word-based labels) so
// timestamps adapt to the current language.
const fmtRelativeTime = (ts, t, locale = "fr-DZ") => {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return t("messages.now");
  if (diff < 3_600_000) return t("messages.minutesAgo", { count: Math.floor(diff / 60_000) });
  if (diff < 86_400_000)
    return new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "short" });
};

const fmtClock = (ts, locale = "fr-DZ") =>
  ts ? new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";

const fmtDay = (ts, locale = "fr-DZ") =>
  ts ? new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "long" }) : "";

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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? "en-US" : "fr-DZ";
  const navigate = useNavigate();
  const location = useLocation();
  // In-app navigation (e.g. from ListingDetail) preselects via router state.
  const preselectedConvId = location.state?.conversationId ?? null;
  const activeChatUserId   = location.state?.activeChatUserId ?? null;
  const activeChatUserName = location.state?.activeChatUserName ?? null;
  // The listing this chat is about, when arriving from Exchanges (which has no
  // existing conversation row to read it from). Used only when CREATING a thread.
  const activeChatListingId = location.state?.listingId ?? null;
  // Deep-link support: notifications route here as /messages?convId=<id>.
  const queryConvId = new URLSearchParams(location.search).get("convId");

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
  const [confirmStartDate, setConfirmStartDate] = useState("");
  const [confirmEndDate, setConfirmEndDate] = useState("");
  const [hoveredMsgId, setHoveredMsgId]   = useState(null);
  const [unreadConvIds, setUnreadConvIds] = useState(() => new Set());
  const [deleteConvTarget, setDeleteConvTarget] = useState(null);
  // Phone long-press → bottom action sheet (Pin/Unpin · Delete) for a conversation.
  const [actionSheetConv, setActionSheetConv] = useState(null);
  // Phone third-pane toggle. The 3-column desktop grid shows the context aside
  // permanently; on phone the panes are a 3-level stack (Inbox → Chat → Context)
  // and this flag is what promotes Context to full-screen. Ignored on desktop.
  const [contextOpen, setContextOpen] = useState(false);

  // Phone single-pane navigation: below lg the 3-column grid would stack and
  // scroll, so we render exactly one pane at a time (Inbox when no conversation
  // is open, Chat once one is). Desktop (lg+) keeps the untouched 3-column grid.
  // matchMedia mirrors Sidebar.jsx's approach so the breakpoint stays consistent
  // (inline styles/widths would beat a class, hence a JS flag, not a CSS class).
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const messagesEndRef   = useRef(null);
  const channelRef       = useRef(null);
  const didAutoSelect    = useRef(false);
  const longPressTimer   = useRef(null);
  const longPressFired   = useRef(false);
  const imageInputRef    = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const activeConvIdRef  = useRef(null);

  // Keep a ref of the open conversation so the inbox subscription (which is set up
  // once per user) can tell whether an incoming message belongs to the open thread.
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // Phone: opening, switching, or closing a conversation always lands on the Chat
  // pane (or Inbox when null) — never the Context pane. Reset the third-pane toggle
  // whenever the active thread changes so a different thread never opens in Context.
  useEffect(() => { setContextOpen(false); }, [activeConvId]);

  const markConvRead = useCallback((convId) => {
    setUnreadConvIds((prev) => {
      if (!convId || !prev.has(convId)) return prev;
      const next = new Set(prev);
      next.delete(convId);
      return next;
    });
  }, []);

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/login"); return; }
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

    setConversations(sortConversations(mapped, user.id));
    setLoadingConvs(false);
  }, [user]);

  useEffect(() => {
    (async () => { await fetchConversations(); })();
  }, [fetchConversations]);

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

  // ── Fetch exchange for active conversation ────────────────────────────────
  // Declared before the auto-select effects below so they can call it safely.
  // Look the exchange up by the *participant pair* (me ↔ partner), in either
  // direction, rather than by the conversation's listing id. The same exchange
  // must resolve identically whether the logged-in user is the requester or the
  // receiver — keying off requester/receiver makes it symmetric.
  const fetchExchange = useCallback(async (partnerId, listingId) => {
    if (!user || !partnerId) { setActiveExchange(null); return; }
    let query = supabase
      .from("exchanges")
      .select(EXCHANGE_SELECT)
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${partnerId}),` +
        `and(requester_id.eq.${partnerId},receiver_id.eq.${user.id})`
      );
    // Scope to the listing this conversation is tied to, so the status/dates
    // belong to THIS thread's property — not just the newest swap between the
    // pair. The conversation's listing can sit on either side of the swap.
    if (listingId) {
      query = query.or(`listing_id.eq.${listingId},offered_house_id.eq.${listingId}`);
    }
    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(1);
    setActiveExchange(data?.[0] ?? null);
  }, [user]);

  // ── Auto-select when arriving from ListingDetail ─────────────────────────
  useEffect(() => {
    if (!preselectedConvId || !user || didAutoSelect.current || conversations.length === 0) return;
    const conv = conversations.find((c) => c.id === preselectedConvId);
    if (!conv) return;
    didAutoSelect.current = true;
    (async () => {
      setActiveConvId(conv.id);
      setActivePartner(conv.partner);
      setActiveConvListing(conv.listing ?? null);
      markConvRead(conv.id);
      fetchMessages(conv.id);
      fetchExchange(conv.partner?.id ?? null, conv.listing?.id ?? conv.listing_id ?? null);
    })();
  }, [conversations, user, preselectedConvId, fetchMessages, fetchExchange, markConvRead]);

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
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          fetchConversations();
        },
      )
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [activeConvId, user, fetchConversations]);

  // ── Inbox-wide realtime ────────────────────────────────────────────────────
  // One extra subscription (on the same WebSocket) for every incoming message
  // addressed to the current user, so the conversation list reorders / shows an
  // unread marker live — even for threads that aren't currently open.
  useEffect(() => {
    if (!user) return;
    const inboxCh = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const convId = payload.new?.conversation_id;
          if (convId && convId !== activeConvIdRef.current) {
            setUnreadConvIds((prev) => {
              if (prev.has(convId)) return prev;
              const next = new Set(prev);
              next.add(convId);
              return next;
            });
          }
          fetchConversations(); // refresh previews + ordering
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(inboxCh); };
  }, [user, fetchConversations]);

  // ── Realtime: exchange status ──────────────────────────────────────────────
  // When either party confirms/cancels, both chats reflect the new status live.
  // payload.new carries only raw columns, so we merge it onto the joined houses
  // we already hold rather than replacing the object outright.
  useEffect(() => {
    if (!activeExchange?.id) return;
    const exCh = supabase
      .channel(`exchange-${activeExchange.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "exchanges", filter: `id=eq.${activeExchange.id}` },
        (payload) => {
          setActiveExchange((prev) => (prev && prev.id === payload.new.id ? { ...prev, ...payload.new } : prev));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(exCh); };
  }, [activeExchange?.id]);

  // ── Auto-select / create conversation when arriving from Exchanges ────────
  useEffect(() => {
    if (!activeChatUserId || !user || didAutoSelect.current || loadingConvs) return;

    const existing = conversations.find((c) => c.partner?.id === activeChatUserId);
    if (existing) {
      didAutoSelect.current = true;
      (async () => {
        setActiveConvId(existing.id);
        setActivePartner(existing.partner);
        setActiveConvListing(existing.listing ?? null);
        setActiveExchange(null);
        markConvRead(existing.id);
        fetchMessages(existing.id);
        fetchExchange(existing.partner?.id ?? null, existing.listing?.id ?? existing.listing_id ?? null);
      })();
      return;
    }

    // No conversation with this user yet — create an empty one, then open it.
    didAutoSelect.current = true;
    (async () => {
      // conversations table requires participant_one < participant_two (UUID order)
      const [p1, p2] = [user.id, activeChatUserId].sort();
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ participant_one: p1, participant_two: p2, listing_id: activeChatListingId })
        .select("*, listing:listings(id, title, wilaya, city, rooms, images, is_for_exchange, is_for_sale)")
        .single();
      if (error || !created) {
        console.error("[Messages] could not start conversation:", error);
        didAutoSelect.current = false;
        return;
      }
      const { data: partner } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", activeChatUserId)
        .maybeSingle();
      const conv = {
        ...created,
        partner: partner ?? { id: activeChatUserId, full_name: activeChatUserName, avatar_url: null },
      };
      setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
      setActiveConvId(conv.id);
      setActivePartner(conv.partner);
      setActiveConvListing(conv.listing ?? null);
      setActiveExchange(null);
      fetchMessages(conv.id);
    })();
  }, [conversations, user, activeChatUserId, activeChatUserName, activeChatListingId, loadingConvs, fetchMessages, fetchExchange, markConvRead]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectConversation = useCallback((conv) => {
    setActiveConvId(conv.id);
    setActivePartner(conv.partner);
    setActiveConvListing(conv.listing ?? null);
    setActiveExchange(null);
    markConvRead(conv.id);
    fetchMessages(conv.id);
    fetchExchange(conv.partner?.id ?? null, conv.listing?.id ?? conv.listing_id ?? null);
  }, [markConvRead, fetchMessages, fetchExchange]);

  // ── Deep-link: open the thread named by ?convId= ───────────────────────────
  // Works on fresh load AND when a notification is clicked while already on
  // /messages (the route doesn't remount). Once consumed, the query is stripped
  // so manually picking another thread isn't snapped back — and clicking the same
  // notification again re-adds the query and re-triggers this effect.
  useEffect(() => {
    if (!queryConvId || !user || conversations.length === 0) return;
    const conv = conversations.find((c) => c.id === queryConvId);
    if (!conv) return;
    (async () => {
      selectConversation(conv);
      navigate("/messages", { replace: true });
    })();
  }, [queryConvId, user, conversations, selectConversation, navigate]);

  const handleExchangeAction = async (newStatus) => {
    if (!activeExchange || exchangeLoading) return;
    setExchangeLoading(true);
    const payload = { status: newStatus, updated_by: user.id };
    if (newStatus === "confirmed") {
      if (confirmStartDate) payload.start_date = confirmStartDate;
      if (confirmEndDate) payload.end_date = confirmEndDate;
    }
    const { data, error } = await supabase
      .from("exchanges")
      .update(payload)
      .eq("id", activeExchange.id)
      .select(EXCHANGE_SELECT)
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
    const previewText = content.includes(".webm") ? "🎤 Message vocal" : content.slice(0, 80);
    // Bump the conversation BEFORE inserting the message: the message-insert event
    // is what wakes up the recipient's inbox, so the conversation row must already
    // carry the fresh last_message_at by then for live reordering to be correct.
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString(), last_message_preview: previewText })
      .eq("id", activeConvId);
    const { data: msg } = await supabase
      .from("messages")
      .insert({ conversation_id: activeConvId, sender_id: user.id, receiver_id: receiverId, content })
      .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)")
      .single();
    if (msg) setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);

    fetchConversations();
    setSending(false);
  };

  const handleSendMessage = (text) => {
    if (!text.trim() || !activeConvId || sending) return;
    setNewMessage("");
    handleSend(text.trim());
  };

  // ── Delete a message globally (sender only, propagates via realtime) ───────
  const handleDeleteMessage = async (id) => {
    // Optimistic removal for the current user
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) {
      console.error("[handleDeleteMessage]", error);
      if (activeConvId) fetchMessages(activeConvId); // restore on failure
      return;
    }
    fetchConversations(); // refresh inbox preview if the last message was removed
  };

  // ── Delete an entire conversation (participant only) ───────────────────────
  // Messages cascade-delete via the conversation_id FK (ON DELETE CASCADE).
  const handleDeleteConversation = async (convId) => {
    if (!convId) return;
    const prevConvs = conversations;
    // Optimistic: drop from the inbox and clear the chat pane if it was open.
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    markConvRead(convId);
    if (activeConvId === convId) {
      setActiveConvId(null);
      setActivePartner(null);
      setActiveConvListing(null);
      setActiveExchange(null);
      setMessages([]);
    }
    const { error } = await supabase.from("conversations").delete().eq("id", convId);
    if (error) {
      console.error("[handleDeleteConversation]", error);
      setConversations(prevConvs); // restore on failure
      return;
    }
    fetchConversations();
  };

  // Phone back button: deselect the open conversation so the Inbox pane shows
  // again. Same state-reset the delete flow already does when the active thread
  // goes away (activeConvId/partner/listing/exchange/messages).
  const handleBackToInbox = () => {
    setActiveConvId(null);
    setActivePartner(null);
    setActiveConvListing(null);
    setActiveExchange(null);
    setMessages([]);
  };

  // ── Phone long-press → action sheet ────────────────────────────────────────
  // Hold ~500ms without scrolling to open the Pin/Delete sheet for a row. A
  // short tap still opens the chat (longPressFired guards the click that fires
  // after touchend). Touch-only + phone-only — desktop uses the chat-header trash.
  const startLongPress = (conv) => {
    if (isDesktop) return;
    longPressFired.current = false;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) navigator.vibrate(8);
      setActionSheetConv(conv);
    }, 500);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);
  const handleRowClick = (conv) => {
    // Suppress the synthetic click that follows a completed long-press.
    if (longPressFired.current) { longPressFired.current = false; return; }
    selectConversation(conv);
  };

  // Toggle the current user's own pin column, optimistically re-sorting. Never
  // touches the other participant's column. (RLS conv_update already permits
  // either participant to update their row.)
  const handleTogglePin = async (conv) => {
    if (!conv || !user) return;
    const col = myPinColumn(conv, user.id);
    const next = !myPin(conv, user.id);
    setActionSheetConv(null);
    const prevConvs = conversations;
    setConversations((prev) =>
      sortConversations(prev.map((c) => (c.id === conv.id ? { ...c, [col]: next } : c)), user.id)
    );
    const { error } = await supabase.from("conversations").update({ [col]: next }).eq("id", conv.id);
    if (error) {
      console.error("[handleTogglePin]", error);
      setConversations(prevConvs); // restore on failure
    }
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
      alert(t("messages.voiceError", { error: error.message }));
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

  // Phone single-pane gating. Desktop (lg+) always renders all three panes via
  // the existing grid → identical to before (contextOpen ignored). On phone the
  // panes are a 3-level stack, exactly one visible at a time:
  //   no conversation              → Inbox
  //   conversation, !contextOpen   → Chat
  //   conversation,  contextOpen   → Context
  const showInboxPane   = isDesktop || !activeConvId;
  const showChatPane    = isDesktop || (!!activeConvId && !contextOpen);
  const showContextPane = isDesktop || (!!activeConvId && contextOpen);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="msg-page-grid" style={{ display: "grid", minHeight: "100vh", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar active="Messages" />

      <main className="msg-main" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#F3EEE0" }}>
        {/* Phone full-bleed: panes fill edge-to-edge (no white card floating in
            beige). Class-owned so it switches at lg without inline beating it —
            phone strips the page padding, the pane border/radius, and insets only
            the heading; lg+ restores the exact desktop card chrome. */}
        <style>{`
          .msg-main { padding: 0; }
          /* Phone: heading becomes the screen's white top bar (continuous with
             the white list below) with a hairline divider, instead of a beige
             band floating above a white card. safe-area top keeps the title
             clear of the notch. */
          .msg-heading {
            padding-left: 16px; padding-right: 16px;
            padding-top: calc(14px + env(safe-area-inset-top, 0px));
            background: #FFFFFF; border-bottom: 1px solid #E5DFCE;
          }
          /* Phone: hide the in-pane Inbox/search tab row — its search moves up
             into the heading control cluster and "Messages" already titles the
             screen. */
          .msg-tabrow { display: none; }
          .msg-pane { border: none; border-radius: 0; }
          /* Phone-first: the voice-message <audio> control fills its bubble with
             no fixed min that exceeds the bubble interior — on a ~320-360px screen
             the bubble (maxWidth 78%) is narrower than 220px, so a hard min would
             overflow/clip. Desktop restores the comfortable 220px below. */
          .msg-audio { min-width: 0; width: 100%; }
          /* Phone: below lg the section has no column template (lg:/xl: classes
             only kick in at 1024px+), so it falls back to an implicit auto track
             that content-sizes and packs left, leaving a beige gap on the right.
             Force one full-width track. Scoped to max-width:1023px so it can never
             touch the desktop lg:/xl: grid-cols templates. */
          @media (max-width: 1023px) {
            /* Root cause of the inbox right gap: on phone the Sidebar is
               position:fixed (out of flow), so <main> lands in the page grid's
               first (auto) column and content-sizes, leaving the 1fr column empty
               on the right. Collapse the page grid to one full-width column on
               phone so <main> fills the viewport. */
            .msg-page-grid { grid-template-columns: minmax(0, 1fr); }
            .msg-pane-grid { grid-template-columns: minmax(0, 1fr); }
            .msg-pane { box-sizing: border-box; }
          }
          @media (min-width: 1024px) {
            .msg-page-grid { grid-template-columns: auto 1fr; }
            .msg-main { padding: 22px 28px 28px; }
            .msg-heading {
              padding-left: 0; padding-right: 0; padding-top: 0;
              background: transparent; border-bottom: none;
            }
            .msg-tabrow { display: flex; }
            .msg-pane { border: 1px solid #E5DFCE; border-radius: 22px; }
            .msg-audio { min-width: 220px; width: auto; }
          }
        `}</style>

        {/* Cap + center the messenger so the chat column doesn't sprawl on wide
            screens. flex justify-center (not mx-auto: the global * { margin: 0 }
            reset in index.css overrides Tailwind's margin-inline:auto). */}
        <div className="flex justify-center flex-1 min-h-0">
        <div className="flex flex-col w-full max-w-7xl min-h-0">

        {/* ── Topbar ── */}
        {/* Phone: hide this global "Messages" topbar once a conversation is open
            (Chat or Context) — the chat's own header (back + partner + info chip)
            replaces it, so we avoid two stacked headers and reclaim the vertical
            space for the full-screen pane. Desktop (lg+) always shows it. */}
        {(isDesktop || !activeConvId) && (
        <header className="msg-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#0F2A2A" }}>{t("messages.title")}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Phone-only search — grouped with the bell + avatar so the top-right
                controls read as one cluster. The desktop search stays in the tab
                row (which is hidden on phone). Display is class-owned (lg:hidden)
                so no inline `display` beats the hide. */}
            <button
              type="button"
              aria-label={t("messages.search")}
              className="inline-flex items-center justify-center lg:hidden"
              style={{ width: 38, height: 38, borderRadius: "50%", color: "#005B5B", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,91,91,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
              </svg>
            </button>
            <NotificationBell userId={user?.id} />
            <div
              style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}
              title={user?.user_metadata?.full_name || user?.email}
            >
              {userInitials}
            </div>
          </div>
        </header>
        )}

        {/* ── 3-column messenger ── */}
        <section className="msg-pane-grid lg:grid-cols-[200px_minmax(0,1fr)_220px] xl:grid-cols-[300px_minmax(0,1fr)_320px]" style={{ flex: 1, display: "grid", gap: 18, alignItems: "stretch", minHeight: 0 }}>

          {/* ════ INBOX (LEFT) ════ */}
          {showInboxPane && (
          <aside className="msg-pane" style={{ background: "#FFFFFF", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

            <div className="msg-tabrow" style={{ padding: "18px 18px 12px", alignItems: "center", gap: 14, borderBottom: "1px solid #E5DFCE" }}>
              <div style={{ display: "flex", gap: 14, flex: 1 }}>
                <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 2px", fontSize: 14, fontWeight: 600, color: "#005B5B", background: "none", border: "none", borderBottom: "2px solid #005B5B", cursor: "pointer" }}>
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 7l9 6 9-6"/><rect x="3" y="5" width="18" height="14" rx="2"/>
                  </svg>
                  {t("messages.inbox")}
                </button>
              </div>
              <button
                aria-label={t("messages.search")}
                style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#005B5B", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,91,91,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
                </svg>
              </button>
            </div>

            <div className="nice-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 10px 14px" }}>
              {loadingConvs ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonConversation key={i} />)
              ) : conversations.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <MessageCircle style={{ width: 36, height: 36, color: "#E5DFCE", margin: "0 auto 12px", display: "block" }} />
                  <p style={{ fontSize: 14, color: "#6E7B79", margin: 0 }}>{t("messages.noConversations")}</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const { partner } = conv;
                  const isActive = conv.id === activeConvId;
                  const isUnread = !isActive && unreadConvIds.has(conv.id);
                  const isPinned = myPin(conv, user?.id);
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleRowClick(conv)}
                      onTouchStart={() => startLongPress(conv)}
                      onTouchMove={cancelLongPress}
                      onTouchEnd={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      style={{
                        display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 12,
                        alignItems: "center", padding: isActive ? "11px 11px" : "12px 12px",
                        borderRadius: 14, cursor: "pointer", position: "relative",
                        background: isActive ? "#E4F6E6" : "transparent",
                        border: `1px solid ${isActive ? "#D5E9D8" : "transparent"}`,
                        transition: "background 0.15s",
                        marginBottom: 2,
                        WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#FAF7EC"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                        {initFrom(partner?.full_name)}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0F2A2A", letterSpacing: "-0.005em", margin: "0 0 2px", lineHeight: 1.1 }}>
                          {partner?.full_name || t("messages.userFallback")}
                          {conv.last_message_at && (
                            <span style={{ color: "#6E7B79", fontWeight: 500, fontSize: 11.5, marginLeft: 8 }}>
                              {fmtRelativeTime(conv.last_message_at, t, dateLocale)}
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: 12.5, color: isUnread ? "#0F2A2A" : "#6E7B79", fontWeight: isUnread ? 600 : 400, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 185 }}>
                          {conv.last_message_preview?.includes(".webm") || conv.last_message_preview?.startsWith("https://") ? t("messages.voiceMessage") : (conv.last_message_preview || t("messages.startConversation"))}
                        </p>
                      </div>
                      {/* Pin indicator (per-user state) + unread dot. Third grid
                          column is auto-width, so it collapses when both are off.
                          The pin reflects state and is harmless on desktop too. */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, alignSelf: "center" }}>
                        {isPinned && (
                          <Pin aria-label={t("messages.pin")} style={{ width: 13, height: 13, color: "#005B5B", fill: "#005B5B" }} />
                        )}
                        {isUnread && (
                          <span aria-label={t("messages.unread")} style={{ width: 9, height: 9, borderRadius: "50%", background: "#005B5B" }} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
          )}

          {/* ════ CHAT (CENTER) ════ */}
          {showChatPane && (
          <section className="msg-pane" style={{ background: "#FFFFFF", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {activeConvId ? (
              <>
                {/* Chat header */}
                <header style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #E5DFCE" }}>
                  {/* Back to inbox — phone only (lg:hidden). Display is class-owned
                      (inline-flex / lg:hidden) so no inline `display` beats the
                      hide; desktop never renders it. */}
                  <button
                    type="button"
                    onClick={handleBackToInbox}
                    aria-label={t("messages.back")}
                    title={t("messages.back")}
                    className="inline-flex items-center justify-center lg:hidden"
                    style={{ width: 38, height: 38, borderRadius: "50%", color: "#005B5B", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0, marginLeft: -6 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,91,91,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <ArrowLeft style={{ width: 20, height: 20 }} />
                  </button>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                    {initFrom(activePartner?.full_name)}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#0F2A2A", margin: 0, lineHeight: 1.1 }}>
                      {activePartner?.full_name || t("messages.userFallback")}
                    </p>
                    <button
                      onClick={() => navigate(`/profile/${activePartner?.id}`)}
                      style={{ fontSize: 12.5, color: "#005B5B", fontWeight: 500, margin: "2px 0 0", display: "inline-flex", gap: 4, alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {t("messages.viewProfile")}
                    </button>
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Header trailing slot — phone/desktop split, same position.
                      DESKTOP (lg+): delete-conversation trash, unchanged. Display
                      is class-owned (hidden lg:inline-flex) so the inline style
                      carries no `display` that could beat the hide. */}
                  <button
                    type="button"
                    onClick={() => setDeleteConvTarget({ id: activeConvId, name: activePartner?.full_name })}
                    aria-label={t("messages.deleteConversation")}
                    title={t("messages.deleteConversation")}
                    className="hidden lg:inline-flex items-center justify-center"
                    style={{ width: 38, height: 38, borderRadius: "50%", color: "#6E7B79", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0, transition: "background 0.15s, color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(193,60,38,0.10)"; e.currentTarget.style.color = "#C13C26"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#6E7B79"; }}
                  >
                    <Trash2 style={{ width: 18, height: 18 }} />
                  </button>
                  {/* PHONE (below lg): open the Context pane (3rd-level full screen).
                      Delete already lives in the inbox long-press sheet on phone, so
                      this slot is free. Accent green chip with a teal Info icon so it
                      reads as a tappable "details" affordance, not a flat glyph. */}
                  <button
                    type="button"
                    onClick={() => setContextOpen(true)}
                    aria-label={t("messages.exchangeDetails")}
                    title={t("messages.exchangeDetails")}
                    className="lg:hidden inline-flex items-center justify-center"
                    style={{ width: 38, height: 38, borderRadius: 999, color: "#005B5B", background: "#ADEBB3", border: "none", cursor: "pointer", flexShrink: 0, padding: 8, transition: "background 0.15s, transform 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#9BE0A2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ADEBB3")}
                  >
                    <Info style={{ width: 19, height: 19 }} />
                  </button>
                </header>

                {/* Message stream */}
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 8px", display: "flex", flexDirection: "column", gap: 14, background: "linear-gradient(180deg, #FFFFFF, #FFFDF7)" }}>
                  {loadingMsgs ? (
                    ["left", "right", "left"].map((align, i) => <SkeletonMessage key={i} align={align} />)
                  ) : messages.length === 0 ? (
                    <div style={{ margin: "auto", textAlign: "center" }}>
                      <MessageCircle style={{ width: 36, height: 36, color: "#E5DFCE", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: 14, color: "#6E7B79", margin: 0 }}>{t("messages.noMessages")}</p>
                    </div>
                  ) : (
                    messages.reduce((els, msg, i) => {
                      const msgDay  = fmtDay(msg.created_at, dateLocale);
                      const prevDay = i > 0 ? fmtDay(messages[i - 1].created_at, dateLocale) : null;
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
                          onMouseEnter={() => setHoveredMsgId(msg.id)}
                          onMouseLeave={() => setHoveredMsgId((id) => (id === msg.id ? null : id))}
                          style={{ display: "flex", gap: 10, maxWidth: "78%", alignSelf: isOwn ? "flex-end" : "flex-start", flexDirection: isOwn ? "row-reverse" : "row" }}
                        >
                          {/* Avatar */}
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: isOwn ? "#ADEBB3" : "#005B5B", color: isOwn ? "#005B5B" : "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12.5, flexShrink: 0 }}>
                            {isOwn ? userInitials : initFrom(msg.sender?.full_name)}
                          </div>
                          <div style={{ position: "relative" }}>
                            {/* Delete (own messages only) — appears on hover.
                                Anchored flush to the bubble's left edge with padding acting as an
                                invisible bridge, so the cursor never crosses a dead zone gap. */}
                            {isOwn && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                aria-label={t("messages.deleteMessage")}
                                title={t("messages.delete")}
                                style={{
                                  position: "absolute", right: "100%", top: "50%", transform: "translateY(-50%)",
                                  marginRight: -2, padding: 8, borderRadius: "50%", lineHeight: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  border: "none", background: "transparent", color: "#6E7B79",
                                  cursor: "pointer", flexShrink: 0,
                                  opacity: hoveredMsgId === msg.id ? 1 : 0,
                                  pointerEvents: hoveredMsgId === msg.id ? "auto" : "none",
                                  transition: "opacity 0.15s, background 0.15s, color 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(193,60,38,0.10)"; e.currentTarget.style.color = "#C13C26"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6E7B79"; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6m5 4v6m4-6v6"/>
                                </svg>
                              </button>
                            )}
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
                                  className="msg-audio"
                                  style={{ display: "block", maxWidth: "100%", accentColor: isOwn ? "#ADEBB3" : "#005B5B" }}
                                />
                              ) : (
                                msg.content
                              )}
                            </div>
                            {/* Timestamp */}
                            <p style={{ fontSize: 11.5, color: "#6E7B79", margin: isOwn ? "4px 4px 0 0" : "4px 0 0 4px", textAlign: isOwn ? "right" : "left" }}>
                              {fmtClock(msg.created_at, dateLocale)}
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
                      placeholder={t("messages.placeholder")}
                      style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 14, color: "#0F2A2A", fontFamily: "inherit" }}
                    />
                  </label>

                  {/* Mic button — Pillar 3 (red when recording) */}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : handleMicClick}
                    aria-label={isRecording ? t("messages.stopRecording") : t("messages.record")}
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
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0F2A2A", margin: 0 }}>{t("messages.selectConversation")}</p>
                <p style={{ fontSize: 13, color: "#6E7B79", margin: 0, textAlign: "center", maxWidth: 240 }}>
                  {t("messages.selectConversationHint")}
                </p>
              </div>
            )}
          </section>
          )}

          {/* ════ CONTEXT (RIGHT) ════ */}
          {showContextPane && (
          <aside className="msg-pane" style={{ background: "#FFFFFF", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {/* Phone-only context header: back to Chat + screen title, so the
                full-screen Context pane reads as its own step in the stack. Desktop
                renders the context as the permanent 3rd column with no header — the
                lg:hidden hides this entirely there (display: none), leaving the
                desktop layout pixel-identical. Title is the listing name when known,
                else the generic "exchange details" label. */}
            <header className="lg:hidden" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #E5DFCE", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setContextOpen(false)}
                aria-label={t("messages.back")}
                title={t("messages.back")}
                className="inline-flex items-center justify-center"
                style={{ width: 38, height: 38, borderRadius: "50%", color: "#005B5B", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0, marginLeft: -6 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,91,91,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <ArrowLeft style={{ width: 20, height: 20 }} />
              </button>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F2A2A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeConvListing?.title || t("messages.exchangeDetails")}
              </p>
            </header>
            <div style={{ padding: 14, gap: 14, display: "flex", flexDirection: "column", overflowY: "auto", flex: 1 }}>
              {activeConvId ? (
                <>
                  {/* ── Exchange details (house being swapped, dates, shared decision) ── */}
                  {/* Gated on the listing being an actual exchange: sale-only
                      listings (is_for_exchange false) never show this card or its
                      date-confirmation form — only the property card below. The
                      flag comes from conversations.listing_id, so both participants
                      evaluate it identically. */}
                  {activeExchange && activeConvListing?.is_for_exchange && (() => {
                    // The house shown is the exchange's requested listing
                    // (exchanges.listing_id): it is simultaneously the sender's
                    // requested target and the owner's own house, so both
                    // participants see the SAME listing — never a per-viewer swap.
                    // Fall back to the conversation's listing if the join is absent.
                    const house = activeExchange.requested_house || activeConvListing;
                    const { start_date, end_date, status } = activeExchange;
                    const dateText = (start_date || end_date)
                      ? [fmtDay(start_date, dateLocale), fmtDay(end_date, dateLocale)].filter(Boolean).join(" – ")
                      : t("messages.flexibleDates");
                    const loc = house
                      ? [house.city, house.wilaya].filter(Boolean).join(", ")
                      : "";
                    return (
                      <section style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        {/* Panel label */}
                        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F0EAD9" }}>
                          <p style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#005B5B", fontWeight: 700 }}>
                            {t("messages.exchangeDetails")}
                          </p>
                        </div>

                        {/* House photo */}
                        <div style={{ position: "relative", width: "100%", aspectRatio: "16/10", background: "#E5DFCE", overflow: "hidden" }}>
                          {house?.images?.[0]
                            ? <img src={house.images[0]} alt={house.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#005B5B,#1F7878)" }} />}
                          <span style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "#005B5B", color: "#F3EEE0", padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>
                            {t("messages.exchangeSummary")}
                          </span>
                        </div>

                        {/* House meta */}
                        <div style={{ padding: "14px 16px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F2A2A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {house?.title || t("messages.noListing")}
                          </p>
                          {loc && (
                            <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0F2A2A", fontWeight: 500 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#005B5B" strokeWidth="1.8">
                                <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>
                              </svg>
                              {loc}
                            </p>
                          )}
                          {/* Only when the requester actually specified a date —
                              omit the line entirely when "date souhaitée" was empty. */}
                          {(start_date || end_date) && (
                            <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6E7B79" }}>
                              <Calendar style={{ width: 13, height: 13 }} /> {t("messages.proposedDates")}: <strong style={{ color: "#0F2A2A", fontWeight: 600 }}>{dateText}</strong>
                            </p>
                          )}
                        </div>

                        {/* Shared decision (date pickers only): the Cancel/Confirm
                            actions and the confirmed/cancelled status badge now live
                            BELOW the match-icon row (outside this card). The pickers
                            stay here, next to the proposed dates, while pending. */}
                        {(status === "pending" || status === "accepted") && (
                          <div style={{ padding: "12px 16px 16px" }}>
                            <p style={{ margin: "0 0 8px", textAlign: "center", fontSize: 12, color: "#6E7B79" }}>
                              {t("messages.confirmHint")}
                            </p>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#0F2A2A", marginBottom: 6 }}>
                                {t("messages.exchangeDateLabel")}
                              </label>
                              <div style={{ display: "flex", gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ display: "block", fontSize: 11, color: "#6E7B79", marginBottom: 3 }}>Du</label>
                                  <input
                                    type="date"
                                    value={confirmStartDate}
                                    onChange={(e) => {
                                      setConfirmStartDate(e.target.value);
                                      if (confirmEndDate && e.target.value > confirmEndDate) setConfirmEndDate("");
                                    }}
                                    min={start_date ? start_date.split("T")[0] : new Date().toISOString().split("T")[0]}
                                    max="2027-12-31"
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #D9D4C4", background: "#F7F4EA", fontSize: 13, fontFamily: "inherit", color: "#0F2A2A", boxSizing: "border-box" }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ display: "block", fontSize: 11, color: "#6E7B79", marginBottom: 3 }}>Au</label>
                                  <input
                                    type="date"
                                    value={confirmEndDate}
                                    onChange={(e) => setConfirmEndDate(e.target.value)}
                                    min={confirmStartDate || (start_date ? start_date.split("T")[0] : new Date().toISOString().split("T")[0])}
                                    max="2027-12-31"
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #D9D4C4", background: "#F7F4EA", fontSize: 13, fontFamily: "inherit", color: "#0F2A2A", boxSizing: "border-box" }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })()}

                  {/* ── Listing card (pc-card) ── */}
                  {/* Hidden when the exchange card above is showing (it already
                      renders the property) — so exchanges show a single card, not a
                      duplicate. Sales (is_for_exchange false) and exchange listings
                      with no exchange record yet still fall through to this card. */}
                  {activeConvListing && !(activeExchange && activeConvListing.is_for_exchange) ? (
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
                          {activeConvListing.is_for_exchange && activeConvListing.is_for_sale ? t("messages.badge.exchangeSale") : activeConvListing.is_for_sale ? t("messages.badge.sale") : t("messages.badge.exchange")}
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
                            {t("messages.rooms", { count: activeConvListing.rooms })}
                          </div>
                        )}
                        {/* CTA */}
                        <button
                          onClick={() => navigate(`/listing/${activeConvListing.id}`)}
                          style={{ margin: "4px 6px 0", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#E4F6E6", border: "1px solid #D5E9D8", color: "#005B5B", fontWeight: 600, fontSize: 13.5, padding: "11px 14px", borderRadius: 999, cursor: "pointer", transition: "background 0.15s, border-color 0.15s, transform 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#ADEBB3"; e.currentTarget.style.borderColor = "#ADEBB3"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#E4F6E6"; e.currentTarget.style.borderColor = "#D5E9D8"; e.currentTarget.style.transform = "none"; }}
                        >
                          {t("messages.viewListing")}
                        </button>
                      </div>
                    </article>
                  ) : !activeConvListing && !activeExchange ? (
                    // Empty-state only when there's strictly no listing AND no exchange.
                    // When the exchange card rendered the house, this stays hidden.
                    <div style={{ background: "#F3EEE0", border: "1px solid #E5DFCE", borderRadius: 22, padding: "28px 16px", textAlign: "center", color: "#6E7B79", fontSize: 13 }}>
                      {t("messages.noListing")}
                    </div>
                  ) : null}

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

                  {/* ── Shared decision actions (moved below the match row) ── */}
                  {/* Relocated out of the exchange card so the Cancel/Confirm pills
                      (pending) — or the confirmed/cancelled status badge — sit under
                      the match-icon row. Same gating and conditional logic as before,
                      just a sibling here instead of inside the card. Re-destructures
                      activeExchange since the card's IIFE scope ended above. */}
                  {activeExchange && activeConvListing?.is_for_exchange && (() => {
                    const { status } = activeExchange;
                    return (
                      <div>
                        {(status === "pending" || status === "accepted") && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleExchangeAction("cancelled")}
                              disabled={exchangeLoading}
                              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: exchangeLoading ? "not-allowed" : "pointer", border: "1px solid #D9D4C4", background: "#FFFFFF", color: "#6E7B79", opacity: exchangeLoading ? 0.6 : 1, transition: "background 0.15s, border-color 0.15s" }}
                              onMouseEnter={(e) => { if (!exchangeLoading) { e.currentTarget.style.background = "#F7F4EA"; e.currentTarget.style.borderColor = "#CFC9B7"; } }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.borderColor = "#D9D4C4"; }}
                            >
                              <X style={{ width: 14, height: 14 }} /> {t("messages.cancel")}
                            </button>
                            <button
                              onClick={() => handleExchangeAction("confirmed")}
                              disabled={exchangeLoading || !confirmStartDate || !confirmEndDate}
                              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: (exchangeLoading || !confirmStartDate || !confirmEndDate) ? "not-allowed" : "pointer", border: "1px solid #E7B73A", background: "#F4C84B", color: "#3D2E00", opacity: (exchangeLoading || !confirmStartDate || !confirmEndDate) ? 0.6 : 1, transition: "background 0.15s, border-color 0.15s" }}
                              onMouseEnter={(e) => { if (!exchangeLoading && confirmStartDate && confirmEndDate) { e.currentTarget.style.background = "#EFBE33"; e.currentTarget.style.borderColor = "#D9A92B"; } }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#F4C84B"; e.currentTarget.style.borderColor = "#E7B73A"; }}
                            >
                              <Check style={{ width: 14, height: 14 }} /> {t("messages.confirm")}
                            </button>
                          </div>
                        )}
                        {status === "confirmed" && (
                          <>
                            <div style={{ padding: "11px 14px", borderRadius: 999, textAlign: "center", fontSize: 13.5, fontWeight: 700, background: "#ADEBB3", color: "#005B5B", border: "1px solid #8FD89A" }}>
                              {t("messages.exchangeConfirmed")}
                            </div>
                            {(activeExchange.start_date || activeExchange.end_date) && (
                              <div style={{ marginTop: 10, padding: "11px 14px", borderRadius: 12, background: "#F7F4EA", border: "1px solid #E5DFCE", display: "flex", flexDirection: "column", gap: 4 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#6E7B79" }}>
                                  {t("messages.agreedExchangeDate")}
                                </span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "#0F2A2A" }}>
                                  <Calendar style={{ width: 14, height: 14, color: "#005B5B" }} />
                                  {[
                                    activeExchange.start_date && new Date(activeExchange.start_date).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }),
                                    activeExchange.end_date && new Date(activeExchange.end_date).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }),
                                  ].filter(Boolean).join(" – ")}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {status === "cancelled" && (
                          <div style={{ padding: "11px 14px", borderRadius: 999, textAlign: "center", fontSize: 13.5, fontWeight: 700, background: "#F7DCD8", color: "#C0392B", border: "1px solid #F2C9C2" }}>
                            {t("messages.exchangeCancelled")}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6E7B79", fontSize: 13, textAlign: "center" }}>
                  {t("messages.selectForDetails")}
                </div>
              )}
            </div>
          </aside>
          )}

        </section>
        </div>
        </div>
      </main>

      {/* ── Delete-conversation confirmation ── */}
      <AlertDialog open={!!deleteConvTarget} onOpenChange={(open) => { if (!open) setDeleteConvTarget(null); }}>
        <AlertDialogContent style={{ borderRadius: 16, padding: 24, background: "#fff", border: "1px solid #E5DFCE", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxWidth: 400, margin: "auto" }}>
          <AlertDialogHeader style={{ marginBottom: 24 }}>
            <AlertDialogTitle style={{ fontSize: 18, fontWeight: 600, color: "#0F2A2A", marginBottom: 8 }}>
              {t("messages.deleteConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: 14, color: "#6E7B79", lineHeight: 1.5 }}>
              {t("messages.deleteConfirm.desc", { name: deleteConvTarget?.name || t("messages.userFallback") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <AlertDialogCancel asChild>
              <button style={{ padding: "10px 16px", borderRadius: 12, background: "#fff", color: "#0F2A2A", border: "1px solid #E5DFCE", fontSize: 14, fontWeight: 500, cursor: "pointer", margin: 0 }}>{t("messages.deleteConfirm.cancel")}</button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <button onClick={() => { if (deleteConvTarget) handleDeleteConversation(deleteConvTarget.id); setDeleteConvTarget(null); }} style={{ padding: "10px 16px", borderRadius: 12, background: "#C13C26", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", margin: 0 }}>{t("messages.deleteConfirm.confirm")}</button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Phone long-press action sheet (Pin/Unpin · Delete) ── */}
      {/* Bottom sheet, portaled to <body> like the app's other sheets: fixed
          backdrop + slide-up panel. Opened by a long-press on an inbox row.
          Delete reuses the existing AlertDialog flow (setDeleteConvTarget). */}
      {actionSheetConv && createPortal(
        <div
          onClick={() => setActionSheetConv(null)}
          className="anim-overlay-in"
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-sheet-up"
            style={{
              width: "100%", background: "#FFFFFF",
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: "8px 10px calc(12px + env(safe-area-inset-bottom))",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.18)",
              fontFamily: "'Geist Variable', ui-sans-serif, sans-serif",
            }}
          >
            {/* Grabber */}
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "#E5DFCE", margin: "6px auto 10px" }} />
            {/* Context label — whose conversation this acts on */}
            <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#6E7B79", margin: "0 0 8px" }}>
              {actionSheetConv.partner?.full_name || t("messages.userFallback")}
            </p>

            {/* Pin / Unpin */}
            <button
              type="button"
              onClick={() => handleTogglePin(actionSheetConv)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", borderRadius: 14, background: "none", border: "none", cursor: "pointer", fontSize: 15.5, fontWeight: 600, color: "#0F2A2A", textAlign: "left" }}
              onTouchStart={(e) => (e.currentTarget.style.background = "#F3EEE0")}
              onTouchEnd={(e) => (e.currentTarget.style.background = "none")}
            >
              {myPin(actionSheetConv, user?.id)
                ? <PinOff style={{ width: 20, height: 20, color: "#005B5B", flexShrink: 0 }} />
                : <Pin style={{ width: 20, height: 20, color: "#005B5B", flexShrink: 0 }} />}
              {myPin(actionSheetConv, user?.id) ? t("messages.unpin") : t("messages.pin")}
            </button>

            {/* Delete — hands off to the existing confirmation dialog */}
            <button
              type="button"
              onClick={() => {
                const conv = actionSheetConv;
                setActionSheetConv(null);
                setDeleteConvTarget({ id: conv.id, name: conv.partner?.full_name });
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", borderRadius: 14, background: "none", border: "none", cursor: "pointer", fontSize: 15.5, fontWeight: 600, color: "#C13C26", textAlign: "left" }}
              onTouchStart={(e) => (e.currentTarget.style.background = "rgba(193,60,38,0.08)")}
              onTouchEnd={(e) => (e.currentTarget.style.background = "none")}
            >
              <Trash2 style={{ width: 20, height: 20, flexShrink: 0 }} />
              {t("messages.deleteConversation")}
            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={() => setActionSheetConv(null)}
              style={{ width: "100%", marginTop: 6, padding: "14px", borderRadius: 14, background: "#F3EEE0", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#0F2A2A" }}
            >
              {t("messages.cancel")}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
