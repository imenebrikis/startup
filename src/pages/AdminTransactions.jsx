import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";
import { Sheet, SheetContent } from "../components/ui/sheet";
import { ArrowLeftRight, Tag } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRelative(s) {
  if (!s) return "—";
  const diff = Date.now() - new Date(s).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  if (Math.floor(h / 24) === 1) return "Hier";
  return fmtDate(s);
}

function fmtDateRange(from, to) {
  if (!from && !to) return null;
  const parse = s => new Date(s + "T00:00:00");
  const dayFmt  = d => d.getDate();
  const monthFr = d => d.toLocaleDateString("fr-FR", { month: "long" });
  const yearFmt = d => d.getFullYear();
  if (from && to) {
    const dFrom = parse(from);
    const dTo   = parse(to);
    if (dFrom.getMonth() === dTo.getMonth() && dFrom.getFullYear() === dTo.getFullYear()) {
      return `${dayFmt(dFrom)} – ${dayFmt(dTo)} ${monthFr(dTo)} ${yearFmt(dTo)}`;
    }
    return `${dayFmt(dFrom)} ${monthFr(dFrom)} – ${dayFmt(dTo)} ${monthFr(dTo)} ${yearFmt(dTo)}`;
  }
  if (from) return `À partir du ${dayFmt(parse(from))} ${monthFr(parse(from))} ${yearFmt(parse(from))}`;
  return `Jusqu'au ${dayFmt(parse(to))} ${monthFr(parse(to))} ${yearFmt(parse(to))}`;
}

function fmtPrice(p) {
  if (!p) return null;
  return new Intl.NumberFormat("fr-DZ").format(p) + " DA";
}

const TONES = [
  { bg: "#E0F2FE", color: "#0369A1", border: "#BAE6FD" },
  { bg: "#F3E8FF", color: "#7E22CE", border: "#E9D5FF" },
  { bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" },
  { bg: "#FEF9C3", color: "#92400E", border: "#FDE68A" },
  { bg: "#FFE4E6", color: "#BE123C", border: "#FECDD3" },
  { bg: "#F1F5F9", color: "#334155", border: "#CBD5E1" },
];
function toneFor(name) {
  if (!name) return TONES[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

const STATUS = {
  pending:  { label: "En attente", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A", dot: "#F59E0B" },
  accepted: { label: "Accepté",    bg: "#F0FDF4", color: "#166534", border: "#BBF7D0", dot: "#22C55E" },
  rejected: { label: "Refusé",     bg: "#FFF1F2", color: "#9F1239", border: "#FECDD3", dot: "#F43F5E" },
};

const PAGE_SIZE = 12;

// ─── Small reusable pieces ────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const t = toneFor(name);
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, fontSize: size * 0.35, fontWeight: 700, background: t.bg, color: t.color, border: `1.5px solid ${t.border}` }}>
      {initials(name)}
    </span>
  );
}

function PinSvg({ size = 9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  );
}

function TypePill({ type }) {
  const isE = type === "echange";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "1px solid", background: isE ? "#F5F3FF" : "#F0FDF4", color: isE ? "#6D28D9" : "#15803D", borderColor: isE ? "#DDD6FE" : "#BBF7D0" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        {isE ? <><path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/></> : <><path d="M6 4h11l3 4v12H5V8z"/><path d="M4 8h16"/></>}
      </svg>
      {isE ? "Échange" : "Vente"}
    </span>
  );
}

function StatusPill({ status, pulse }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status === "pending"
        ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, boxShadow: `0 0 0 2px ${s.bg}`, ...(pulse ? { animation: "pulse 1.8s infinite" } : {}) }} />
        : status === "accepted"
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5 9-11"/></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>}
      {s.label}
    </span>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", cursor: "pointer" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ width: 12, height: 2, background: "#006E6E", borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, color: "#006E6E", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
    </div>
  );
}

