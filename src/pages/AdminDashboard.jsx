import { useEffect, useState } from "react";
import { Skeleton } from "../components/ui/skeleton";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";

const DOT_COLORS = {
  purple: { bg: "#7A55C9", ring: "#EFE7FB" },
  green:  { bg: "#8FD89A", ring: "#E4F6E6" },
  teal:   { bg: "#005B5B", ring: "rgba(0,91,91,.12)" },
  blue:   { bg: "#2F6FB5", ring: "#E4EFFA" },
  warn:   { bg: "#B4791E", ring: "#FBEED1" },
  danger: { bg: "#C13C26", ring: "#FBE4DF" },
};

const AVATAR_TONES = [
  { bg: "#E4F6E6", color: "#005B5B", border: "#C9E8CD" },
  { bg: "#005B5B", color: "#ADEBB3", border: "#005B5B" },
  { bg: "#F1E7CC", color: "#7A5A1A", border: "#E6D9B2" },
  { bg: "#EFE7FB", color: "#7A55C9", border: "#DCCEF5" },
  { bg: "#E4EFFA", color: "#2F6FB5", border: "#C9DCF1" },
];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "À l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h} h`;
  return `Il y a ${Math.floor(h / 24)} j`;
}

function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dataLoading, setDataLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  const [stats, setStats] = useState({ totalUsers: 0, totalListings: 0, pendingCount: 0, completedExchanges: 0 });
  const [pendingListings, setPendingListings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => { initAdmin(); }, []);

  async function initAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") { navigate("/dashboard"); return; }

    setAdminProfile({ ...profile, email: user.email });
    await fetchAll();
  }

  async function fetchAll() {
    setDataLoading(true);
    try {
    const [
      { count: totalUsers },
      { count: totalListings },
      { count: pendingCount },
      { count: completedExchanges },
      { data: pending },
      { data: users },
      { data: recentListings },
      { data: recentProfiles },
      { data: recentExchanges },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("exchanges").select("*", { count: "exact", head: true }).eq("status", "accepted"),
      supabase.from("listings")
        .select("*, profiles!listings_user_id_fkey(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("listings")
        .select("*, profiles!listings_user_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(4),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(3),
      supabase.from("exchanges")
        .select("*, profiles!exchanges_requester_id_fkey(full_name), listings!exchanges_listing_id_fkey(title)")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    setStats({
      totalUsers: totalUsers || 0,
      totalListings: totalListings || 0,
      pendingCount: pendingCount || 0,
      completedExchanges: completedExchanges || 0,
    });
    setPendingListings(pending || []);
    setAllUsers(users || []);

    const items = [];
    recentProfiles?.forEach(p => items.push({
      color: "purple",
      title: "Nouvel utilisateur inscrit",
      who: p.full_name || "Utilisateur",
      sub: p.wilaya || "",
      time: new Date(p.created_at),
    }));
    recentListings?.forEach(l => {
      const isApproved = l.status === "approved";
      const isRejected = l.status === "rejected";
      items.push({
        color: isApproved ? "green" : isRejected ? "danger" : "blue",
        title: isApproved ? "Annonce approuvée" : isRejected ? "Annonce rejetée" : "Nouvelle annonce soumise",
        who: l.profiles?.full_name || "Inconnu",
        sub: l.title,
        time: new Date(l.created_at),
      });
    });
    recentExchanges?.forEach(e => items.push({
      color: e.status === "accepted" ? "green" : "teal",
      title: e.status === "accepted" ? "Échange confirmé" : "Demande d'échange",
      who: e.profiles?.full_name || "Inconnu",
      sub: e.listings?.title || "",
      time: new Date(e.created_at),
    }));
    items.sort((a, b) => b.time - a.time);
    setActivity(items.slice(0, 6));
    } finally {
      setDataLoading(false);
    }
  }

  async function handleApprove(id) {
    setActionLoading(prev => ({ ...prev, [id]: "approve" }));
    const { error } = await supabase.from("listings").update({ status: "approved", is_verified: true }).eq("id", id);
    if (!error) {
      setPendingListings(prev => prev.filter(l => l.id !== id));
      setStats(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }));
    }
    setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function handleReject(id) {
    setActionLoading(prev => ({ ...prev, [id]: "reject" }));
    const { error } = await supabase.from("listings").update({ status: "rejected" }).eq("id", id);
    if (!error) {
      setPendingListings(prev => prev.filter(l => l.id !== id));
      setStats(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }));
    }
    setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  const filteredUsers = allUsers.filter(u =>
    !searchQuery ||
    (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.wilaya || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const KPI_CARDS = [
    {
      label: "Utilisateurs", value: stats.totalUsers,
      iconBg: "#EFE7FB", iconColor: "#7A55C9", iconBorder: "#DCCEF5",
      ghost: "rgba(122,85,201,.10)",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 19c1.2-3 3.8-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/><circle cx="17" cy="7" r="2.6"/><path d="M14.5 14.5c1.5-.7 3-.9 4.5-.5 1.4.4 2.5 1.3 3 2.5"/></svg>,
      delta: "Total inscrits", warn: false,
    },
    {
      label: "Annonces totales", value: stats.totalListings,
      iconBg: "#E4EFFA", iconColor: "#2F6FB5", iconBorder: "#C9DCF1",
      ghost: "rgba(47,111,181,.10)",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>,
      delta: "Toutes statuts", warn: false,
    },
    {
      label: "En vérification", value: stats.pendingCount,
      iconBg: "#FBEED1", iconColor: "#B4791E", iconBorder: "#ECD6A1",
      ghost: "rgba(180,121,30,.12)",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3 2"/></svg>,
      delta: "Action requise", warn: true,
    },
    {
      label: "Échanges réalisés", value: stats.completedExchanges,
      iconBg: "#E4F6E6", iconColor: "#005B5B", iconBorder: "#C9E8CD",
      ghost: "rgba(173,235,179,.40)",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/></svg>,
      delta: "Échanges acceptés", warn: false,
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3EEE0", fontFamily: "Geist, Inter, sans-serif", color: "#0F2A2A" }}>

      <AdminSidebar active="dashboard" pendingCount={stats.pendingCount} adminProfile={adminProfile} />

      {/* ===== Main Content ===== */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "14px 24px", background: "rgba(243,238,224,.88)",
          backdropFilter: "blur(12px)", borderBottom: "1px solid #E5DFCE",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6E7B79", fontSize: 13, fontWeight: 500 }}>
              DarBelDar
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
                borderRadius: 999, background: "#005B5B", color: "#ADEBB3",
                fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ADEBB3" }} />
                Admin
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
              <b style={{ color: "#0F2A2A", fontWeight: 600 }}>Tableau de bord</b>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6E7B79",
              padding: "6px 10px", borderRadius: 999, background: "#FFFFFF", border: "1px solid #E5DFCE",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8FD89A", boxShadow: "0 0 0 3px rgba(173,235,179,.18)", animation: "pulse 1.8s infinite" }} />
              En direct
            </span>
            <Link
              to="/dashboard"
              title="Retour app"
              style={{
                width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
                border: "1px solid #E5DFCE", background: "#FFFFFF", color: "#0F2A2A", textDecoration: "none",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
            </Link>
          </div>
        </header>

        {/* Page */}
        <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, maxWidth: 1280, width: "100%", margin: "0 auto" }}>

          {/* Title Row */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, margin: "-4px 0 -6px" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", color: "#0F2A2A" }}>Tableau de bord Admin</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#6E7B79" }}>
                Vue d'ensemble · <span style={{ fontFamily: "monospace" }}>
                  {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {dataLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <article key={i} style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18, padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-9 shrink-0 rounded-[11px]" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-4 w-28" />
                </article>
              ))
            ) : KPI_CARDS.map(({ label, value, iconBg, iconColor, iconBorder, ghost, icon, delta, warn }) => (
              <article key={label} style={{
                background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18,
                boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -14px rgba(15,42,42,.18)",
                padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 14,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", inset: "auto -30px -30px auto", width: 120, height: 120,
                  borderRadius: "50%", background: `radial-gradient(circle,${ghost} 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "#6E7B79", fontWeight: 500, letterSpacing: ".005em" }}>{label}</span>
                  <span style={{
                    width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center",
                    background: iconBg, color: iconColor, border: `1px solid ${iconBorder}`, flexShrink: 0,
                  }}>{icon}</span>
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, color: "#0F2A2A", fontFamily: "monospace" }}>
                  {value.toLocaleString("fr-FR")}
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: warn ? "#B4791E" : "#2F8A3E" }}>
                  {warn
                    ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B4791E", boxShadow: "0 0 0 3px rgba(180,121,30,.18)" }} />
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 15l7-7 7 7"/></svg>
                  }
                  {delta}
                </span>
              </article>
            ))}
          </section>

          {/* Middle Grid */}
          <section style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>

            {/* Pending Listings */}
            <article style={{
              background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18,
              boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -14px rgba(15,42,42,.18)",
            }}>
              <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #E5DFCE" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, letterSpacing: "-.005em", color: "#0F2A2A" }}>Annonces en attente d'approbation</h2>
                  <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#6E7B79" }}>Vérifiez chaque logement avant publication.</p>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
                  borderRadius: 999, background: "#FBEED1", color: "#B4791E", border: "1px solid #ECD6A1",
                  fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>
                  {stats.pendingCount} en attente
                </span>
              </div>

              <div style={{ padding: "6px 8px" }}>
                {dataLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 14, alignItems: "center", padding: 12, borderTop: i > 0 ? "1px solid #E5DFCE" : "none" }}>
                      <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-[160px]" />
                        <Skeleton className="h-3.5 w-[100px]" />
                        <Skeleton className="h-3 w-[120px]" />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Skeleton className="h-[34px] w-[34px] rounded-[10px]" />
                        <Skeleton className="h-[34px] w-[34px] rounded-[10px]" />
                      </div>
                    </div>
                  ))
                ) : pendingListings.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "#6E7B79", fontSize: 13.5 }}>
                    ✓ Aucune annonce en attente
                  </div>
                ) : pendingListings.map((listing, i) => {
                  const imgSrc = listing.images?.[0];
                  const busy = !!actionLoading[listing.id];
                  return (
                    <div key={listing.id} style={{
                      display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 14,
                      alignItems: "center", padding: 12, borderRadius: 14,
                      borderTop: i > 0 ? "1px solid #E5DFCE" : "none",
                      opacity: busy ? 0.5 : 1, transition: "opacity .2s",
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: 12, overflow: "hidden",
                        background: "#FAF7EC", border: "1px solid #E5DFCE", flexShrink: 0,
                      }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <svg viewBox="0 0 64 64" style={{ width: "100%", height: "100%", display: "block" }}>
                            <defs>
                              <linearGradient id={`grad${i}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#006E6E"/>
                                <stop offset="1" stopColor="#0B403F"/>
                              </linearGradient>
                            </defs>
                            <rect width="64" height="64" fill={`url(#grad${i})`}/>
                            <g fill="#ADEBB3" opacity=".85">
                              <path d="M10 38L32 22l22 16v18H10z"/>
                              <rect x="22" y="42" width="8" height="14" fill="#006E6E" opacity=".65"/>
                              <rect x="34" y="42" width="8" height="14" fill="#006E6E" opacity=".65"/>
                            </g>
                          </svg>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "#0F2A2A", letterSpacing: "-.005em" }}>{listing.title}</p>
                        <p style={{ margin: 0, fontSize: 12.5, color: "#6E7B79", display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                          {listing.wilaya}
                          {listing.rooms && <><span style={{ opacity: .5 }}>•</span>{listing.rooms} ch.</>}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#98A3A0" }}>
                          Par <b style={{ color: "#0F2A2A", fontWeight: 600 }}>{listing.profiles?.full_name || "Inconnu"}</b>
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={() => handleApprove(listing.id)}
                          disabled={busy}
                          aria-label="Approuver"
                          style={{
                            width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center",
                            background: "#ADEBB3", color: "#005B5B", border: "1px solid #8FD89A",
                            cursor: busy ? "not-allowed" : "pointer",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5 9-11"/></svg>
                        </button>
                        <button
                          onClick={() => handleReject(listing.id)}
                          disabled={busy}
                          aria-label="Refuser"
                          style={{
                            width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center",
                            background: "#FFFFFF", color: "#C13C26", border: "1px solid #F2C5BC",
                            cursor: busy ? "not-allowed" : "pointer",
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                borderTop: "1px solid #E5DFCE", padding: "12px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: 12.5, color: "#6E7B79",
              }}>
                <span>{pendingListings.length} affichées sur <b style={{ color: "#0F2A2A" }}>{stats.pendingCount}</b></span>
              </div>
            </article>

            {/* Activity Feed */}
            <article style={{
              background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18,
              boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -14px rgba(15,42,42,.18)",
            }}>
              <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #E5DFCE" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, letterSpacing: "-.005em", color: "#0F2A2A" }}>Activité récente</h2>
                  <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#6E7B79" }}>Flux des dernières actions sur la plateforme.</p>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
                  borderRadius: 999, background: "#E4F6E6", color: "#005B5B", border: "1px solid #C9E8CD",
                  fontSize: 11.5, fontWeight: 600, flexShrink: 0,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3.5"/><path d="M3 12a9 9 0 0 1 18 0M21 12a9 9 0 0 1-18 0"/></svg>
                  En temps réel
                </span>
              </div>

              <div style={{ padding: "14px 8px 6px" }}>
                {dataLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 10, padding: "10px 12px", alignItems: "flex-start" }}>
                      <Skeleton className="h-2.5 w-2.5 rounded-full mt-1.5" />
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-[140px]" />
                        <Skeleton className="h-3.5 w-[100px]" />
                      </div>
                      <Skeleton className="h-3.5 w-14" />
                    </div>
                  ))
                ) : activity.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "#6E7B79", fontSize: 13.5 }}>
                    Aucune activité récente
                  </div>
                ) : activity.map((item, i) => {
                  const dc = DOT_COLORS[item.color] || DOT_COLORS.teal;
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 10, padding: "10px 12px", alignItems: "flex-start" }}>
                      <div style={{ position: "relative", width: 24, display: "grid", placeItems: "start center", paddingTop: 6 }}>
                        {i < activity.length - 1 && (
                          <div style={{ position: "absolute", left: "50%", top: 18, bottom: -6, width: 1, background: "linear-gradient(to bottom, #D8D0B8, transparent)" }} />
                        )}
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: dc.bg, boxShadow: `0 0 0 4px ${dc.ring}`, display: "block" }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0F2A2A", letterSpacing: "-.003em" }}>{item.title}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#6E7B79" }}>
                          <b style={{ color: "#0F2A2A", fontWeight: 600 }}>{item.who}</b>
                          {item.sub ? ` — ${item.sub.length > 30 ? item.sub.slice(0, 30) + "…" : item.sub}` : ""}
                        </p>
                      </div>
                      <span style={{ fontSize: 11.5, color: "#98A3A0", whiteSpace: "nowrap", paddingTop: 2, fontFamily: "monospace" }}>
                        {timeAgo(item.time)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: "1px solid #E5DFCE", padding: "12px 20px", fontSize: 12.5, color: "#6E7B79" }}>
                {activity.length} événements affichés
              </div>
            </article>

          </section>

          {/* Users Table */}
          <section style={{
            background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18,
            boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -14px rgba(15,42,42,.18)",
          }}>
            <div style={{
              padding: "18px 22px 14px", display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 14, borderBottom: "1px solid #E5DFCE", flexWrap: "wrap",
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, letterSpacing: "-.005em", color: "#0F2A2A" }}>Gestion des utilisateurs</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#6E7B79" }}>Tous les comptes actifs sur la plateforme.</p>
              </div>
              <label style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px",
                background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 10,
                color: "#6E7B79", fontSize: 13, minWidth: 240,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "#0F2A2A", font: "inherit", fontSize: 13 }}
                />
              </label>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13.5 }}>
                <thead>
                  <tr>
                    {["Utilisateur", "Wilaya", "Inscrit le", "Rôle", "Actions"].map((h, i) => (
                      <th key={h} style={{
                        textAlign: i === 4 ? "right" : "left", fontWeight: 500, fontSize: 11.5,
                        textTransform: "uppercase", letterSpacing: ".06em", color: "#98A3A0",
                        padding: "14px 22px", borderBottom: "1px solid #E5DFCE",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                            <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-full" />
                            <div className="flex flex-col gap-1.5">
                              <Skeleton className="h-4 w-[120px]" />
                              <Skeleton className="h-3 w-[80px]" />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle" }}>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle" }}>
                          <Skeleton className="h-4 w-[80px]" />
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle" }}>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle", textAlign: "right" }}>
                          <Skeleton className="h-8 w-24 rounded-full ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredUsers.map((user, i) => {
                    const tone = AVATAR_TONES[i % AVATAR_TONES.length];
                    const isAdmin = user.role === "admin";
                    return (
                      <tr key={user.id}>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                            <span style={{
                              width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center",
                              fontWeight: 700, fontSize: 12, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`,
                            }}>{initials(user.full_name)}</span>
                            <span>
                              <span style={{ display: "block", fontWeight: 600, color: "#0F2A2A", letterSpacing: "-.003em" }}>{user.full_name || "—"}</span>
                              <span style={{ display: "block", fontSize: 11.5, color: "#6E7B79", marginTop: 1, fontFamily: "monospace" }}>#{user.id.slice(0, 8)}</span>
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle" }}>
                          {user.wilaya ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
                              borderRadius: 999, background: "#FAF7EC", border: "1px solid #E5DFCE",
                              color: "#0F2A2A", fontSize: 12, fontWeight: 500,
                            }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: .75 }}><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                              {user.wilaya}
                            </span>
                          ) : <span style={{ color: "#98A3A0" }}>—</span>}
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle", color: "#6E7B79", fontFamily: "monospace" }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
                            borderRadius: 999,
                            background: isAdmin ? "#005B5B" : "#E4F6E6",
                            color: isAdmin ? "#ADEBB3" : "#005B5B",
                            border: `1px solid ${isAdmin ? "#005B5B" : "#C9E8CD"}`,
                            fontSize: 11.5, fontWeight: 600,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                            {isAdmin ? "Admin" : "Utilisateur"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 22px", borderBottom: "1px solid #E5DFCE", verticalAlign: "middle", textAlign: "right" }}>
                          <Link
                            to={`/profile/${user.id}`}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
                              borderRadius: 999, background: "#E4F6E6", border: "1px solid #C9E8CD",
                              color: "#005B5B", fontSize: 12.5, fontWeight: 600, textDecoration: "none",
                            }}
                          >
                            Voir profil
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!dataLoading && filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "32px 22px", textAlign: "center", color: "#6E7B79", fontSize: 13.5 }}>
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{
              padding: "14px 22px", display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 12,
              borderTop: "1px solid #E5DFCE", fontSize: 12.5, color: "#6E7B79",
            }}>
              <span>{filteredUsers.length} sur <b style={{ color: "#0F2A2A" }}>{allUsers.length}</b> utilisateurs</span>
            </div>
          </section>

        </main>
      </section>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
    </div>
  );
}
