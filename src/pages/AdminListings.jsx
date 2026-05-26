import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";
import { Checkbox } from "../components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "../components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose, DialogTrigger,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Check, XCircle } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";

const PAGE_SIZE = 15;

const AMENITY_ICONS = {
  Climatisation: "❄️", Chauffage: "🔥", Wifi: "📶",
  "Citerne d'eau": "💧", "Chauffe-eau": "♨️", "Groupe électrogène": "⚡",
  "Parking / Garage": "🚗", "Jardin / Terrasse": "🌿", Piscine: "🏊",
  "Cuisine équipée": "🍽️", "Machine à laver": "🫧", Ascenseur: "🛗",
};

// ─── Badge config ────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  mod:  { bg: "#FAF5FF", color: "#a855f7", border: "#E9D5FF" },
  warn: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  info: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  ok:   { bg: "#E4F6E6", color: "#006E6E", border: "#ADEBB3" },
};

function QualityBadge({ label, type }) {
  const s = BADGE_STYLES[type] || BADGE_STYLES.warn;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", lineHeight: 1.4,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysInQueue(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function getQualityBadges(listing, totalListings) {
  const result = [];

  // Modification badge — must appear first
  if (listing.has_been_approved === true && listing.is_verified === false) {
    result.push({ label: "Modification", type: "mod" });
  }

  const warnings = [];
  if ((listing.images || []).length <= 1)                                       warnings.push({ label: "Photos insuffisantes",     type: "warn" });
  if (!(listing.amenities || []).length)                                         warnings.push({ label: "Équipements ignorés",      type: "warn" });
  if (!listing.rooms || listing.rooms === 0)                                     warnings.push({ label: "Capacité non renseignée", type: "warn" });
  if ((!listing.quartier || !listing.quartier.trim()) && (!listing.latitude || !listing.longitude))
                                                                                 warnings.push({ label: "Adresse incomplète",       type: "warn" });

  result.push(...warnings);
  if (totalListings === 1) result.push({ label: "Premier logement", type: "info" });
  if (warnings.length === 0 && !result.some(b => b.type === "mod")) result.push({ label: "Qualité OK", type: "ok" });
  return result;
}

function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

const AVATAR_TONES = [
  { bg: "#E4F6E6", color: "#006E6E", border: "#C9E8CD" },
  { bg: "#006E6E", color: "#ADEBB3", border: "#006E6E" },
  { bg: "#F1E7CC", color: "#7A5A1A", border: "#E6D9B2" },
  { bg: "#EFE7FB", color: "#7A55C9", border: "#DCCEF5" },
  { bg: "#E4EFFA", color: "#2F6FB5", border: "#C9DCF1" },
];