// ─── Property card used inside sheets ────────────────────────────────────────
function PropCard({ listing, label, ownerName, ownerRole }) {
  const navigate = useNavigate();
  if (!listing) return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", background: "#F8FAFC", height: "100%" }}>
      <div style={{ height: 110, display: "grid", placeItems: "center", color: "#94A3B8" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 11l8-7 8 7v9H4z"/></svg>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>Annonce non disponible</div>
      </div>
    </div>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      title="Voir l'annonce"
      onClick={() => navigate(`/listing/${listing.id}`)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/listing/${listing.id}`); } }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#006E6E"; e.currentTarget.style.boxShadow = "0 6px 18px -12px rgba(0,110,110,.45)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
      style={{ border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", background: "#fff", height: "100%", cursor: "pointer", transition: "border-color .12s, box-shadow .12s", outline: "none" }}
    >
      {/* Image — fixed height keeps both cards' aspect ratio identical */}
      <div style={{ height: 120, background: "#F1F5F9", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        {listing.images?.[0]
          ? <img src={listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.4"><path d="M4 11l8-7 8 7v9H4z"/></svg></div>}
        {label && (
          <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,.95)", color: "#0F172A", border: "1px solid #E2E8F0", letterSpacing: ".03em" }}>
            {label}
          </span>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "10px 12px", flex: 1 }}>
        {ownerName && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Avatar name={ownerName} size={20} />
            <span style={{ fontSize: 11, color: "#64748B" }}><strong style={{ color: "#0F172A" }}>{ownerName}</strong>{ownerRole ? ` · ${ownerRole}` : ""}</span>
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: 1.25, marginBottom: 4 }}>{listing.title}</div>
        <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", alignItems: "center", gap: 4 }}>
          <PinSvg /> {listing.wilaya}{listing.rooms ? ` · ${listing.rooms} ch.` : ""}
        </div>
        {listing.price > 0 && (
          <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>{fmtPrice(listing.price)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Sheet for a VENTE row ────────────────────────────────────────────────────
function VenteSheet({ tx, onClose }) {
  const navigate = useNavigate();
  // undefined = loading, null = no message found, object = first message row
  const [firstMsg, setFirstMsg] = useState(undefined);

  useEffect(() => {
    if (!tx.requester_id || !tx.receiver_id || !tx.listing_id) { setFirstMsg(null); return; }
    const [p1, p2] = [tx.requester_id, tx.receiver_id].sort();
    supabase
      .from("conversations")
      .select("id")
      .eq("participant_one", p1)
      .eq("participant_two", p2)
      .eq("listing_id", tx.listing_id)
      .maybeSingle()
      .then(async ({ data: conv }) => {
        if (!conv) { setFirstMsg(null); return; }
        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(1);
        setFirstMsg(msgs?.[0] ?? null);
      });
  }, [tx.requester_id, tx.receiver_id, tx.listing_id]);

  const st = STATUS[tx.status] || STATUS.pending;
  return (
    <>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <span style={{ fontSize: 10.5, color: "#64748B", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>Demande d'achat</span>
          <h3 style={{ margin: "5px 0 0", fontSize: 17, fontWeight: 700, color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif", lineHeight: 1.2 }}>
            {tx.listing?.title || "—"}
          </h3>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <StatusPill status={tx.status} pulse />
            <span style={{ fontSize: 11.5, color: "#94A3B8", fontFamily: "monospace" }}>{fmtDate(tx.created_at)}</span>
          </div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Status banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: st.bg, border: `1px solid ${st.border}` }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "#fff", color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>
            {tx.status === "pending"
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              : tx.status === "accepted"
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5 9-11"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
              {tx.status === "pending" ? "En attente de réponse du vendeur" : tx.status === "accepted" ? "Demande acceptée" : "Demande refusée"}
            </div>
            <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 1 }}>{fmtRelative(tx.created_at)}</div>
          </div>
        </div>

        {/* Target property */}
        <div>
          <SectionLabel>Bien visé</SectionLabel>
          <div
            role={tx.listing?.id ? "button" : undefined}
            tabIndex={tx.listing?.id ? 0 : undefined}
            title={tx.listing?.id ? "Voir l'annonce" : undefined}
            onClick={tx.listing?.id ? () => navigate(`/listing/${tx.listing.id}`) : undefined}
            onKeyDown={tx.listing?.id ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/listing/${tx.listing.id}`); } }) : undefined}
            onMouseEnter={tx.listing?.id ? (e => { e.currentTarget.style.borderColor = "#006E6E"; e.currentTarget.style.boxShadow = "0 6px 18px -12px rgba(0,110,110,.45)"; }) : undefined}
            onMouseLeave={tx.listing?.id ? (e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }) : undefined}
            style={{ border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", background: "#fff", cursor: tx.listing?.id ? "pointer" : "default", transition: "border-color .12s, box-shadow .12s", outline: "none" }}
          >
            <div style={{ height: 180, background: "#F1F5F9", position: "relative", overflow: "hidden" }}>
              {tx.listing?.images?.[0]
                ? <img src={tx.listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.4"><path d="M4 11l8-7 8 7v9H4z"/></svg></div>}
              {tx.listing?.is_verified && (
                <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m5 12 5 5 9-11"/></svg>
                  Vérifié
                </span>
              )}
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{tx.listing?.title || "—"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12.5, color: "#475569" }}>
                {tx.listing?.wilaya && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><PinSvg size={11} />{tx.listing.wilaya}</span>}
                {tx.listing?.rooms > 0 && <span>{tx.listing.rooms} chambre{tx.listing.rooms > 1 ? "s" : ""}</span>}
                {tx.listing?.size > 0 && <span>{tx.listing.size} m²</span>}
              </div>
              {tx.listing?.price > 0 && (
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {fmtPrice(tx.listing.price)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buyer info */}
        <div>
          <SectionLabel>Acheteur</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <Avatar name={tx.requester?.full_name} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{tx.requester?.full_name || "—"}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <PinSvg size={10} /> {tx.requester?.wilaya || "Wilaya non renseignée"}
              </div>
            </div>
          </div>
        </div>

        {/* Seller / Récepteur */}
        <div>
          <SectionLabel>Vendeur (Récepteur)</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <Avatar name={tx.receiver?.full_name} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{tx.receiver?.full_name || "—"}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <PinSvg size={10} /> {tx.receiver?.wilaya || "Wilaya non renseignée"}
              </div>
            </div>
          </div>
        </div>

        {/* First message from chat */}
        <div>
          <SectionLabel>Message initial</SectionLabel>
          <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            {firstMsg === undefined ? (
              <span style={{ fontSize: 13, color: "#CBD5E1" }}>Chargement…</span>
            ) : firstMsg === null ? (
              <span style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>Aucun message envoyé pour l'instant.</span>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Avatar name={tx.requester?.full_name} size={24} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{tx.requester?.full_name}</span>
                  <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto", fontFamily: "monospace" }}>{fmtDate(firstMsg.created_at)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{firstMsg.content}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sheet for an ÉCHANGE row ─────────────────────────────────────────────────
function EchangeSheet({ tx, onClose }) {
  const [msgCount, setMsgCount] = useState(null);

  const st = STATUS[tx.status] || STATUS.pending;
  // Show the availability window the receiver chose for the requested house.
  const dateRange = fmtDateRange(tx.listing?.available_from, tx.listing?.available_to);

  // Derive itinerary from profile wilaya, fall back to the listing's wilaya
  const fromWilaya = tx.requester?.wilaya || tx.offered_house?.wilaya;
  const toWilaya   = tx.receiver?.wilaya  || tx.listing?.wilaya;

  useEffect(() => {
    if (!tx.requester_id || !tx.receiver_id) return;
    const [p1, p2] = [tx.requester_id, tx.receiver_id].sort();
    supabase
      .from("conversations")
      .select("id", { count: "exact" })
      .eq("participant_one", p1)
      .eq("participant_two", p2)
      .maybeSingle()
      .then(async ({ data: conv }) => {
        if (!conv) { setMsgCount(0); return; }
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id);
        setMsgCount(count ?? 0);
      });
  }, [tx.requester_id, tx.receiver_id]);

  return (
    <>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <span style={{ fontSize: 10.5, color: "#64748B", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>Demande d'échange</span>
          <h3 style={{ margin: "5px 0 0", fontSize: 17, fontWeight: 700, color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif", lineHeight: 1.2 }}>
            {tx.requester?.full_name || "—"} → {tx.receiver?.full_name || "—"}
          </h3>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <StatusPill status={tx.status} pulse />
            <span style={{ fontSize: 11.5, color: "#94A3B8", fontFamily: "monospace" }}>{fmtDate(tx.created_at)}</span>
          </div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Status banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: st.bg, border: `1px solid ${st.border}` }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "#fff", color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>
            {tx.status === "pending"
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              : tx.status === "accepted"
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5 9-11"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
              {tx.status === "pending" ? "En attente de réponse" : tx.status === "accepted" ? "Échange accepté" : "Échange refusé"}
            </div>
            <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 1 }}>{fmtRelative(tx.created_at)}</div>
          </div>
        </div>

        {/* Two properties side by side */}
        <div>
          <SectionLabel>Logements concernés</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "stretch" }}>
            <PropCard
              listing={tx.offered_house}
              label="Logement Proposé"
              ownerName={tx.requester?.full_name}
              ownerRole="Demandeur"
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "#ADEBB3", color: "#006E6E", border: "1px solid #86EFAC", boxShadow: "0 2px 8px -4px rgba(0,110,110,.35)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/></svg>
              </span>
            </div>
            <PropCard
              listing={tx.listing}
              label="Logement Souhaité"
              ownerName={tx.receiver?.full_name}
              ownerRole="Récepteur"
            />
          </div>
        </div>

        {/* CONDITIONS grid — matches screenshot layout */}
        <div>
          <SectionLabel>Conditions</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

            {/* FENÊTRE PROPOSÉE */}
            <div style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", flexShrink: 0, marginTop: 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
              </span>
              <div>
                <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700, marginBottom: 3 }}>Période</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: 1.3 }}>
                  {dateRange || "Dates flexibles"}
                </div>
              </div>
            </div>

            {/* ITINÉRAIRE */}
            <div style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", flexShrink: 0, marginTop: 1 }}>
                <PinSvg size={13} />
              </span>
              <div>
                <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700, marginBottom: 3 }}>Itinéraire</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: 1.3 }}>
                  {fromWilaya && toWilaya
                    ? <>{fromWilaya} <span style={{ color: "#94A3B8", fontWeight: 400, margin: "0 2px" }}>—</span> {toWilaya}</>
                    : fromWilaya || toWilaya || "Non renseigné"}
                </div>
              </div>
            </div>

            {/* MESSAGES — half width, left column */}
            <div style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "#F5F3FF", color: "#7E22CE", border: "1px solid #DDD6FE", flexShrink: 0, marginTop: 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </span>
              <div>
                <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700, marginBottom: 3 }}>Messages</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                  {msgCount === null
                    ? <span style={{ color: "#CBD5E1" }}>—</span>
                    : `${msgCount} échangé${msgCount !== 1 ? "s" : ""}`}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Participants */}
        <div>
          <SectionLabel>Participants</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[{ profile: tx.requester, role: "Demandeur" }, { profile: tx.receiver, role: "Récepteur" }].map(({ profile, role }) => (
              <div key={role} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <Avatar name={profile?.full_name} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{profile?.full_name || "—"}</div>
                  <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                    {role} · {profile?.wilaya || "Wilaya non renseignée"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        {tx.message && (
          <div>
            <SectionLabel>Message du demandeur</SectionLabel>
            <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Avatar name={tx.requester?.full_name} size={24} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{tx.requester?.full_name}</span>
                <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto", fontFamily: "monospace" }}>{fmtDate(tx.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{tx.message}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminTransactions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [activeSheet, setActiveSheet] = useState(null); // { tx }

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") { setLoading(false); return; }
    setAdminProfile({ ...profile, email: user.email });
    setAuthorized(true);
    await fetchData();
    setLoading(false);
  }

  async function fetchData() {
    const [{ data: txs }, { count: pending }] = await Promise.all([
      supabase
        .from("exchanges")
        .select(`
          *,
          requester:profiles!exchanges_requester_id_fkey(id, full_name, wilaya, created_at, avatar_url, is_premium),
          receiver:profiles!exchanges_receiver_id_fkey(id, full_name, wilaya, created_at, avatar_url, is_premium),
          listing:listings!exchanges_listing_id_fkey(id, title, wilaya, city, quartier, rooms, size, images, is_for_sale, is_for_exchange, is_verified, price, available_from, available_to),
          offered_house:listings!exchanges_offered_house_id_fkey(id, title, wilaya, rooms, size, images, is_for_sale, is_for_exchange, is_verified, price)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setTransactions(txs || []);
    setPendingCount(pending || 0);
  }

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const type = tx.offered_house_id ? "echange" : "vente";
      if (tab === "echange" && type !== "echange") return false;
      if (tab === "vente"   && type !== "vente")   return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const dem = (tx.requester?.full_name || "").toLowerCase();
        const rec = (tx.receiver?.full_name  || "").toLowerCase();
        if (!dem.includes(q) && !rec.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, tab, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => ({
    all:     transactions.length,
    echange: transactions.filter(t => t.offered_house_id).length,
    vente:   transactions.filter(t => !t.offered_house_id).length,
  }), [transactions]);

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
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebar active="exchanges" pendingCount={pendingCount} adminProfile={adminProfile} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* ── Top bar ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "0 28px", height: 56,
          background: "rgba(248,250,252,.92)", backdropFilter: "blur(10px)",
          borderBottom: "1px solid #E2E8F0",
        }}>
          <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94A3B8" }}>
            <span style={{ color: "#64748B" }}>Admin</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
            <span style={{ color: "#0F172A", fontWeight: 600 }}>Échanges &amp; Ventes</span>
          </nav>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#15803D", padding: "4px 10px", borderRadius: 999, background: "#F0FDF4", border: "1px solid #BBF7D0", fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", animation: "pulse 1.8s infinite" }} />
            En direct
          </div>
        </header>

        <main style={{ padding: "28px 28px 60px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400, width: "100%" }}>

          {/* ── Page title ── */}
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0F172A", letterSpacing: "-.02em", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Échanges &amp; Ventes
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748B" }}>
              Journal des interactions, échanges de logements et demandes d'achat entre utilisateurs.
            </p>
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 12, background: "#fff", flexWrap: "wrap", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>

            {/* Tabs */}
            <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "#F1F5F9", borderRadius: 9, border: "1px solid #E2E8F0" }}>
              {[
                { key: "all",     label: "Flux global", icon: "M4 6h16M4 12h16M4 18h10" },
                { key: "echange", label: "Échanges",    Icon: ArrowLeftRight },
                { key: "vente",   label: "Ventes",      Icon: Tag },
              ].map(t => {
                const on = tab === t.key;
                return (
                  <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 7,
                    fontSize: 13, color: on ? "#0F172A" : "#64748B", fontWeight: on ? 600 : 400,
                    background: on ? "#fff" : "transparent",
                    boxShadow: on ? "0 1px 3px rgba(15,23,42,.08), inset 0 0 0 1px #E2E8F0" : "none",
                    border: "none", cursor: "pointer", transition: "all .12s", fontFamily: "'Inter', sans-serif",
                  }}>
                    {t.Icon
                      ? <t.Icon width={12} height={12} strokeWidth={1.9} />
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d={t.icon}/></svg>}
                    {t.label}
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: on ? "#F0FDF4" : "#F1F5F9", color: on ? "#15803D" : "#94A3B8", border: `1px solid ${on ? "#BBF7D0" : "#E2E8F0"}`, fontFamily: "monospace" }}>
                      {counts[t.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9, minWidth: 230 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Filtrer par utilisateur…"
                  style={{ flex: 1, border: 0, outline: 0, fontSize: 13, color: "#0F172A", background: "transparent", fontFamily: "'Inter', sans-serif" }}
                />
              </label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ padding: "7px 10px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 13, color: "#0F172A", cursor: "pointer", minWidth: 150, fontFamily: "'Inter', sans-serif", outline: "none" }}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="accepted">Accepté</option>
                <option value="rejected">Refusé</option>
              </select>
            </div>
          </div>

          {/* ── Table ── */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "96px 1fr 1fr 1.25fr 120px 100px 36px", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 600, color: "#94A3B8" }}>
              <span>Type</span>
              <span>Demandeur</span>
              <span>Récepteur</span>
              <span>Bien concerné</span>
              <span>Statut</span>
              <span style={{ textAlign: "right" }}>Quand</span>
              <span />
            </div>

            {paginated.length === 0 ? (
              <div style={{ padding: "52px 24px", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "#CBD5E1" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <div style={{ fontSize: 14, color: "#0F172A", fontWeight: 600 }}>Aucune activité ne correspond</div>
                <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Essayez d'élargir vos filtres.</div>
              </div>
            ) : paginated.map((tx, idx) => {
              const type = tx.offered_house_id ? "echange" : "vente";
              const st = STATUS[tx.status] || STATUS.pending;
              const listing = tx.listing;

              return (
                <div
                  key={tx.id}
                  onClick={() => setActiveSheet(tx)}
                  style={{
                    display: "grid", gridTemplateColumns: "96px 1fr 1fr 1.25fr 120px 100px 36px",
                    alignItems: "center", gap: 12, padding: "11px 18px",
                    borderBottom: idx < paginated.length - 1 ? "1px solid #F1F5F9" : "none",
                    cursor: "pointer", transition: "background .1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                >
                  <TypePill type={type} />

                  {/* Demandeur */}
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar name={tx.requester?.full_name} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.requester?.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}><PinSvg />{tx.requester?.wilaya || "—"}</div>
                    </div>
                  </div>

                  {/* Récepteur */}
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar name={tx.receiver?.full_name} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.receiver?.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}><PinSvg />{tx.receiver?.wilaya || "—"}</div>
                    </div>
                  </div>

                  {/* Bien concerné — target listing only */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px 5px 5px", borderRadius: 9, background: "#F8FAFC", border: "1px solid #E2E8F0", minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, overflow: "hidden", background: "#E2E8F0", flexShrink: 0 }}>
                      {listing?.images?.[0]
                        ? <img src={listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.6"><path d="M4 11l8-7 8 7v9H4z"/></svg></div>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing?.title || "—"}</div>
                      <div style={{ fontSize: 10.5, color: "#94A3B8", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}><PinSvg />{listing?.wilaya || "—"}{listing?.rooms ? ` · ${listing.rooms} ch.` : ""}</div>
                    </div>
                  </div>

                  {/* Status */}
                  <StatusPill status={tx.status} pulse />

                  {/* When */}
                  <span style={{ fontSize: 11.5, color: "#94A3B8", textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {fmtRelative(tx.created_at)}
                  </span>

                  {/* Details button */}
                  <button
                    onClick={e => { e.stopPropagation(); setActiveSheet(tx); }}
                    style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", display: "grid", placeItems: "center", cursor: "pointer", transition: "all .12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#ADEBB3"; e.currentTarget.style.borderColor = "#86EFAC"; e.currentTarget.style.color = "#006E6E"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </div>
              );
            })}

            {/* Pagination footer */}
            <div style={{ borderTop: "1px solid #E2E8F0", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12.5, color: "#64748B", background: "#F8FAFC" }}>
              <span>
                {filtered.length === 0 ? "Aucun résultat" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur `}
                {filtered.length > 0 && <strong style={{ color: "#0F172A" }}>{filtered.length}</strong>}
                {filtered.length > 0 && " activités"}
              </span>
              {totalPages > 1 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, display: "grid", placeItems: "center" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6"/></svg>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid", background: n === page ? "#006E6E" : "#fff", borderColor: n === page ? "#006E6E" : "#E2E8F0", color: n === page ? "#ADEBB3" : "#0F172A", fontWeight: n === page ? 700 : 400, cursor: "pointer", fontSize: 12, display: "grid", placeItems: "center", fontFamily: "'Inter', sans-serif" }}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, display: "grid", placeItems: "center" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Dynamic Sheet — renders VenteSheet or EchangeSheet based on type ── */}
      <Sheet open={!!activeSheet} onOpenChange={open => !open && setActiveSheet(null)}>
        <SheetContent side="right" style={{ width: "min(580px, 96vw)", padding: 0, display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid #E2E8F0" }}>
          {activeSheet && (
            activeSheet.offered_house_id
              ? <EchangeSheet tx={activeSheet} onClose={() => setActiveSheet(null)} />
              : <VenteSheet   tx={activeSheet} onClose={() => setActiveSheet(null)} />
          )}
        </SheetContent>
      </Sheet>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes spin   { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
