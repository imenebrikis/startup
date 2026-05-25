import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, Trash2, Check, Star, MessageSquareText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TONES = [
  { bg: "#E0F2FE", color: "#0369A1" },
  { bg: "#F3E8FF", color: "#7E22CE" },
  { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" },
  { bg: "#FFE4E6", color: "#BE123C" },
  { bg: "#F1F5F9", color: "#334155" },
];

function ini(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

function toneFor(name) {
  if (!name) return TONES[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

function Avatar({ name, size = 34 }) {
  const t = toneFor(name);
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      display: "grid", placeItems: "center", flexShrink: 0,
      fontSize: size * 0.36, fontWeight: 700,
      background: t.bg, color: t.color,
      border: `1.5px solid ${t.color}22`,
    }}>
      {ini(name)}
    </span>
  );
}

function fmtDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function Stars({ value }) {
  const v = value || 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: "#C77A1E" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: 14, height: 14 }}
          fill={n <= v ? "#C77A1E" : "none"}
          strokeWidth={1.6}
        />
      ))}
      <span style={{ marginLeft: 6, fontSize: 12.5, color: "#475569", fontWeight: 600 }}>{v}/5</span>
    </span>
  );
}

export default function AdminReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [reports, setReports] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("comment_reports")
      .select(`
        id, reason, status, created_at,
        review:reviews!comment_id(
          id, rating, comment, created_at,
          reviewer:profiles!reviewer_id(id, full_name),
          listing:listings!listing_id(
            id, title, wilaya, user_id,
            owner:profiles!listings_user_id_fkey(id, full_name)
          )
        ),
        reporter:profiles!reporter_id(id, full_name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement", { description: error.message });
      setReports([]);
      return;
    }
    setReports(data || []);
  }, []);

  const fetchPending = useCallback(async () => {
    const { count } = await supabase
      .from("listings").select("*", { count: "exact", head: true }).eq("status", "pending");
    setPendingCount(count || 0);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") { setLoading(false); return; }
      setAdminProfile({ ...profile, email: user.email });
      setAuthorized(true);
      await Promise.all([fetchReports(), fetchPending()]);
      setLoading(false);
    })();
  }, [navigate, fetchReports, fetchPending]);

  const handleDismiss = async (report) => {
    setBusyId(report.id);
    const { error } = await supabase
      .from("comment_reports")
      .update({ status: "dismissed" })
      .eq("id", report.id);
    setBusyId(null);
    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    toast.success("Signalement ignoré", { description: "L'avis reste publié sur le site." });
  };

  const handleDeleteReview = async (report) => {
    if (!report.review?.id) {
      const { error } = await supabase
        .from("comment_reports").update({ status: "resolved" }).eq("id", report.id);
      setConfirmDelete(null);
      if (error) { toast.error("Erreur", { description: error.message }); return; }
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success("Signalement résolu");
      return;
    }

    setBusyId(report.id);
    const reviewId = report.review.id;

    const { error: upErr } = await supabase
      .from("comment_reports")
      .update({ status: "resolved" })
      .eq("comment_id", reviewId)
      .eq("status", "pending");
    if (upErr) {
      setBusyId(null);
      setConfirmDelete(null);
      toast.error("Erreur", { description: upErr.message });
      return;
    }

    const { error: delErr } = await supabase.from("reviews").delete().eq("id", reviewId);
    setBusyId(null);
    setConfirmDelete(null);
    if (delErr) {
      toast.error("Erreur lors de la suppression", { description: delErr.message });
      return;
    }
    setReports((prev) => prev.filter((r) => r.review?.id !== reviewId));
    toast.success("Avis supprimé", { description: "Tous les signalements liés ont été résolus." });
  };

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
      <AdminSidebar active="reports" pendingCount={pendingCount} adminProfile={adminProfile} />

      <main style={{ flex: 1, padding: "32px 40px 56px", maxWidth: 1280, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Modération des Avis <span style={{ display: "inline-block", transform: "translateY(-1px)" }}>🚩</span>
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#64748B", lineHeight: 1.55 }}>
              Examinez les avis signalés par les utilisateurs et décidez de leur sort.
            </p>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 999,
            background: reports.length > 0 ? "#FEF2F2" : "#F0FDF4",
            color: reports.length > 0 ? "#B91C1C" : "#15803D",
            border: `1px solid ${reports.length > 0 ? "#FECACA" : "#BBF7D0"}`,
            fontSize: 12.5, fontWeight: 700, letterSpacing: ".02em",
          }}>
            <Flag style={{ width: 13, height: 13 }} />
            {reports.length} en attente
          </span>
        </div>

        {/* Empty state */}
        {reports.length === 0 ? (
          <div style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 18,
            padding: "60px 40px", textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, background: "#F0FDF4",
              display: "grid", placeItems: "center", margin: "0 auto 16px",
              border: "1px solid #BBF7D0",
            }}>
              <Check style={{ width: 28, height: 28, color: "#15803D" }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
              Aucun signalement en attente
            </div>
            <div style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.6 }}>
              Vous serez notifié dès qu'un utilisateur signalera un avis.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {reports.map((report) => {
              const review = report.review;
              const author = review?.reviewer;
              const target = review?.listing?.owner || report.reporter;
              const reporter = report.reporter;
              const orphan = !review;

              return (
                <article
                  key={report.id}
                  style={{
                    background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16,
                    overflow: "hidden", boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                  }}
                >
                  {/* Top strip */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, padding: "11px 20px",
                    background: "#FEF2F2", borderBottom: "1px solid #FECACA",
                  }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#B91C1C", fontSize: 12.5, fontWeight: 700 }}>
                      <Flag style={{ width: 13, height: 13 }} />
                      Signalé le {fmtDate(report.created_at)}
                    </div>
                    {review?.listing?.title && (
                      <span style={{ fontSize: 12, color: "#7F1D1D", fontWeight: 500 }}>
                        Annonce : {review.listing.title}
                        {review.listing.wilaya ? ` · ${review.listing.wilaya}` : ""}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: "20px 24px 22px" }}>
                    {/* People row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "#94A3B8", fontWeight: 700, marginBottom: 8 }}>
                          Cible
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={target?.full_name} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {target?.full_name || "Utilisateur"}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 1 }}>
                              A reçu l'avis
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "#94A3B8", fontWeight: 700, marginBottom: 8 }}>
                          Auteur
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={author?.full_name} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {author?.full_name || (orphan ? "Avis supprimé" : "Utilisateur")}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 1 }}>
                              A écrit l'avis
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review content */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <MessageSquareText style={{ width: 14, height: 14, color: "#64748B" }} />
                        <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".1em", color: "#64748B", fontWeight: 700 }}>
                          Contenu de l'avis
                        </span>
                      </div>
                      {orphan ? (
                        <div style={{
                          background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
                          padding: "12px 14px", fontSize: 13, color: "#92400E",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <AlertTriangle style={{ width: 14, height: 14 }} />
                          L'avis original a déjà été supprimé.
                        </div>
                      ) : (
                        <div style={{
                          background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12,
                          padding: "14px 16px",
                        }}>
                          <div style={{ marginBottom: review?.comment ? 8 : 0 }}>
                            <Stars value={review?.rating} />
                          </div>
                          {review?.comment ? (
                            <p style={{ margin: 0, fontSize: 14, color: "#0F172A", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                              {review.comment}
                            </p>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
                              (Aucun texte — uniquement une note)
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Flag style={{ width: 14, height: 14, color: "#B91C1C" }} />
                        <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".1em", color: "#B91C1C", fontWeight: 700 }}>
                          Raison du signalement
                        </span>
                        {reporter?.full_name && (
                          <span style={{ fontSize: 11.5, color: "#94A3B8" }}>
                            · par {reporter.full_name}
                          </span>
                        )}
                      </div>
                      <div style={{
                        background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
                        padding: "12px 14px", fontSize: 13.5, color: "#7F1D1D", lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}>
                        {report.reason?.trim()
                          ? report.reason
                          : <span style={{ fontStyle: "italic", color: "#B91C1C" }}>Aucune raison précisée par l'utilisateur.</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                      <button
                        onClick={() => handleDismiss(report)}
                        disabled={busyId === report.id}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          padding: "10px 16px", borderRadius: 10,
                          background: "#F1F5F9", color: "#334155",
                          border: "1px solid #E2E8F0",
                          fontSize: 13.5, fontWeight: 600,
                          cursor: busyId === report.id ? "not-allowed" : "pointer",
                          opacity: busyId === report.id ? 0.6 : 1,
                        }}
                      >
                        <Check style={{ width: 14, height: 14 }} />
                        Ignorer
                      </button>
                      <button
                        onClick={() => setConfirmDelete(report)}
                        disabled={busyId === report.id || orphan}
                        title={orphan ? "L'avis a déjà été supprimé" : ""}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          padding: "10px 16px", borderRadius: 10,
                          background: orphan ? "#FCA5A5" : "#DC2626", color: "#FFFFFF",
                          border: "none",
                          fontSize: 13.5, fontWeight: 600,
                          cursor: busyId === report.id || orphan ? "not-allowed" : "pointer",
                          opacity: busyId === report.id ? 0.6 : 1,
                        }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                        Supprimer l'avis
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent style={{ borderRadius: 16, padding: 24, background: "#fff", border: "1px solid #E2E8F0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxWidth: 420, margin: "auto" }}>
          <AlertDialogHeader style={{ marginBottom: 18 }}>
            <AlertDialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <Trash2 style={{ width: 18, height: 18, color: "#DC2626" }} />
              Supprimer cet avis ?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: 14, color: "#64748B", lineHeight: 1.55 }}>
              Cette action est définitive. L'avis sera retiré du site et tous les signalements liés seront marqués comme résolus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <AlertDialogCancel asChild>
              <button style={{ padding: "10px 16px", borderRadius: 10, background: "#fff", color: "#0F172A", border: "1px solid #E2E8F0", fontSize: 14, fontWeight: 500, cursor: "pointer", margin: 0 }}>
                Annuler
              </button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <button
                onClick={() => confirmDelete && handleDeleteReview(confirmDelete)}
                style={{ padding: "10px 16px", borderRadius: 10, background: "#DC2626", color: "#FFFFFF", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
                Supprimer
              </button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