function PlaceholderThumb({ index }) {
  return (
    <svg viewBox="0 0 64 64" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={`pg${index}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#006E6E" />
          <stop offset="1" stopColor="#003F3F" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#pg${index})`} />
      <g fill="#ADEBB3" opacity=".8">
        <path d="M10 38L32 22l22 16v18H10z" />
        <rect x="22" y="42" width="8" height="14" fill="#006E6E" opacity=".7" />
        <rect x="34" y="42" width="8" height="14" fill="#006E6E" opacity=".7" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminListings() {
  const navigate = useNavigate();

  const [dataLoading, setDataLoading]   = useState(true);
  const [adminProfile, setAdminProfile] = useState(null);

  const [listings, setListings]                   = useState([]);
  const [userListingCounts, setUserListingCounts] = useState({});
  const [actionLoading, setActionLoading]         = useState({});
  const [filter, setFilter]                       = useState("all");
  const [search, setSearch]                       = useState("");
  const [page, setPage]                           = useState(1);

  // Selection
  const [selected, setSelected]     = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [exitingIds, setExitingIds]   = useState(new Set());

  // Sheet
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [sheetListing, setSheetListing] = useState(null);
  const [sheetPhotoIdx, setSheetPhotoIdx] = useState(0);

  // Rejection dialog
  const [rejectOpen, setRejectOpen]       = useState(false);
  const [rejectId, setRejectId]           = useState(null);
  const [rejectMotif, setRejectMotif]     = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") { navigate("/dashboard"); return; }
    setAdminProfile({ ...profile, email: user.email });
    await fetchData();
  }

  async function fetchData() {
    setDataLoading(true);
    try {
      const [{ data: allData }, { data: countData }] = await Promise.all([
        supabase.from("listings")
          .select("*, profiles!listings_user_id_fkey(full_name, wilaya, created_at)")
          .order("created_at", { ascending: true }),
        supabase.from("listings").select("user_id"),
      ]);
      const counts = {};
      countData?.forEach(l => { counts[l.user_id] = (counts[l.user_id] || 0) + 1; });
      setUserListingCounts(counts);
      setListings(allData || []);
    } finally {
      setDataLoading(false);
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleApprove(id) {
    setActionLoading(p => ({ ...p, [id]: "approve" }));
    const { error } = await supabase.from("listings").update({ status: "approved", is_verified: true, has_been_approved: true }).eq("id", id);
    if (!error) {
      setListings(p => p.map(l => l.id === id ? { ...l, status: "approved", is_verified: true, has_been_approved: true } : l));
      if (sheetListing?.id === id) setSheetOpen(false);
      toast.success("Annonce approuvée avec succès");
    } else {
      toast.error("Erreur lors de l'approbation", { description: error.message });
    }
    setActionLoading(p => { const n = { ...p }; delete n[id]; return n; });
  }

  function prepareReject(id) {
    setRejectId(id);
    setRejectMotif("");
    setRejectComment("");
  }

  async function handleRejectConfirm() {
    if (!rejectId || !rejectMotif) return;
    setRejectLoading(true);

    const motifLabels = {
      photos:       "Photos floues",
      incomplet:    "Informations incomplètes",
      doublon:      "Doublon",
      inapproprie:  "Inapproprié",
    };
    const fullReason = `${motifLabels[rejectMotif] ?? rejectMotif}${rejectComment.trim() ? ` — ${rejectComment.trim()}` : ""}`;

    const { error } = await supabase
      .from("listings")
      .update({ status: "rejected", is_verified: false, rejection_reason: fullReason })
      .eq("id", rejectId);

    if (!error) {
      setListings(p => p.map(l => l.id === rejectId ? { ...l, status: "rejected", is_verified: false, rejection_reason: fullReason } : l));
      if (sheetListing?.id === rejectId) setSheetOpen(false);
      setRejectOpen(false);
      setRejectId(null);
      setRejectMotif("");
      setRejectComment("");
      toast.success("Logement refusé avec succès", { description: fullReason });
    } else {
      toast.error("Erreur lors du refus", { description: error.message });
    }

    setRejectLoading(false);
  }

  async function handleBulkApprove() {
    const ids = [...selected].filter(id => listings.some(l => l.id === id));
    if (!ids.length || bulkLoading) return;
    setBulkLoading(true);
    setExitingIds(new Set(ids));
    const { error } = await supabase.from("listings").update({ status: "approved", is_verified: true, has_been_approved: true }).in("id", ids);
    if (!error) {
      await new Promise(r => setTimeout(r, (ids.length - 1) * 60 + 320));
      setListings(prev => prev.map(l => ids.includes(l.id) ? { ...l, status: "approved", is_verified: true, has_been_approved: true } : l));
      setSelected(new Set());
      setExitingIds(new Set());
    } else {
      setExitingIds(new Set());
    }
    setBulkLoading(false);
  }

  // ── Sheet helpers ────────────────────────────────────────────────────────────
  function openSheet(listing, e) {
    e?.stopPropagation();
    setSheetListing(listing);
    setSheetPhotoIdx(0);
    setSheetOpen(true);
  }

  // ── Selection helpers ────────────────────────────────────────────────────────
  const pageIds         = useMemo(() => [], []); // populated below after derived data
  const enriched = useMemo(() =>
    listings.map(l => ({
      ...l,
      days:    daysInQueue(l.created_at),
      badges:  getQualityBadges(l, userListingCounts[l.user_id] || 1),
      slaHigh: daysInQueue(l.created_at) > 5,
    })),
    [listings, userListingCounts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = enriched;
    if (filter === "warn")     base = base.filter(l => l.badges.some(b => b.type === "warn"));
    if (filter === "ok")       base = base.filter(l => l.badges.every(b => b.type !== "warn"));
    if (filter === "pending")  base = base.filter(l => l.status === "pending" || (l.has_been_approved && !l.is_verified && l.status !== "rejected"));
    if (filter === "approved") base = base.filter(l => l.status === "approved" && !(l.has_been_approved === true && l.is_verified === false));
    if (filter === "rejected") base = base.filter(l => l.status === "rejected");
    if (!q) return base;
    return base.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l.profiles?.full_name?.toLowerCase().includes(q) ||
      l.wilaya?.toLowerCase().includes(q)
    );
  }, [enriched, filter, search]);

  const totalPages      = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows        = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const warnCount       = enriched.filter(l => l.badges.some(b => b.type === "warn")).length;
  const okCount         = enriched.filter(l => l.badges.every(b => b.type !== "warn")).length;
  const pendingTabCount  = enriched.filter(l => l.status === "pending" || (l.has_been_approved && !l.is_verified && l.status !== "rejected")).length;
  const approvedTabCount = enriched.filter(l => l.status === "approved").length;
  const rejectedTabCount = enriched.filter(l => l.status === "rejected").length;

  const currentPageIds  = pageRows.map(l => l.id);
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selected.has(id));
  const someSelected    = currentPageIds.some(id => selected.has(id));
  const masterChecked   = allPageSelected ? true : someSelected ? "indeterminate" : false;

  function toggleRow(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(prev => {
      const n = new Set(prev);
      if (allPageSelected) currentPageIds.forEach(id => n.delete(id));
      else currentPageIds.forEach(id => n.add(id));
      return n;
    });
  }

  const sheetPhotos = sheetListing?.images || [];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={rejectOpen}
      onOpenChange={open => { if (!open && rejectLoading) return; setRejectOpen(open); }}
    >
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3EEE0", fontFamily: "Geist, Inter, sans-serif", color: "#0F2A2A" }}>

      <AdminSidebar active="listings" pendingCount={pendingTabCount} adminProfile={adminProfile} />

      <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "14px 24px", background: "rgba(243,238,224,.88)",
          backdropFilter: "blur(12px)", borderBottom: "1px solid #E5DFCE",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6E7B79", fontSize: 13, fontWeight: 500 }}>
            <span style={{ display: "inline-grid", placeItems: "center", width: 26, height: 26, borderRadius: 8, background: "#006E6E", color: "#ADEBB3" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 11l8-7 8 7v9H4z"/><path d="M9 14h7m-2-2 2 2-2 2" strokeWidth="1.6"/></svg>
            </span>
            DarBelDar
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 999, background: "#006E6E", color: "#ADEBB3", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ADEBB3" }} />
              Admin
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
            <b style={{ color: "#0F2A2A", fontWeight: 600 }}>Annonces en attente</b>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6E7B79", padding: "6px 10px", borderRadius: 999, background: "#FFFFFF", border: "1px solid #E5DFCE" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ADEBB3", boxShadow: "0 0 0 3px rgba(173,235,179,.18)", animation: "pulse 1.8s infinite" }} />
            En direct
          </span>
        </header>

        <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Title + stats strip ─────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", color: "#0F2A2A" }}>
                Annonces en attente
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#6E7B79" }}>
                {pendingTabCount} annonce{pendingTabCount !== 1 ? "s" : ""} en attente de modération
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {enriched.filter(l => l.slaHigh).length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: 12.5, fontWeight: 600 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
                  {enriched.filter(l => l.slaHigh).length} hors délai (&gt;5 j)
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#B45309", fontSize: 12.5, fontWeight: 600 }}>
                {warnCount} avec avertissements
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#E4F6E6", border: "1px solid #ADEBB3", color: "#006E6E", fontSize: 12.5, fontWeight: 600 }}>
                {okCount} qualité OK
              </span>
            </div>
          </div>

          {/* ── Table card ──────────────────────────────────────────────── */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18, boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -14px rgba(15,42,42,.18)" }}>

            {/* Toolbar */}
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #E5DFCE", flexWrap: "wrap" }}>
              <button
                onClick={handleBulkApprove}
                disabled={selected.size === 0 || bulkLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  background: selected.size > 0 ? "#006E6E" : "#F5F5F5",
                  color: selected.size > 0 ? "#ADEBB3" : "#BBBBBB",
                  border: `1px solid ${selected.size > 0 ? "#005050" : "#E0E0E0"}`,
                  cursor: selected.size === 0 || bulkLoading ? "not-allowed" : "pointer",
                  transition: "all .2s", marginRight: 4, opacity: bulkLoading ? 0.75 : 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5 9-11"/></svg>
                Approuver la sélection
                {selected.size > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, borderRadius: 999, padding: "0 5px", background: "rgba(173,235,179,.22)", color: "#ADEBB3", fontSize: 10.5, fontWeight: 700 }}>
                    {selected.size}
                  </span>
                )}
              </button>
              {/* Search */}
              <div style={{ flex: 1, maxWidth: 280, position: "relative" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#98A3A0" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Titre, hôte, wilaya…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    width: "100%", padding: "7px 10px 7px 30px", borderRadius: 8,
                    border: "1px solid #E5DFCE", background: "#FAFAF8",
                    fontSize: 12.5, color: "#0F2A2A", outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color .15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#006E6E"; }}
                  onBlur={e => { e.target.style.borderColor = "#E5DFCE"; }}
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setPage(1); }}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, color: "#98A3A0", display: "grid", placeItems: "center" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "all",      label: `Tous (${enriched.length})` },
                  { key: "ok",       label: `Qualité OK (${okCount})` },
                  { key: "warn",     label: `Avec alertes (${warnCount})` },
                  { key: "pending",  label: `En attente (${pendingTabCount})` },
                  { key: "approved", label: `Approuvées (${approvedTabCount})` },
                  { key: "rejected", label: `Rejetées (${rejectedTabCount})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setFilter(key); setPage(1); }}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                      border: `1px solid ${filter === key ? "#006E6E" : "#E5DFCE"}`,
                      background: filter === key ? "#006E6E" : "#FFFFFF",
                      color: filter === key ? "#ADEBB3" : "#6E7B79",
                      cursor: "pointer", transition: "all .15s",
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ paddingLeft: 20, width: 44 }}>
                    <Checkbox checked={masterChecked} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead style={{ width: 280, color: "#98A3A0", fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", fontWeight: 500 }}>Propriété</TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", fontWeight: 500 }}>Localisation</TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", fontWeight: 500 }}>Hôte</TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", fontWeight: 500, minWidth: 180 }}>Qualité</TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", fontWeight: 500, textAlign: "right", paddingRight: 20 }}>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {dataLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell style={{ paddingLeft: 20, paddingTop: 14, paddingBottom: 14, width: 44 }}>
                        <Skeleton className="h-4 w-4 rounded-sm" />
                      </TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Skeleton className="h-14 w-14 shrink-0 rounded-[10px]" />
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-[160px]" />
                            <Skeleton className="h-3 w-[100px]" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-4 w-[90px]" />
                          <Skeleton className="h-3 w-[110px]" />
                        </div>
                      </TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-full" />
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-3.5 w-[100px]" />
                            <Skeleton className="h-3 w-[70px]" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14, paddingRight: 20, textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <Skeleton className="h-8 w-20 rounded-lg" />
                          <Skeleton className="h-8 w-24 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", padding: "48px 24px", color: "#6E7B79", fontSize: 14 }}>
                      Aucune annonce dans cette catégorie.
                    </TableCell>
                  </TableRow>
                ) : pageRows.map((listing, i) => {
                  const busy      = !!actionLoading[listing.id];
                  const isExiting = exitingIds.has(listing.id);
                  const exitOrder = isExiting ? pageRows.filter(r => exitingIds.has(r.id)).findIndex(r => r.id === listing.id) : 0;
                  const tone      = AVATAR_TONES[i % AVATAR_TONES.length];
                  const imgSrc    = listing.images?.[0];

                  return (
                    <TableRow
                      key={listing.id}
                      onClick={() => openSheet(listing)}
                      style={{
                        cursor: "pointer",
                        opacity: isExiting ? 0 : (busy ? 0.45 : 1),
                        transform: isExiting ? "translateX(28px)" : "none",
                        transition: isExiting
                          ? `opacity 0.22s ${exitOrder * 60}ms ease-in, transform 0.22s ${exitOrder * 60}ms ease-in`
                          : "opacity .2s",
                        pointerEvents: isExiting ? "none" : undefined,
                        background: selected.has(listing.id) ? "#F5FBF5" : undefined,
                      }}
                    >
                      {/* ── Checkbox ────────────────────────────────────── */}
                      <TableCell style={{ paddingLeft: 20, paddingTop: 14, paddingBottom: 14, width: 44 }} onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selected.has(listing.id)} onCheckedChange={() => toggleRow(listing.id)} />
                      </TableCell>

                      {/* ── Propriété ───────────────────────────────────── */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#FAF7EC", border: "1px solid #E5DFCE" }}>
                            {imgSrc
                              ? <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                              : <PlaceholderThumb index={i} />
                            }
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: "#0F2A2A", fontSize: 13.5, letterSpacing: "-.003em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                              {listing.title}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                              {listing.property_type && <span style={{ fontSize: 11.5, color: "#6E7B79" }}>{listing.property_type}</span>}
                              {listing.rooms > 0 && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#6E7B79" }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                                  {listing.rooms} ch.
                                </span>
                              )}
                              {listing.size && <span style={{ fontSize: 11.5, color: "#6E7B79" }}>{listing.size} m²</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* ── Localisation ────────────────────────────────── */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6E7B79" strokeWidth="1.8"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: "#0F2A2A" }}>{listing.wilaya}</span>
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 500, color: listing.slaHigh ? "#ef4444" : "#98A3A0" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                          {listing.days === 0 ? "Soumis aujourd'hui" : `En attente depuis ${listing.days} jour${listing.days > 1 ? "s" : ""}`}
                        </div>
                      </TableCell>

                      {/* ── Hôte ────────────────────────────────────────── */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, background: tone.bg, color: tone.color, border: `1.5px solid ${tone.border}` }}>
                            {initials(listing.profiles?.full_name)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#0F2A2A", letterSpacing: "-.003em" }}>
                              {listing.profiles?.full_name || "Inconnu"}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#98A3A0", marginTop: 2, fontFamily: "monospace" }}>
                              {userListingCounts[listing.user_id] || 1} annonce{(userListingCounts[listing.user_id] || 1) > 1 ? "s" : ""} au total
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* ── Qualité ─────────────────────────────────────── */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                          {listing.badges.map(b => <QualityBadge key={b.label} label={b.label} type={b.type} />)}
                        </div>
                      </TableCell>

                      {/* ── Actions ─────────────────────────────────────── */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14, paddingRight: 20, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            onClick={e => { e.stopPropagation(); openSheet(listing); }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, background: "#F5F5F5", border: "1px solid #E5DFCE", color: "#6E7B79", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Examiner
                          </button>
                          {(listing.status === "pending" || (listing.has_been_approved && !listing.is_verified && listing.status !== "rejected")) && (<>
                          <button
                            onClick={e => { e.stopPropagation(); handleApprove(listing.id); }}
                            disabled={busy}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "#E4F6E6", border: "1px solid #ADEBB3", color: "#006E6E", fontSize: 12.5, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer" }}
                            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = "#ADEBB3"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#E4F6E6"; }}
                          >
                            <Check className="mr-1.5 h-4 w-4" />
                            Approuver
                          </button>
                          <DialogTrigger asChild>
                            <button
                              onClick={() => prepareReject(listing.id)}
                              disabled={busy}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "#FFFFFF", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: 12.5, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer" }}
                              onMouseEnter={e => { if (!busy) e.currentTarget.style.background = "#FEE2E2"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; }}
                            >
                              <XCircle className="mr-1.5 h-4 w-4" />
                              Rejeter
                            </button>
                          </DialogTrigger>
                          </>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* ── Pagination ──────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #E5DFCE", fontSize: 12.5, color: "#6E7B79" }}>
              <span>
                {filtered.length === 0
                  ? "0 résultat"
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur ${filtered.length}`
                }
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#0F2A2A", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6"/></svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
                  .map((n, i) =>
                    n === "…"
                      ? <span key={`el${i}`} style={{ width: 32, height: 32, display: "grid", placeItems: "center", color: "#98A3A0" }}>…</span>
                      : <button key={n} onClick={() => setPage(n)} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: n === page ? "#006E6E" : "#FFFFFF", border: `1px solid ${n === page ? "#006E6E" : "#E5DFCE"}`, color: n === page ? "#ADEBB3" : "#0F2A2A", cursor: "pointer", fontSize: 12.5, fontWeight: n === page ? 600 : 400 }}>{n}</button>
                  )
                }
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#0F2A2A", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SHEET — Quick Preview
      ══════════════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" showCloseButton={false} className="p-0 gap-0 flex flex-col w-[520px] sm:max-w-[520px] overflow-hidden">

          {sheetListing && (() => {
            const s = sheetListing;
            const photos = s.images || [];
            const busy = !!actionLoading[s.id];

            return (
              <>
                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: "auto" }}>

                  {/* ── Cover image ── */}
                  <div style={{ position: "relative", height: 260, background: "#0F2A2A", flexShrink: 0 }}>
                    {photos.length > 0 ? (
                      <img
                        src={photos[sheetPhotoIdx]}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 64 64" style={{ width: 80, opacity: 0.4 }}>
                          <path d="M10 38L32 22l22 16v18H10z" fill="#ADEBB3" />
                        </svg>
                      </div>
                    )}

                    {/* Photo nav */}
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setSheetPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.85)", border: "none", display: "grid", placeItems: "center", cursor: "pointer" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F2A2A" strokeWidth="2"><path d="M15 6l-6 6 6 6"/></svg>
                        </button>
                        <button
                          onClick={() => setSheetPhotoIdx(i => (i + 1) % photos.length)}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.85)", border: "none", display: "grid", placeItems: "center", cursor: "pointer" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F2A2A" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                        </button>
                        <span style={{ position: "absolute", bottom: 12, right: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11.5, fontWeight: 600 }}>
                          {sheetPhotoIdx + 1} / {photos.length}
                        </span>
                      </>
                    )}

                    {/* Close button */}
                    <button
                      onClick={() => setSheetOpen(false)}
                      style={{ position: "absolute", top: 12, left: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,.45)", border: "none", display: "grid", placeItems: "center", cursor: "pointer" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                  </div>

                  {/* Thumbnail strip */}
                  {photos.length > 1 && (
                    <div style={{ display: "flex", gap: 6, padding: "10px 16px", background: "#FAFAF8", borderBottom: "1px solid #E5DFCE", overflowX: "auto" }}>
                      {photos.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSheetPhotoIdx(idx)}
                          style={{ width: 60, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, padding: 0, border: `2px solid ${idx === sheetPhotoIdx ? "#006E6E" : "transparent"}`, cursor: "pointer", background: "none" }}
                        >
                          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Content ── */}
                  <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

                    {/* Title + tags + SLA */}
                    <div>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", color: "#0F2A2A", lineHeight: 1.3, flex: 1 }}>
                          {s.title}
                        </h2>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 500, color: s.slaHigh ? "#ef4444" : "#98A3A0", flexShrink: 0, marginTop: 3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                          {s.days === 0 ? "Soumis aujourd'hui" : `${s.days}j en attente`}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                        {s.is_for_exchange && (
                          <span style={{ background: "#0F2A2A", color: "#ADEBB3", fontSize: 11.5, fontWeight: 600, padding: "3px 12px", borderRadius: 999 }}>Échange</span>
                        )}
                        {s.is_for_sale && (
                          <span style={{ background: "#4B3FD8", color: "#fff", fontSize: 11.5, fontWeight: 600, padding: "3px 12px", borderRadius: 999 }}>Vente</span>
                        )}
                        {s.badges.map(b => <QualityBadge key={b.label} label={b.label} type={b.type} />)}
                      </div>
                    </div>

                    {/* Location */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6E7B79", fontSize: 13 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      <span style={{ fontWeight: 500 }}>{[s.wilaya, s.city || s.quartier].filter(Boolean).join(", ")}</span>
                    </div>

                    {/* Stats bar */}
                    <div style={{ background: "#ADEBB3", borderRadius: 14, padding: "14px 20px", display: "flex", gap: 0 }}>
                      {s.rooms > 0 && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0A3D3D" strokeWidth="1.8"><path d="M2 9h20M2 9v10h20V9M5 9V5h14v4"/><path d="M2 14h20"/></svg>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0A3D3D" }}>{s.rooms} chambre{s.rooms > 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {s.size && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, borderLeft: "1px solid rgba(10,61,61,.2)", paddingLeft: 16 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A3D3D" strokeWidth="1.8"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0A3D3D" }}>{s.size} m²</span>
                        </div>
                      )}
                      {s.floor != null && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, borderLeft: "1px solid rgba(10,61,61,.2)", paddingLeft: 16 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A3D3D" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0A3D3D" }}>{s.floor === 0 ? "RDC" : `Étage ${s.floor}`}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {s.description && (
                      <div>
                        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#98A3A0", textTransform: "uppercase", letterSpacing: ".07em" }}>Description</p>
                        <p style={{ margin: 0, fontSize: 13.5, color: "#0F2A2A", lineHeight: 1.75 }}>{s.description}</p>
                      </div>
                    )}

                    {/* Amenities */}
                    {s.amenities?.length > 0 && (
                      <div>
                        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#98A3A0", textTransform: "uppercase", letterSpacing: ".07em" }}>Équipements</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 12px" }}>
                          {s.amenities.map(name => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14 }}>{AMENITY_ICONS[name] || "✦"}</span>
                              <span style={{ fontSize: 13, color: "#0F2A2A" }}>{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Host card */}
                    <div style={{ background: "#F3EEE0", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#006E6E", color: "#ADEBB3", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {initials(s.profiles?.full_name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2A2A" }}>{s.profiles?.full_name || "Inconnu"}</div>
                        {s.profiles?.wilaya && <div style={{ fontSize: 12.5, color: "#6E7B79", marginTop: 2 }}>{s.profiles.wilaya}</div>}
                        <div style={{ fontSize: 11.5, color: "#98A3A0", marginTop: 2 }}>
                          {userListingCounts[s.user_id] || 1} annonce{(userListingCounts[s.user_id] || 1) > 1 ? "s" : ""} au total
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── Sheet footer ── */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid #E5DFCE", display: "flex", gap: 10, background: "#FFFFFF" }}>
                  {(s.status === "pending" || (s.has_been_approved && !s.is_verified && s.status !== "rejected")) ? (<>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => prepareReject(s.id)}
                      disabled={busy}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 10, background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: 13.5, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer" }}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Rejeter
                    </button>
                  </DialogTrigger>
                  <button
                    onClick={() => handleApprove(s.id)}
                    disabled={busy}
                    style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 10, background: "#006E6E", border: "none", color: "#ADEBB3", fontSize: 13.5, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}
                    onMouseEnter={e => { if (!busy) e.currentTarget.style.background = "#005050"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#006E6E"; }}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    {busy ? "En cours…" : "Approuver"}
                  </button>
                  </>) : (
                  <button
                    onClick={() => setSheetOpen(false)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "11px", borderRadius: 10, background: "#F5F5F5", border: "1px solid #E5DFCE", color: "#6E7B79", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    Fermer
                  </button>
                  )}
                </div>
              </>
            );
          })()}

        </SheetContent>
      </Sheet>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
    </div>

    {/* ═══════════════════════════════════════════════════════════════════════
        DIALOG — Rejection flow (DialogContent lives outside the scroll div)
    ══════════════════════════════════════════════════════════════════════════ */}
    <DialogContent
      showCloseButton={false}
      className="sm:max-w-[425px] p-6 bg-background border border-border text-foreground rounded-xl"
    >
      <DialogHeader className="space-y-1.5 text-left">
        <DialogTitle className="text-xl font-semibold tracking-tight">
          Motif du refus
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Sélectionnez un motif et ajoutez un commentaire optionnel.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <Select value={rejectMotif} onValueChange={setRejectMotif}>
          <SelectTrigger className="w-full bg-background border border-input text-sm rounded-md px-3 py-2">
            <SelectValue placeholder="Choisir un motif…" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border border-border rounded-md shadow-md">
            <SelectItem value="photos">Photos floues</SelectItem>
            <SelectItem value="incomplet">Informations incomplètes</SelectItem>
            <SelectItem value="doublon">Doublon</SelectItem>
            <SelectItem value="inapproprie">Inapproprié</SelectItem>
          </SelectContent>
        </Select>

        <Textarea
          placeholder="Commentaire additionnel (optionnel)…"
          rows={3}
          value={rejectComment}
          onChange={e => setRejectComment(e.target.value)}
          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
        <DialogClose asChild>
          <Button variant="outline" type="button" disabled={rejectLoading}>
            Annuler
          </Button>
        </DialogClose>
        <Button
          variant="destructive"
          type="submit"
          onClick={handleRejectConfirm}
          disabled={!rejectMotif || rejectLoading}
        >
          {rejectLoading ? "Refus en cours…" : "Confirmer le refus"}
        </Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}
