import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2, CheckCircle, ChevronDown, Search, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

/**
 * Status values in the `comment_reports` table:
 *   - 'en_attente'  → pending admin review (default)
 *   - 'resolu'      → admin chose to keep the comment
 *   - 'rejete'      → admin removed the comment
 */
const STATUS_STYLE = {
  en_attente: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A", dot: "#B45309" },
  resolu:     { bg: "#E4F6E6", color: "#006E6E", border: "#ADEBB3", dot: "#006E6E" },
  rejete:     { bg: "#F3F4F6", color: "#6E7B79", border: "#D1D5DB", dot: "#9CA3AF" },
};

function normalizeStatus(raw) {
  if (raw === "resolu" || raw === "rejete" || raw === "en_attente") return raw;
  return "en_attente";
}

function fmtDate(s, locale = "fr-FR") {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(s, t) {
  if (!s) return "";
  const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (sec < 60) return t("admin.moderation.time.justNow");
  const m = Math.floor(sec / 60);
  if (m < 60)  return t("admin.moderation.time.minutesAgo", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24)  return t("admin.moderation.time.hoursAgo",   { count: h });
  return              t("admin.moderation.time.daysAgo",    { count: Math.floor(h / 24) });
}

function Stars({ rating }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i <= rating ? "#F59E0B" : "none"}
          stroke={i <= rating ? "#F59E0B" : "#D1D5DB"}
          strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const s = STATUS_STYLE[normalizeStatus(status)];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {t("admin.moderation.status." + normalizeStatus(status))}
    </span>
  );
}

