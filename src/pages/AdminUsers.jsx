import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "../components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const PAGE_SIZE = 10;

const AVATAR_TONES = [
  { bg: "#E4F6E6", color: "#006E6E", border: "#C9E8CD" },
  { bg: "#006E6E", color: "#ADEBB3", border: "#006E6E" },
  { bg: "#F1E7CC", color: "#7A5A1A", border: "#E6D9B2" },
  { bg: "#EFE7FB", color: "#7A55C9", border: "#DCCEF5" },
  { bg: "#E4EFFA", color: "#2F6FB5", border: "#C9DCF1" },
];

function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

function Stars({ rating }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width="13" height="13" viewBox="0 0 24 24" fill={n <= rating ? "#006E6E" : "none"} stroke={n <= rating ? "#006E6E" : "#D8D0B8"} strokeWidth="1.8">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review, labelLine }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 12,
      background: "#FAF7EC", border: "1px solid #E5DFCE",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <Stars rating={review.rating} />
        <span style={{ fontSize: 11, color: "#98A3A0", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {new Date(review.created_at).toLocaleDateString("fr-FR")}
        </span>
      </div>
      <p style={{ margin: "0 0 5px", fontSize: 13, color: "#0F2A2A", lineHeight: 1.5 }}>
        {review.comment || <em style={{ color: "#98A3A0" }}>Aucun commentaire</em>}
      </p>
      <p style={{ margin: 0, fontSize: 11.5, color: "#6E7B79" }}>{labelLine}</p>
    </div>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [users, setUsers] = useState([]);        // merged profile + email rows
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tous");
  const [page, setPage] = useState(1);

  const [togglingId, setTogglingId] = useState(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [givenReviews, setGivenReviews] = useState([]);

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
    const [
      { data: profiles },
      { data: emailRows },
      { count: pending },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_admin_users_email"),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const emailMap = {};
    emailRows?.forEach(r => { emailMap[r.id] = r.email; });

    setUsers((profiles || []).map(p => ({ ...p, email: emailMap[p.id] || "—" })));
    setPendingCount(pending || 0);
  }

  async function openUserSheet(user) {
    setSelectedUser(user);
    setSheetOpen(true);
    setSheetLoading(true);
    setReceivedReviews([]);
    setGivenReviews([]);

    const [
      { data: userListings },
      { data: given },
    ] = await Promise.all([
      supabase.from("listings").select("id, title").eq("user_id", user.id),
      supabase.from("reviews")
        .select("*, listings!reviews_listing_id_fkey(title)")
        .eq("reviewer_id", user.id),
    ]);

    let received = [];
    if (userListings && userListings.length > 0) {
      const ids = userListings.map(l => l.id);
      const { data: rev } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_reviewer_id_fkey(full_name), listings!reviews_listing_id_fkey(title)")
        .in("listing_id", ids);
      received = rev || [];
    }

    setReceivedReviews(received);
    setGivenReviews(given || []);
    setSheetLoading(false);
  }

  async function toggleBan(user) {
    const newBanned = !user.is_banned;
    setTogglingId(user.id);

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: newBanned } : u));
    setSelectedUser(s => s?.id === user.id ? { ...s, is_banned: newBanned } : s);

    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: newBanned })
      .eq("id", user.id);

    setTogglingId(null);

    if (error) {
      // Rollback
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: user.is_banned } : u));
      setSelectedUser(s => s?.id === user.id ? { ...s, is_banned: user.is_banned } : s);
      toast.error("Échec de la mise à jour du statut.");
    } else {
      toast.success(newBanned ? "Compte suspendu avec succès." : "Compte réactivé avec succès.");
    }
  }

  // Tab counts always derived from the full unfiltered list
  const counts = useMemo(() => ({
    tous: users.length,
    actifs: users.filter(u => !u.is_banned).length,
    suspendus: users.filter(u => u.is_banned).length,
  }), [users]);

  // Filtered + paginated
  const filtered = useMemo(() => {
    let result = users;
    if (activeTab === "actifs") result = result.filter(u => !u.is_banned);
    else if (activeTab === "suspendus") result = result.filter(u => u.is_banned);
    const q = searchQuery.toLowerCase();
    if (q) result = result.filter(u =>
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.wilaya || "").toLowerCase().includes(q)
    );
    return result;
  }, [users, searchQuery, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(val) {
    setSearchQuery(val);
    setPage(1);
  }

  function handleTab(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  // ---- Loading
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F3EEE0", fontFamily: "Inter, sans-serif", color: "#0F2A2A", fontSize: 15 }}>
        Chargement...
      </div>
    );
  }

  // ---- Unauthorized
  if (!authorized) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F3EEE0", gap: 16, fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2 style={{ margin: 0, color: "#0F2A2A", fontSize: 22, fontWeight: 700 }}>Accès réservé aux administrateurs</h2>
        <p style={{ margin: 0, color: "#6E7B79", fontSize: 14 }}>Votre compte n'a pas les droits d'accès à cette page.</p>
        <button onClick={() => navigate("/dashboard")} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, background: "#006E6E", color: "#ADEBB3", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3EEE0", fontFamily: "Geist, Inter, sans-serif", color: "#0F2A2A" }}>

      <AdminSidebar active="users" pendingCount={pendingCount} adminProfile={adminProfile} />

      {/* Main */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top Bar */}
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
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
              borderRadius: 999, background: "#006E6E", color: "#ADEBB3",
              fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ADEBB3" }} />
              Admin
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
            <Link to="/admin" style={{ color: "#6E7B79", textDecoration: "none" }}>Tableau de bord</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
            <b style={{ color: "#0F2A2A", fontWeight: 600 }}>Utilisateurs</b>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6E7B79",
              padding: "6px 10px", borderRadius: 999, background: "#FFFFFF", border: "1px solid #E5DFCE",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ADEBB3", boxShadow: "0 0 0 3px rgba(173,235,179,.18)", animation: "pulse 1.8s infinite" }} />
              En direct
            </span>
          </div>
        </header>

        <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Title */}
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", color: "#0F2A2A" }}>Gestion des utilisateurs</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#6E7B79" }}>
              {users.length} compte{users.length !== 1 ? "s" : ""} enregistré{users.length !== 1 ? "s" : ""} sur la plateforme
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18,
            boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -14px rgba(15,42,42,.18)",
          }}>

            {/* Toolbar */}
            <div style={{ borderBottom: "1px solid #E5DFCE" }}>

              {/* Tab strip row */}
              <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 2 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 2,
                  padding: 3, borderRadius: 11, background: "#F3EEE0", border: "1px solid #E5DFCE",
                }}>
                  {[
                    { key: "tous",      label: "Tous",      count: counts.tous },
                    { key: "actifs",    label: "Actifs",    count: counts.actifs },
                    { key: "suspendus", label: "Suspendus", count: counts.suspendus },
                  ].map(({ key, label, count }) => {
                    const isActive = activeTab === key;
                    const isSuspendus = key === "suspendus";
                    return (
                      <button
                        key={key}
                        onClick={() => handleTab(key)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: isActive ? "#FFFFFF" : "transparent",
                          boxShadow: isActive
                            ? "0 1px 4px rgba(15,42,42,.09), 0 1px 0 rgba(255,255,255,.9) inset"
                            : "none",
                          color: isActive ? "#0F2A2A" : "#6E7B79",
                          fontSize: 13, fontWeight: isActive ? 600 : 500,
                          transition: "all .15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                          background: isActive
                            ? isSuspendus ? "#FDECEA" : "#E4F6E6"
                            : "#E5DFCE",
                          border: isActive
                            ? isSuspendus ? "1px solid #F5C6C2" : "1px solid #C9E8CD"
                            : "1px solid transparent",
                          color: isActive
                            ? isSuspendus ? "#C0392B" : "#006E6E"
                            : "#98A3A0",
                          fontSize: 10.5, fontWeight: 700, lineHeight: 1,
                          transition: "all .15s",
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search + count row */}
              <div style={{
                padding: "12px 20px", display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 12, flexWrap: "wrap",
              }}>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px",
                  background: "#FAF7EC", border: "1px solid #E5DFCE", borderRadius: 12,
                  color: "#6E7B79", fontSize: 13.5, minWidth: 280,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  <input
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Rechercher par nom, email ou wilaya…"
                    style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "#0F2A2A", font: "inherit", fontSize: 13.5 }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch("")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#98A3A0", lineHeight: 1, padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                  )}
                </label>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  borderRadius: 999, background: "#E4F6E6", border: "1px solid #C9E8CD",
                  color: "#006E6E", fontSize: 12.5, fontWeight: 600,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#006E6E" }} />
                  {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ paddingLeft: 24, paddingRight: 16, color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    Utilisateur
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    Email
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    Wilaya
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    Inscrit le
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500, textAlign: "right", paddingRight: 24 }}>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", padding: "40px 24px", color: "#6E7B79", fontSize: 14 }}>
                      {searchQuery ? "Aucun utilisateur correspond à cette recherche." : "Aucun utilisateur trouvé."}
                    </TableCell>
                  </TableRow>
                ) : pageUsers.map((user, i) => {
                  const tone = AVATAR_TONES[((page - 1) * PAGE_SIZE + i) % AVATAR_TONES.length];
                  const isAdmin = user.role === "admin";
                  return (
                    <TableRow key={user.id}>
                      {/* Utilisateur */}
                      <TableCell style={{ paddingLeft: 24, paddingRight: 16, paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                            display: "grid", placeItems: "center",
                            fontWeight: 700, fontSize: 12.5,
                            background: tone.bg, color: tone.color, border: `1.5px solid ${tone.border}`,
                          }}>
                            {initials(user.full_name)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0F2A2A", fontSize: 13.5, letterSpacing: "-.003em" }}>
                              {user.full_name || "—"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                              {isAdmin ? (
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px",
                                  borderRadius: 999, background: "#006E6E", color: "#ADEBB3",
                                  fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
                                }}>Admin</span>
                              ) : (
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px",
                                  borderRadius: 999,
                                  background: user.is_banned ? "#FDECEA" : "#E4F6E6",
                                  border: `1px solid ${user.is_banned ? "#F5C6C2" : "#C9E8CD"}`,
                                  color: user.is_banned ? "#C0392B" : "#006E6E",
                                  fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
                                }}>
                                  <span style={{
                                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                                    background: user.is_banned ? "#C0392B" : "#006E6E",
                                  }} />
                                  {user.is_banned ? "Suspendu" : "Actif"}
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: "#98A3A0", fontFamily: "monospace" }}>#{user.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14, fontSize: 13, color: "#6E7B79" }}>
                        {user.email}
                      </TableCell>

                      {/* Wilaya */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}>
                        {user.wilaya ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px",
                            borderRadius: 999, background: "#FAF7EC", border: "1px solid #E5DFCE",
                            color: "#0F2A2A", fontSize: 12, fontWeight: 500,
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: .7 }}><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                            {user.wilaya}
                          </span>
                        ) : <span style={{ color: "#D8D0B8" }}>—</span>}
                      </TableCell>

                      {/* Inscrit le */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14, fontSize: 13, color: "#6E7B79", fontFamily: "monospace" }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14, paddingRight: 24, textAlign: "right" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
                                borderRadius: 999, background: "#E4F6E6", border: "1px solid #C9E8CD",
                                color: "#006E6E", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Actions
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
                            <DropdownMenuItem onSelect={() => openUserSheet(user)} style={{ cursor: "pointer" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 8 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                              Voir profil
                            </DropdownMenuItem>
                            {!isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => toggleBan(user)}
                                  disabled={togglingId === user.id}
                                  style={{
                                    cursor: togglingId === user.id ? "not-allowed" : "pointer",
                                    color: user.is_banned ? "#006E6E" : "#C0392B",
                                    opacity: togglingId === user.id ? 0.6 : 1,
                                  }}
                                >
                                  {togglingId === user.id ? (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, animation: "spin .7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                                      Mise à jour…
                                    </>
                                  ) : user.is_banned ? (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 8 }}><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l3 3 5-5"/></svg>
                                      Réactiver le compte
                                    </>
                                  ) : (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 8 }}><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                                      Suspendre le compte
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 24px", borderTop: "1px solid #E5DFCE",
              fontSize: 12.5, color: "#6E7B79",
            }}>
              <span>
                {filtered.length === 0 ? "0" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}`} sur <b style={{ color: "#0F2A2A" }}>{filtered.length}</b> utilisateur{filtered.length !== 1 ? "s" : ""}
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center",
                    background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#0F2A2A",
                    cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6"/></svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === "…" ? (
                      <span key={`el${i}`} style={{ width: 32, height: 32, display: "grid", placeItems: "center", color: "#98A3A0", fontSize: 13 }}>…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center",
                          background: n === page ? "#006E6E" : "#FFFFFF",
                          border: `1px solid ${n === page ? "#006E6E" : "#E5DFCE"}`,
                          color: n === page ? "#ADEBB3" : "#0F2A2A",
                          cursor: "pointer", fontSize: 12.5, fontWeight: n === page ? 600 : 400,
                        }}
                      >{n}</button>
                    )
                  )
                }

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center",
                    background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#0F2A2A",
                    cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </section>

      {/* ===== User Profile Sheet ===== */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0" showCloseButton>
          {selectedUser && (
            <>
              {/* Sheet Header — user hero */}
              <div style={{
                background: "linear-gradient(135deg, #006E6E 0%, #004F4F 100%)",
                padding: "32px 24px 24px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{
                    width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                    display: "grid", placeItems: "center",
                    background: "#ADEBB3", color: "#006E6E",
                    fontWeight: 800, fontSize: 20,
                    border: "2px solid rgba(173,235,179,.4)",
                  }}>
                    {initials(selectedUser.full_name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <SheetTitle style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 700, margin: 0 }}>
                      {selectedUser.full_name || "Utilisateur"}
                    </SheetTitle>
                    <SheetDescription style={{ color: "rgba(173,235,179,.85)", margin: "4px 0 0", fontSize: 13 }}>
                      {selectedUser.email}
                    </SheetDescription>
                    {selectedUser.role === "admin" && (
                      <span style={{
                        marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 999,
                        background: "rgba(173,235,179,.2)", border: "1px solid rgba(173,235,179,.35)",
                        color: "#ADEBB3", fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em",
                      }}>
                        ✦ Administrateur
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Basic Info Grid */}
                <section>
                  <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#98A3A0" }}>
                    Informations
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Wilaya", value: selectedUser.wilaya || "—", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg> },
                      { label: "Inscrit le", value: selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
                      { label: "Quartier", value: selectedUser.quartier || "—", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ padding: "12px 14px", borderRadius: 12, background: "#FAF7EC", border: "1px solid #E5DFCE" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6E7B79", marginBottom: 5, fontSize: 11.5, fontWeight: 500 }}>
                          {icon}
                          {label}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0F2A2A" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Link to public profile */}
                  <Link
                    to={`/profile/${selectedUser.id}`}
                    onClick={() => setSheetOpen(false)}
                    style={{
                      marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "9px 16px", borderRadius: 10,
                      background: "#006E6E", color: "#ADEBB3",
                      fontSize: 13, fontWeight: 600, textDecoration: "none",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    Voir profil public
                  </Link>
                </section>

                {/* Avis reçus */}
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#98A3A0" }}>
                      Avis reçus
                    </h3>
                    <span style={{
                      padding: "3px 10px", borderRadius: 999,
                      background: "#E4F6E6", border: "1px solid #C9E8CD",
                      color: "#006E6E", fontSize: 11.5, fontWeight: 600,
                    }}>
                      {receivedReviews.length}
                    </span>
                  </div>
                  {sheetLoading ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>Chargement…</div>
                  ) : receivedReviews.length === 0 ? (
                    <div style={{ padding: "18px 16px", borderRadius: 12, background: "#FAF7EC", border: "1px solid #E5DFCE", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>
                      Aucun avis reçu pour ce moment.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {receivedReviews.map(r => (
                        <ReviewCard
                          key={r.id}
                          review={r}
                          labelLine={`Par ${r.profiles?.full_name || "Inconnu"} · ${r.listings?.title || ""}`}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Avis laissés */}
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#98A3A0" }}>
                      Avis laissés
                    </h3>
                    <span style={{
                      padding: "3px 10px", borderRadius: 999,
                      background: "#E4F6E6", border: "1px solid #C9E8CD",
                      color: "#006E6E", fontSize: 11.5, fontWeight: 600,
                    }}>
                      {givenReviews.length}
                    </span>
                  </div>
                  {sheetLoading ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>Chargement…</div>
                  ) : givenReviews.length === 0 ? (
                    <div style={{ padding: "18px 16px", borderRadius: 12, background: "#FAF7EC", border: "1px solid #E5DFCE", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>
                      Aucun avis laissé pour ce moment.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {givenReviews.map(r => (
                        <ReviewCard
                          key={r.id}
                          review={r}
                          labelLine={`Sur l'annonce · ${r.listings?.title || "Annonce inconnue"}`}
                        />
                      ))}
                    </div>
                  )}
                </section>

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
