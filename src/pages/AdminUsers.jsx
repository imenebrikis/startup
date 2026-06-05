import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "../components/ui/skeleton";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";
import LanguageSelector from "../components/LanguageSelector";
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
        <svg key={n} width="13" height="13" viewBox="0 0 24 24"
          fill={n <= rating ? "#006E6E" : "none"}
          stroke={n <= rating ? "#006E6E" : "#D8D0B8"}
          strokeWidth="1.8">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review, labelLine }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: "#FAF7EC", border: "1px solid #E5DFCE" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <Stars rating={review.rating} />
        <span style={{ fontSize: 11, color: "#98A3A0", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      </div>
      <p style={{ margin: "0 0 5px", fontSize: 13, color: "#0F2A2A", lineHeight: 1.5 }}>
        {review.comment || <em style={{ color: "#98A3A0" }}>{t("admin.users.noComment")}</em>}
      </p>
      <p style={{ margin: 0, fontSize: 11.5, color: "#6E7B79" }}>{labelLine}</p>
    </div>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

  const [dataLoading, setDataLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tous");
  const [page, setPage] = useState(1);

  const [togglingId, setTogglingId] = useState(null);

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
    if (!profile || profile.role !== "admin") { navigate("/dashboard"); return; }
    setAdminProfile({ ...profile, email: user.email });
    await fetchData();
  }

  async function fetchData() {
    setDataLoading(true);
    try {
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
    } finally {
      setDataLoading(false);
    }
  }

  async function openUserSheet(user) {
    setSelectedUser(user);
    setSheetOpen(true);
    setSheetLoading(true);
    setReceivedReviews([]);
    setGivenReviews([]);

    const [{ data: userListings }, { data: given }] = await Promise.all([
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

    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: newBanned } : u));
    setSelectedUser(s => s?.id === user.id ? { ...s, is_banned: newBanned } : s);

    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: newBanned })
      .eq("id", user.id);

    setTogglingId(null);

    if (error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: user.is_banned } : u));
      setSelectedUser(s => s?.id === user.id ? { ...s, is_banned: user.is_banned } : s);
      toast.error(t("admin.users.suspendError"));
    } else {
      toast.success(newBanned ? t("admin.users.suspendSuccess") : t("admin.users.reactivateSuccess"));
    }
  }

  const counts = useMemo(() => ({
    tous:      users.length,
    actifs:    users.filter(u => !u.is_banned).length,
    suspendus: users.filter(u => u.is_banned).length,
  }), [users]);

  const filtered = useMemo(() => {
    let result = users;
    if (activeTab === "actifs")    result = result.filter(u => !u.is_banned);
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
  const pageUsers  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(val) { setSearchQuery(val); setPage(1); }
  function handleTab(tab)    { setActiveTab(tab); setPage(1); }

  const TABS = [
    { key: "tous",      label: t("admin.users.tabs.all"),       count: counts.tous      },
    { key: "actifs",    label: t("admin.users.tabs.active"),    count: counts.actifs    },
    { key: "suspendus", label: t("admin.users.tabs.suspended"), count: counts.suspendus },
  ];

  const from  = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to    = Math.min(page * PAGE_SIZE, filtered.length);
  const range = `${from}–${to}`;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3EEE0", fontFamily: "Geist, Inter, sans-serif", color: "#0F2A2A" }}>

      <AdminSidebar active="users" pendingCount={pendingCount} adminProfile={adminProfile} />

      <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "14px 24px", background: "rgba(243,238,224,.88)",
          backdropFilter: "blur(12px)", borderBottom: "1px solid #E5DFCE",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6E7B79", fontSize: 13, fontWeight: 500 }}>
            DarBelDar
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
              borderRadius: 999, background: "#006E6E", color: "#ADEBB3",
              fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ADEBB3" }} />
              {t("admin.badge")}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
            <Link to="/admin" style={{ color: "#6E7B79", textDecoration: "none" }}>{t("admin.dashboard")}</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
            <b style={{ color: "#0F2A2A", fontWeight: 600 }}>{t("admin.sidebar.users")}</b>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LanguageSelector />
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6E7B79",
              padding: "6px 10px", borderRadius: 999, background: "#FFFFFF", border: "1px solid #E5DFCE",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ADEBB3", boxShadow: "0 0 0 3px rgba(173,235,179,.18)", animation: "pulse 1.8s infinite" }} />
              {t("admin.live")}
            </span>
          </div>
        </header>

        <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Title */}
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", color: "#0F2A2A" }}>
              {t("admin.users.title")}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#6E7B79" }}>
              {t("admin.users.accountsCount", { count: users.length })}
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18,
            boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -14px rgba(15,42,42,.18)",
          }}>

            {/* Toolbar */}
            <div style={{ borderBottom: "1px solid #E5DFCE" }}>

              {/* Tab strip */}
              <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 2 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 2,
                  padding: 3, borderRadius: 11, background: "#F3EEE0", border: "1px solid #E5DFCE",
                }}>
                  {TABS.map(({ key, label, count }) => {
                    const isActive     = activeTab === key;
                    const isSuspendus  = key === "suspendus";
                    return (
                      <button
                        key={key}
                        onClick={() => handleTab(key)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: isActive ? "#FFFFFF" : "transparent",
                          boxShadow: isActive ? "0 1px 4px rgba(15,42,42,.09), 0 1px 0 rgba(255,255,255,.9) inset" : "none",
                          color: isActive ? "#0F2A2A" : "#6E7B79",
                          fontSize: 13, fontWeight: isActive ? 600 : 500,
                          transition: "all .15s", whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                          background: isActive ? (isSuspendus ? "#FDECEA" : "#E4F6E6") : "#E5DFCE",
                          border: isActive ? `1px solid ${isSuspendus ? "#F5C6C2" : "#C9E8CD"}` : "1px solid transparent",
                          color: isActive ? (isSuspendus ? "#C0392B" : "#006E6E") : "#98A3A0",
                          fontSize: 10.5, fontWeight: 700, lineHeight: 1, transition: "all .15s",
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search + count */}
              <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px",
                  background: "#FAF7EC", border: "1px solid #E5DFCE", borderRadius: 12,
                  color: "#6E7B79", fontSize: 13.5, minWidth: 280,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  <input
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder={t("admin.users.searchByNameEmail")}
                    style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "#0F2A2A", font: "inherit", fontSize: 13.5 }}
                  />
                  {searchQuery && (
                    <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#98A3A0", lineHeight: 1, padding: 0 }}>
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
                  {t("admin.users.countChip", { count: filtered.length })}
                </span>
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ paddingLeft: 24, paddingRight: 16, color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    {t("admin.users.cols.user")}
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    {t("admin.users.cols.email")}
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    {t("admin.users.cols.wilaya")}
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500 }}>
                    {t("admin.users.cols.registeredOn")}
                  </TableHead>
                  <TableHead style={{ color: "#98A3A0", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 500, textAlign: "right", paddingRight: 24 }}>
                    {t("admin.users.cols.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {dataLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell style={{ paddingLeft: 24, paddingRight: 16, paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-3.5 w-[80px]" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}><Skeleton className="h-4 w-[180px]" /></TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14 }}><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14, paddingRight: 24, textAlign: "right" }}>
                        <Skeleton className="h-8 w-20 rounded-full ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : pageUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} style={{ textAlign: "center", padding: "40px 24px", color: "#6E7B79", fontSize: 14 }}>
                      {searchQuery ? t("admin.users.emptySearch") : t("admin.users.emptyNoResults")}
                    </TableCell>
                  </TableRow>
                ) : pageUsers.map((user, i) => {
                  const tone    = AVATAR_TONES[((page - 1) * PAGE_SIZE + i) % AVATAR_TONES.length];
                  const isAdmin = user.role === "admin";
                  return (
                    <TableRow key={user.id}>
                      {/* User */}
                      <TableCell style={{ paddingLeft: 24, paddingRight: 16, paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                            display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12.5,
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
                                }}>{t("admin.role.admin")}</span>
                              ) : (
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px",
                                  borderRadius: 999,
                                  background: user.is_banned ? "#FDECEA" : "#E4F6E6",
                                  border: `1px solid ${user.is_banned ? "#F5C6C2" : "#C9E8CD"}`,
                                  color: user.is_banned ? "#C0392B" : "#006E6E",
                                  fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: user.is_banned ? "#C0392B" : "#006E6E" }} />
                                  {user.is_banned ? t("admin.users.tabs.suspended") : t("admin.users.tabs.active")}
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
                        {user.created_at ? new Date(user.created_at).toLocaleDateString(locale) : "—"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell style={{ paddingTop: 14, paddingBottom: 14, paddingRight: 24, textAlign: "right" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button style={{
                              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
                              borderRadius: 999, background: "#E4F6E6", border: "1px solid #C9E8CD",
                              color: "#006E6E", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                            }}>
                              {t("admin.users.cols.actions")}
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
                            <DropdownMenuItem onSelect={() => openUserSheet(user)} style={{ cursor: "pointer" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 8 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                              {t("admin.users.viewProfile")}
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
                                      {t("admin.inProgress")}
                                    </>
                                  ) : user.is_banned ? (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 8 }}><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l3 3 5-5"/></svg>
                                      {t("admin.users.reactivate")}
                                    </>
                                  ) : (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 8 }}><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                                      {t("admin.users.suspend")}
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
                {filtered.length === 0
                  ? "0"
                  : t("admin.users.pageFooter", { range, count: filtered.length })
                }
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#0F2A2A", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}
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
                  style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#0F2A2A", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </section>

      {/* User Profile Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0" showCloseButton>
          {selectedUser && (
            <>
              {/* Sheet header */}
              <div style={{ background: "linear-gradient(135deg, #006E6E 0%, #004F4F 100%)", padding: "32px 24px 24px" }}>
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
                      {selectedUser.full_name || t("admin.activity.unknown")}
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
                        ✦ {t("admin.users.administrator")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Info grid */}
                <section>
                  <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#98A3A0" }}>
                    {t("admin.users.information")}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      {
                        label: t("admin.users.cols.wilaya"),
                        value: selectedUser.wilaya || "—",
                        icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>,
                      },
                      {
                        label: t("admin.users.cols.registeredOn"),
                        value: selectedUser.created_at
                          ? new Date(selectedUser.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
                          : "—",
                        icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
                      },
                      {
                        label: t("admin.users.neighborhood"),
                        value: selectedUser.quartier || "—",
                        icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>,
                      },
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
                    {t("admin.users.viewPublicProfile")}
                  </Link>
                </section>

                {/* Reviews received */}
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#98A3A0" }}>
                      {t("admin.users.reviewsReceived")}
                    </h3>
                    <span style={{ padding: "3px 10px", borderRadius: 999, background: "#E4F6E6", border: "1px solid #C9E8CD", color: "#006E6E", fontSize: 11.5, fontWeight: 600 }}>
                      {receivedReviews.length}
                    </span>
                  </div>
                  {sheetLoading ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>{t("admin.loading")}</div>
                  ) : receivedReviews.length === 0 ? (
                    <div style={{ padding: "18px 16px", borderRadius: 12, background: "#FAF7EC", border: "1px solid #E5DFCE", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>
                      {t("admin.users.noReviewsReceived")}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {receivedReviews.map(r => (
                        <ReviewCard
                          key={r.id}
                          review={r}
                          labelLine={t("admin.users.reviewByLine", {
                            name: r.profiles?.full_name || t("admin.activity.unknown"),
                            listing: r.listings?.title || "",
                          })}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Reviews given */}
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#98A3A0" }}>
                      {t("admin.users.reviewsGiven")}
                    </h3>
                    <span style={{ padding: "3px 10px", borderRadius: 999, background: "#E4F6E6", border: "1px solid #C9E8CD", color: "#006E6E", fontSize: 11.5, fontWeight: 600 }}>
                      {givenReviews.length}
                    </span>
                  </div>
                  {sheetLoading ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>{t("admin.loading")}</div>
                  ) : givenReviews.length === 0 ? (
                    <div style={{ padding: "18px 16px", borderRadius: 12, background: "#FAF7EC", border: "1px solid #E5DFCE", textAlign: "center", color: "#98A3A0", fontSize: 13 }}>
                      {t("admin.users.noReviewsGiven")}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {givenReviews.map(r => (
                        <ReviewCard
                          key={r.id}
                          review={r}
                          labelLine={t("admin.users.reviewOnLine", {
                            listing: r.listings?.title || t("admin.users.unknownListing"),
                          })}
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
