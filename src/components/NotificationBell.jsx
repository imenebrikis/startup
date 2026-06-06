import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, ArrowLeftRight, Home, Star, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";

// Visual identity per notification `type`. Unknown types fall back to a neutral bell.
const TYPE_META = {
  message:     { Icon: MessageCircle,  bg: "#E4F6E6", color: "#005B5B" },
  request:     { Icon: ArrowLeftRight, bg: "#EDEBFB", color: "#4B3FD8" },
  transaction: { Icon: ArrowLeftRight, bg: "#EDEBFB", color: "#4B3FD8" },
  listing:     { Icon: Home,           bg: "#FBF1D9", color: "#9A7B1A" },
  system:      { Icon: Home,           bg: "#FBF1D9", color: "#9A7B1A" },
  review:      { Icon: Star,           bg: "#FDEBD3", color: "#B26A00" },
};
const metaFor = (type) => TYPE_META[type] || { Icon: Bell, bg: "#ECECE6", color: "#6E7B79" };

function relativeTime(ts, t, locale) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("notifications.justNow");
  if (m < 60) return t("notifications.minutesAgo", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("notifications.hoursAgo", { count: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t("notifications.daysAgo", { count: d });
  return new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

// Short, subtle chime on a freshly-arrived notification. Best-effort: browsers
// may block audio without a prior user gesture, so any failure is swallowed.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.34);
    o.onended = () => ctx.close();
  } catch {
    /* audio not available — ignore */
  }
}

export default function NotificationBell({ userId }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const navigate = useNavigate();

  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const wrapRef = useRef(null);

  const unreadCount = items.reduce((n, x) => (x.read_at ? n : n + 1), 0);

  // ── Initial load (recent 30, read + unread) ────────────────────────────────
  const fetchItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { (async () => { await fetchItems(); })(); }, [fetchItems]);

  // ── Realtime: live INSERT (+ UPDATE to keep read-state synced) ──────────────
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => (prev.some((n) => n.id === payload.new.id) ? prev : [payload.new, ...prev]));
          setPinging(true);
          playChime();
          window.setTimeout(() => setPinging(false), 1200);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => prev.map((n) => (n.id === payload.new.id ? { ...n, ...payload.new } : n)));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) { console.error("[markAllRead]", error); fetchItems(); }
  };

  const handleItemClick = async (n) => {
    setOpen(false);
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      const { error } = await supabase.from("notifications").update({ read_at: now }).eq("id", n.id);
      if (error) console.error("[markRead]", error);
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <style>{`
        @keyframes nb-ping { 0%,100%{transform:rotate(0)} 20%{transform:rotate(14deg)} 40%{transform:rotate(-12deg)} 60%{transform:rotate(8deg)} 80%{transform:rotate(-4deg)} }
        .nb-scroll::-webkit-scrollbar { width: 6px; }
        .nb-scroll::-webkit-scrollbar-thumb { background: #D9D1BC; border-radius: 999px; }
        .nb-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Bell trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("notifications.ariaLabel")}
        style={{
          position: "relative", background: "none", border: "none", cursor: "pointer",
          padding: 6, borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#0A3D3D",
        }}
      >
        <Bell style={{ width: 20, height: 20, animation: pinging ? "nb-ping 0.7s ease" : "none", transformOrigin: "top center" }} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0, background: "#4B3FD8", color: "#fff",
            borderRadius: "50%", minWidth: 16, height: 16, padding: "0 4px", fontSize: 10,
            fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 12px)", right: 0, width: 360, maxWidth: "calc(100vw - 24px)",
            background: "#FBF8EF", border: "1px solid #E5DFCE", borderRadius: 20,
            boxShadow: "0 16px 40px rgba(0,0,0,0.16)", zIndex: 400, overflow: "hidden",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid #ECE4D2" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0F2A2A" }}>{t("notifications.title")}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "#005B5B", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <Check style={{ width: 14, height: 14 }} />
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="nb-scroll" style={{ maxHeight: 400, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "#6E7B79", fontSize: 13 }}>…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: "44px 24px", textAlign: "center" }}>
                <Bell style={{ width: 30, height: 30, color: "#D9D1BC", margin: "0 auto 10px", display: "block" }} />
                <p style={{ fontSize: 13.5, color: "#6E7B79", margin: 0 }}>{t("notifications.empty")}</p>
              </div>
            ) : (
              items.map((n) => {
                const { Icon, bg, color } = metaFor(n.type);
                const unread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start",
                      padding: "12px 16px", border: "none", cursor: "pointer",
                      background: unread ? "#FFFDF6" : "transparent",
                      borderBottom: "1px solid #F0EAD9", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F3EEE0")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = unread ? "#FFFDF6" : "transparent")}
                  >
                    <span style={{ width: 38, height: 38, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 18, height: 18 }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: unread ? 700 : 600, color: "#0F2A2A", lineHeight: 1.3 }}>
                        {n.title}
                      </span>
                      {n.body && (
                        <span style={{ fontSize: 12.5, color: "#6E7B79", marginTop: 2, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {n.body}
                        </span>
                      )}
                      <span style={{ display: "block", fontSize: 11, color: "#9A9A90", marginTop: 4 }}>
                        {relativeTime(n.created_at, t, locale)}
                      </span>
                    </span>
                    {unread && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4B3FD8", flexShrink: 0, marginTop: 6 }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