export default function AdminReports() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

  const [loading, setLoading]           = useState(true);
  const [authorized, setAuthorized]     = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [reports, setReports]           = useState([]);
  const [activeTab, setActiveTab]       = useState("all");
  const [search, setSearch]             = useState("");
  const [actioning, setActioning]       = useState({});
  const [expanded, setExpanded]         = useState(null);

  const TABS = [
    { key: "all",        label: t("admin.moderation.tabs.all")        },
    { key: "en_attente", label: t("admin.moderation.tabs.en_attente") },
    { key: "resolu",     label: t("admin.moderation.tabs.resolu")     },
    { key: "rejete",     label: t("admin.moderation.tabs.rejete")     },
  ];

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") { navigate("/dashboard"); return; }
    setAdminProfile(profile);
    setAuthorized(true);
    await fetchReports();
    setLoading(false);
  }

  async function fetchReports() {
    const { data, error } = await supabase
      .from("comment_reports")
      .select(`
        *,
        reporter:profiles!comment_reports_reporter_id_fkey(full_name),
        review:reviews(
          id, comment, rating, created_at,
          listing:listings(id, title, wilaya),
          reviewer:profiles!reviews_reviewer_id_fkey(full_name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) { toast.error(t("admin.moderation.toast.errorLoading")); return; }
    setReports((data || []).map(r => ({ ...r, status: normalizeStatus(r.status) })));
  }

  const counts = useMemo(() => ({
    all:        reports.length,
    en_attente: reports.filter(r => r.status === "en_attente").length,
    resolu:     reports.filter(r => r.status === "resolu").length,
    rejete:     reports.filter(r => r.status === "rejete").length,
  }), [reports]);

  const filtered = useMemo(() => {
    let list = reports;
    if (activeTab === "en_attente") list = reports.filter(r => r.status === "en_attente");
    else if (activeTab === "resolu") list = reports.filter(r => r.status === "resolu");
    else if (activeTab === "rejete") list = reports.filter(r => r.status === "rejete");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.reporter?.full_name?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.review?.comment?.toLowerCase().includes(q) ||
        r.review?.listing?.title?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reports, activeTab, search]);

  async function handleRequestDelete(reportId, commentId) {
    if (actioning[reportId]) return;
    setActioning(a => ({ ...a, [reportId]: true }));

    const prev = reports.find(r => r.id === reportId);
    setReports(rs => rs.map(r => r.id === reportId ? { ...r, status: "rejete" } : r));
    setExpanded(null);

    try {
      if (commentId) {
        const { error: deleteErr } = await supabase.from("reviews").delete().eq("id", commentId);
        if (deleteErr) throw deleteErr;
      }
      const { error: updateErr } = await supabase
        .from("comment_reports").update({ status: "rejete" }).eq("id", reportId);
      if (updateErr) throw updateErr;
      toast.success(t("admin.moderation.toast.deleted"));
    } catch {
      setReports(rs => rs.map(r => r.id === reportId ? prev : r));
      toast.error(t("admin.moderation.toast.deleteError"));
    } finally {
      setActioning(a => ({ ...a, [reportId]: false }));
    }
  }

  async function handleKeepComment(reportId) {
    if (actioning[reportId]) return;
    setActioning(a => ({ ...a, [reportId]: true }));

    const prev = reports.find(r => r.id === reportId);
    setReports(rs => rs.map(r => r.id === reportId ? { ...r, status: "resolu" } : r));
    setExpanded(null);

    try {
      const { error } = await supabase
        .from("comment_reports").update({ status: "resolu" }).eq("id", reportId);
      if (error) throw error;
      toast.success(t("admin.moderation.toast.resolved"));
    } catch {
      setReports(rs => rs.map(r => r.id === reportId ? prev : r));
      toast.error(t("admin.moderation.toast.updateError"));
    } finally {
      setActioning(a => ({ ...a, [reportId]: false }));
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F3EEE0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <span style={{ color: "#6E7B79", fontSize: 14 }}>{t("admin.moderation.loading")}</span>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: "100vh", background: "#F3EEE0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <span style={{ color: "#C13C26", fontSize: 14 }}>{t("admin.moderation.accessDenied")}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F3EEE0", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <AdminSidebar active="reports" pendingCount={counts.en_attente} adminProfile={adminProfile} />

      <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
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
              borderRadius: 999, background: "#005B5B", color: "#ADEBB3",
              fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ADEBB3" }} />
              {t("admin.badge")}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6"/></svg>
            <b style={{ color: "#0F2A2A", fontWeight: 600 }}>{t("admin.sidebar.moderation")}</b>
          </span>
        </header>

        <main style={{ padding: "32px 40px 56px", minWidth: 0 }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F2A2A", letterSpacing: "-0.02em", margin: 0 }}>
              {t("admin.moderation.title")}
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#6E7B79" }}>
              {t("admin.moderation.subtitle")}
            </p>
          </div>

          {/* Toolbar — tabs + search */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>

            {/* Segmented tabs */}
            <div style={{ display: "flex", gap: 4, background: "#E8E2D2", padding: 4, borderRadius: 12 }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.key;
                const count    = counts[tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: "6px 14px", borderRadius: 9, border: "none", cursor: "pointer",
                      background: isActive ? "#FFFFFF" : "transparent",
                      color: isActive ? "#0F2A2A" : "#6E7B79",
                      fontWeight: isActive ? 600 : 500, fontSize: 13,
                      boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                      transition: "all .15s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span style={{
                        background: isActive && tab.key === "en_attente" ? "#FFFBEB" : isActive ? "#E4F6E6" : "#D4CEC0",
                        color:      isActive && tab.key === "en_attente" ? "#B45309" : isActive ? "#006E6E" : "#6E7B79",
                        border:     isActive && tab.key === "en_attente" ? "1px solid #FDE68A" : isActive ? "1px solid #ADEBB3" : "none",
                        fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6E7B79" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("admin.moderation.searchPlaceholder")}
                style={{
                  width: "100%", padding: "8px 12px 8px 32px",
                  border: "1px solid #E5DFCE", borderRadius: 10,
                  background: "#FFFFFF", fontSize: 13, color: "#0F2A2A",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Report list */}
          {filtered.length === 0 ? (
            <div style={{ borderRadius: 16, background: "#FFFFFF", border: "1px solid #E5DFCE", padding: "56px 24px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <ShieldCheck size={36} style={{ color: "#ADEBB3" }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0F2A2A", margin: "0 0 6px" }}>
                {t("admin.moderation.empty.title")}
              </p>
              <p style={{ fontSize: 13, color: "#6E7B79", margin: 0 }}>
                {activeTab === "en_attente"
                  ? t("admin.moderation.empty.pending")
                  : t("admin.moderation.empty.other")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(report => {
                const review     = report.review;
                const listing    = review?.listing;
                const reporter   = report.reporter;
                const reviewer   = review?.reviewer;
                const isExpanded = expanded === report.id;
                const isPending  = report.status === "en_attente";

                return (
                  <div
                    key={report.id}
                    style={{
                      borderRadius: 16, background: "#FFFFFF", overflow: "hidden",
                      border: `1px solid ${isPending ? "#FDE68A" : "#E5DFCE"}`,
                      boxShadow: isPending ? "0 0 0 3px rgba(180,121,30,0.07)" : "none",
                      transition: "box-shadow .2s, border-color .2s",
                    }}
                  >
                    {/* Card header */}
                    <div
                      style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}
                      onClick={() => setExpanded(isExpanded ? null : report.id)}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: isPending ? "#FFFBEB" : "#F9FAFB",
                        border: `1px solid ${isPending ? "#FDE68A" : "#E5DFCE"}`,
                        display: "grid", placeItems: "center",
                      }}>
                        <AlertTriangle size={16} style={{ color: isPending ? "#B45309" : "#9CA3AF" }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <StatusBadge status={report.status} />
                          {listing && (
                            <Link
                              to={`/listing/${listing.id}`}
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: 12.5, color: "#006E6E", fontWeight: 500, textDecoration: "none" }}
                            >
                              {listing.title}
                            </Link>
                          )}
                          {listing?.wilaya && (
                            <span style={{ fontSize: 12, color: "#98A3A0" }}>— {listing.wilaya}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: "#0F2A2A", marginBottom: 3 }}>
                          <span style={{ fontWeight: 600 }}>{t("admin.moderation.card.reportedBy")}</span>{" "}
                          {reporter?.full_name || t("admin.moderation.card.unknownUser")}
                          <span style={{ color: "#98A3A0", marginLeft: 8 }}>{timeAgo(report.created_at, t)}</span>
                        </div>
                        {report.reason && (
                          <div style={{ fontSize: 12.5, color: "#6E7B79" }}>
                            <span style={{ fontWeight: 500 }}>{t("admin.moderation.card.reason")}</span> {report.reason}
                          </div>
                        )}
                      </div>

                      <ChevronDown
                        size={16}
                        style={{
                          flexShrink: 0, color: "#9CA3AF",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform .2s",
                        }}
                      />
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #F0EAD8", padding: "16px 20px", background: "#FAFAF5" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "#98A3A0", marginBottom: 8 }}>
                          {t("admin.moderation.card.reportedReview")}
                        </div>

                        {review ? (
                          <div style={{ borderRadius: 12, background: "#FFFFFF", border: "1px solid #E5DFCE", padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F2A2A" }}>
                                {reviewer?.full_name || t("admin.moderation.card.unknownAuthor")}
                              </span>
                              <Stars rating={review.rating} />
                              <span style={{ fontSize: 11.5, color: "#98A3A0" }}>{fmtDate(review.created_at, locale)}</span>
                            </div>
                            <p style={{ fontSize: 13.5, color: "#374151", margin: 0, lineHeight: 1.55 }}>
                              {review.comment || <em style={{ color: "#98A3A0" }}>{t("admin.moderation.card.noComment")}</em>}
                            </p>

                            {isPending && (
                              <div className="flex gap-3 mt-4 justify-end">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={!!actioning[report.id]}
                                  onClick={() => handleRequestDelete(report.id, report.comment_id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("admin.moderation.actions.deleteComment")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!!actioning[report.id]}
                                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleKeepComment(report.id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                  {t("admin.moderation.actions.keepComment")}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: 13, color: "#98A3A0", margin: 0 }}>
                            {t("admin.moderation.card.reviewNotFound")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
