import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MapPin, Calendar, ArrowLeft, ArrowRight, Check, X,
  Loader2, Home, MessageSquare, Send, Inbox, AlertCircle, BedDouble, Menu,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

// Short month + year in the active language (e.g. "mai 2024" / "May 2024").
const fmtDate = (s, locale = "fr-FR") => {
  if (!s) return null;
  const d = new Date(s);
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(d).replace(".", "");
  return `${month} ${d.getFullYear()}`;
};
const initials = (name) => name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const map = {
    pending:   { key: "pending",   bg: "#FBEACB", color: "#C77A1E", dot: "#C77A1E" },
    accepted:  { key: "accepted",  bg: "#D6EEDD", color: "#1F7A4F", dot: "#1F7A4F" },
    refused:   { key: "refused",   bg: "#F7DCD8", color: "#C0392B", dot: "#C0392B" },
    confirmed: { key: "confirmed", bg: "#ADEBB3", color: "#005B5B", dot: "#005B5B" },
    cancelled: { key: "cancelled", bg: "#ECECE6", color: "#6E7B79", dot: "#9A9A90" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: s.bg, color: s.color, padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {t(`exchanges.status.${s.key}`)}
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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const navigate = useNavigate();
  const [blockHover, setBlockHover] = useState(false);
  const [nameHover, setNameHover] = useState(false);
  const requested = ex.requested_house;  // listing_id → the receiver's own house
  const offered = ex.offered_house;      // offered_house_id → the requester's house
  // The large visual shows the "other party's" house; the info block shows the viewer's own.
  // sent:     hero = requested (their house I want),   info = offered  (my proposed house)
  // received: hero = offered  (their proposed house),  info = requested (my own house)
  const heroHouse = mode === "sent" ? requested : offered;
  const infoHouse = mode === "sent" ? offered : requested;
  const infoLabel = mode === "sent" ? t("exchanges.offeredLabel") : t("exchanges.ownLabel");
  const partnerProfile = mode === "sent" ? ex.receiver_profile : ex.sender_profile;
  const partnerName = partnerProfile?.full_name || t("exchanges.userFallback");
  const dateStr = ex.created_at
    ? t("exchanges.requestedOn", { date: new Date(ex.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }) })
    : "";
  const busy = actionLoading === ex.id;
  const refused = ex.status === "refused";

  return (
    <article className="exchange-card" style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22 }}>
      <div className="exchange-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <StatusBadge status={ex.status} />
        <span style={{ fontSize: 12.5, color: "#6E7B79" }}>{dateStr}</span>
      </div>

      <div className="exchange-card-grid" style={{ display: "grid" }}>
        {/* Left: photo + title + user — Option 3 whole-block link */}
        <div>
          {heroHouse ? (
            <Link
              to={`/listing/${heroHouse.id}`}
              onMouseEnter={() => setBlockHover(true)}
              onMouseLeave={() => setBlockHover(false)}
              style={{ display: "block", textAlign: "left", textDecoration: "none", transition: "opacity 0.2s ease", opacity: blockHover ? 0.95 : 1 }}
            >
              <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 16, overflow: "hidden", background: "#E5DFCE" }}>
                {heroHouse.images?.[0] ? (
                  <img
                    src={heroHouse.images[0]}
                    alt={heroHouse.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: blockHover ? "scale(1.01)" : "scale(1)", transition: "transform 0.3s ease" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                    <Home style={{ width: 28, height: 28, color: "#6E7B79" }} />
                    <span style={{ fontSize: 11, color: "#6E7B79" }}>{t("exchanges.photoPlaceholder")}</span>
                  </div>
                )}
              </div>

              <h3 style={{ margin: "16px 0 4px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A", textDecoration: blockHover ? "underline" : "none", textDecorationThickness: 2 }}>
                {heroHouse.title}
              </h3>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#005B5B", fontWeight: 500 }}>
                <MapPin style={{ width: 13, height: 13 }} />
                {heroHouse.wilaya}{heroHouse.city ? `, ${heroHouse.city}` : ""}
              </div>
            </Link>
          ) : (
            <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 16, overflow: "hidden", background: "#E5DFCE", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
              <Home style={{ width: 28, height: 28, color: "#6E7B79" }} />
              <span style={{ fontSize: 11, color: "#6E7B79" }}>property photo</span>
            </div>
          )}

          <Link
            to={partnerProfile?.id ? `/profile/${partnerProfile.id}` : "#"}
            onMouseEnter={() => setNameHover(true)}
            onMouseLeave={() => setNameHover(false)}
            className="exchange-card-partner"
            style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none" }}
          >
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15, flexShrink: 0 }}>
              {initials(partnerName)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2A2A", textDecoration: nameHover ? "underline" : "none" }}>
              {partnerName}
            </div>
          </Link>
        </div>

        {/* Right: info blocks + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <InfoBlock label={infoLabel} refused={refused}>
            {infoHouse ? (
              <>
                <p style={{ fontSize: 15.5, fontWeight: 700, color: "#0F2A2A", margin: "0 0 8px", letterSpacing: "-0.005em" }}>{infoHouse.title}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13.5, color: refused ? "#C0392B" : "#005B5B" }}>
                  {infoHouse.wilaya && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MapPin style={{ width: 13, height: 13, opacity: 0.85 }} />
                      {infoHouse.wilaya}{infoHouse.city ? `, ${infoHouse.city}` : ""}
                    </span>
                  )}
                  {infoHouse.rooms && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <BedDouble style={{ width: 13, height: 13, opacity: 0.85 }} />
                      {t("exchanges.rooms", { count: infoHouse.rooms })}
                    </span>
                  )}
                  {(infoHouse.available_from || infoHouse.available_to) && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Calendar style={{ width: 13, height: 13, opacity: 0.85 }} />
                      {[fmtDate(infoHouse.available_from, dateLocale), fmtDate(infoHouse.available_to, dateLocale)].filter(Boolean).join(" – ")}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#6E7B79", margin: 0 }}>{t("exchanges.unavailable")}</p>
            )}
          </InfoBlock>

          {ex.message && (
            <InfoBlock label={mode === "sent" ? t("exchanges.yourMessage") : t("exchanges.requesterMessage")} refused={refused}>
              <p style={{ fontSize: 14, color: "#0F2A2A", lineHeight: 1.5, margin: 0 }}>{ex.message}</p>
            </InfoBlock>
          )}

          <div className="exchanges-action-row" style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {mode === "sent" && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/messages", { state: { activeChatUserId: partnerProfile?.id, activeChatUserName: partnerName, listingId: ex.listing_id } })}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, fontWeight: 600, background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#005B5B", cursor: "pointer" }}
                >
                  <MessageSquare style={{ width: 15, height: 15 }} />
                  {t("exchanges.sendMessage")}
                </button>
                {ex.status === "pending" && (
                  <button
                    onClick={() => onCancel(ex.id)}
                    disabled={busy}
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, fontWeight: 600, background: "#C0392B", color: "#fff", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                  >
                    {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <X style={{ width: 14, height: 14 }} />}
                    {t("exchanges.cancelRequest")}
                  </button>
                )}
              </>
            )}

            {mode === "received" && ex.status === "pending" && (
              <>
                <button
                  onClick={() => onAccept(ex.id)}
                  disabled={busy}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, fontWeight: 600, background: "#005B5B", color: "#F3EEE0", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}
                  {t("exchanges.accept")}
                </button>
                <button
                  onClick={() => onRefuse(ex.id)}
                  disabled={busy}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, fontWeight: 600, background: "#C0392B", color: "#fff", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <X style={{ width: 14, height: 14 }} />}
                  {t("exchanges.refuse")}
                </button>
              </>
            )}

            {mode === "received" && ex.status !== "pending" && (
              <button
                type="button"
                onClick={() => navigate("/messages", { state: { activeChatUserId: partnerProfile?.id, activeChatUserName: partnerName, listingId: ex.listing_id } })}
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, fontWeight: 600, background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#005B5B", cursor: "pointer" }}
              >
                <MessageSquare style={{ width: 15, height: 15 }} />
                {t("exchanges.sendMessage")}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ mode }) {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: "center", padding: "64px 32px", color: "#6E7B79" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid #E5DFCE" }}>
        {mode === "sent" ? <Send style={{ width: 28, height: 28, color: "#6E7B79" }} /> : <Inbox style={{ width: 28, height: 28, color: "#6E7B79" }} />}
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#0F2A2A", marginBottom: 8 }}>
        {mode === "sent" ? t("exchanges.empty.sentTitle") : t("exchanges.empty.receivedTitle")}
      </p>
      <p style={{ fontSize: 13 }}>
        {mode === "sent" ? t("exchanges.empty.sentSubtitle") : t("exchanges.empty.receivedSubtitle")}
      </p>
    </div>
  );
}

export default function Exchanges() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("sent");
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const fetchExchanges = useCallback(async (uid) => {
    setLoading(true);
    setDbError(null);

    const { data: sentData, error: sentError } = await supabase
      .from("exchanges")
      .select(`id, status, message, created_at, listing_id,
        requested_house:listings!listing_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        offered_house:listings!offered_house_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        receiver_profile:profiles!receiver_id ( id, full_name, wilaya )`)
      .eq("requester_id", uid)
      .order("created_at", { ascending: false });

    if (sentError) { console.error("Error fetching sent:", sentError); setDbError(`Sent: ${sentError.message}`); }

    const { data: receivedData, error: receivedError } = await supabase
      .from("exchanges")
      .select(`id, status, message, created_at, listing_id,
        requested_house:listings!listing_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        offered_house:listings!offered_house_id ( id, title, wilaya, city, rooms, available_from, available_to, images ),
        sender_profile:profiles!requester_id ( id, full_name, wilaya )`)
      .eq("receiver_id", uid)
      .order("created_at", { ascending: false });

    if (receivedError) { console.error("Error fetching received:", receivedError); if (!sentError) setDbError(`Received: ${receivedError.message}`); }

    setSent(sentData || []);
    setReceived(receivedData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/login"); return; }
      setUser(user);
      fetchExchanges(user.id);
    });
  }, [navigate, fetchExchanges]);

  const updateStatus = async (id, status) => {
    setActionLoading(id);
    await supabase.from("exchanges").update({ status, updated_by: user.id }).eq("id", id);
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
    <div className="exchanges-page-grid" style={{ minHeight: "100vh", background: "#F3EEE0", display: "grid", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar
        active="Mes échanges"
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      <main className="exchanges-main" style={{ maxWidth: 1440, width: "100%" }}>
        {/* Topbar avatar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, paddingBottom: 22 }}>
          {/* Hamburger — phone only; opens the sidebar drawer. Sits at the start
              of the row (marginRight:auto pushes the rest to flex-end). Display
              is class-owned (inline-flex / lg:hidden) — no inline `display`, or
              it would beat the lg:hidden utility. */}
          <button
            onClick={() => setSidebarMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="inline-flex items-center justify-center lg:hidden"
            style={{ marginRight: "auto", width: 40, height: 40, borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "#005B5B", padding: 0 }}
          >
            <Menu style={{ width: 22, height: 22 }} />
          </button>
          <NotificationBell userId={user?.id} />
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>
            {initials(user?.user_metadata?.full_name || user?.email || "")}
          </div>
        </header>

        {/* Page header */}
        <section style={{ margin: "6px 0 22px" }}>
          <h1 className="exchanges-title" style={{ lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 700, margin: 0, color: "#0F2A2A" }}>{t("exchanges.title")}</h1>
          <p style={{ margin: "10px 0 0", color: "#6E7B79", fontSize: 15 }}>{t("exchanges.subtitle")}</p>
        </section>

        {dbError && (
          <div style={{ background: "#F7DCD8", border: "1px solid #C0392B", color: "#C0392B", padding: 16, borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertCircle style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t("exchanges.error")}</p>
              <p style={{ fontSize: 13, fontFamily: "monospace" }}>{dbError}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="exchanges-tab-row" style={{ display: "flex", marginBottom: 22 }}>
          {[
            { id: "sent",     label: t("exchanges.tabs.sent"),     icon: <ArrowRight style={{ width: 14, height: 14 }} />, count: sent.length },
            { id: "received", label: t("exchanges.tabs.received"), icon: <ArrowLeft style={{ width: 14, height: 14 }} />,  count: received.length },
          ].map(({ id, label, icon, count }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="exchanges-tab-btn"
                style={{
                  display: "inline-flex", alignItems: "center", borderRadius: 999,
                  background: on ? "#E4F6E6" : "#FFFFFF", border: on ? "1px solid #8FD89A" : "1px solid #E5DFCE",
                  fontWeight: 500, color: "#005B5B", cursor: "pointer",
                }}
              >
                {icon}
                {label}
                <span className="exchanges-tab-badge" style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 999, fontWeight: 600,
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

      {/* Page-level styles — defined ONCE here (not inside ExchangeCard), so the
          .exchange-card-grid rule is shared by every card, never re-injected per
          card. Literal media queries (class-owned, robust against stale Tailwind
          builds), mirroring the Dashboard/Messages mobile pattern. */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Phone-first: single full-width column. The Sidebar is a fixed drawer
           (out of flow) on phone, so a left "auto" track would content-size and
           leave a gap on the right — force one full-width track instead. */
        .exchanges-page-grid { grid-template-columns: minmax(0, 1fr); }
        .exchanges-main { padding: 18px 16px 48px; }
        /* Card body stacks: photo+title on top, info blocks + buttons below. */
        .exchange-card-grid { grid-template-columns: 1fr; }

        /* Phone size reductions — proportionate to the narrower single-column
           layout. Inline padding/fontSize were removed from these elements so
           the class owns them (inline would otherwise beat the rule). */
        .exchanges-title { font-size: 29px; }
        .exchanges-tab-row { gap: 8px; }
        /* Tabs read as a balanced pair on phone: equal-width pills, centered
           content, tighter internal gap; count badge sized down to stop crowding
           the label. */
        .exchanges-tab-btn { padding: 9px 12px; font-size: 13px; flex: 1; justify-content: center; gap: 8px; }
        .exchanges-tab-badge { min-width: 20px; height: 20px; padding: 0 6px; font-size: 11.5px; }
        .exchanges-action-row button { padding: 8px 12px; font-size: 12px; }

        /* Phone vertical rhythm — even out the card's section spacing into a
           consistent tier: 16px card inset, 14px header gap, 16px sub-item gaps
           (title/partner), 18px between the stacked column-sections. */
        .exchange-card { padding: 16px; margin-bottom: 14px; }
        .exchange-card-header { margin-bottom: 14px; }
        .exchange-card-grid { gap: 18px; }
        .exchange-card-partner { margin-top: 16px; }

        @media (min-width: 1024px) {
          .exchanges-page-grid { grid-template-columns: auto minmax(0, 1fr); }
          .exchanges-main { padding: 26px 42px 56px; }
          .exchange-card-grid { grid-template-columns: 1.05fr 1fr; gap: 22px; }
          /* Restore the original desktop sizes exactly (pixel-identical). */
          .exchanges-title { font-size: 42px; }
          .exchanges-tab-row { gap: 10px; }
          .exchanges-tab-btn { padding: 11px 18px; font-size: 14px; flex: 0 1 auto; justify-content: flex-start; gap: 10px; }
          .exchanges-tab-badge { min-width: 22px; height: 22px; padding: 0 7px; font-size: 12px; }
          .exchanges-action-row button { padding: 13px 16px; font-size: 14px; }
          .exchange-card { padding: 22px; margin-bottom: 18px; }
          .exchange-card-header { margin-bottom: 18px; }
          .exchange-card-partner { margin-top: 18px; }
        }
      `}</style>
    </div>
  );
}
