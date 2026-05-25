import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MapPin, Mail, Edit2, Save, X, Bed, Eye, Heart, ChevronDown, LogOut, CheckCircle2, Flag,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { supabase } from "../lib/supabase";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Sidebar from "../components/Sidebar";
import NotificationBell from "@/components/NotificationBell";


const WILAYAS = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar",
  "Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger",
  "Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma",
  "Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh",
  "Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued",
  "Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent",
  "Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar","Ouled Djellal","Béni Abbès",
  "In Salah","In Guezzam","Touggourt","Djanet","El M'Ghair","El Menia","Aflou","Barika",
  "Ksar Chellala","Messaad","Aïn Oussera","Bou Saâda","El Abiodh Sidi Cheikh",
  "El Kantara","Bir El Ater","Ksar El Boukhari","El Aricha",
];

export default function Profile() {
  const { id: paramId } = useParams();
  const [user, setUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ listings: 0, exchanges: 0, sales: 0 });
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "annonces");
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", wilaya: "", quartier: "" });
  const [listings, setListings] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportedReviewIds, setReportedReviewIds] = useState(() => new Set());
  const [reportingReview, setReportingReview] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUser(user);

      const targetId = paramId || user.id;
      const own = !paramId || paramId === user.id;
      setIsOwnProfile(own);

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", targetId).single();
      setProfile(profileData || {});
      setEditForm({
        full_name: profileData?.full_name || (own ? user.user_metadata?.full_name || "" : ""),
        wilaya: profileData?.wilaya || "",
        quartier: profileData?.quartier || "",
      });

      const [{ count: listingsCount }, { count: exchangesCount }, { count: salesCount }] = await Promise.all([
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("user_id", targetId),
        supabase.from("exchanges").select("*", { count: "exact", head: true }).eq("requester_id", targetId).eq("status", "accepted"),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("user_id", targetId).eq("is_for_sale", true).eq("is_verified", true),
      ]);
      setStats({ listings: listingsCount || 0, exchanges: exchangesCount || 0, sales: salesCount || 0 });

      const { data: listingsData } = await supabase.from("listings").select("*").eq("user_id", targetId).order("created_at", { ascending: false });
      setListings(listingsData || []);

      if (own) {
        const { data: exchangesData } = await supabase
          .from("exchanges")
          .select("*, listings(title, wilaya, city, images), profiles!requester_id(full_name)")
          .eq("requester_id", targetId).order("created_at", { ascending: false });
        setExchanges(exchangesData || []);

        const { data: savedData } = await supabase
          .from("user_favorites")
          .select("*, listings(id, title, wilaya, rooms, images, is_for_exchange, is_for_sale)")
          .eq("user_id", targetId).order("created_at", { ascending: false });
        setSavedListings(savedData || []);
      }

      const userListingIds = listingsData?.map((l) => l.id) || [];
      if (userListingIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*, profiles!reviewer_id(full_name), listings(title)")
          .in("listing_id", userListingIds).order("created_at", { ascending: false });
        setReviews(reviewsData || []);

        if (own && reviewsData?.length) {
          const { data: reportsData } = await supabase
            .from("comment_reports")
            .select("comment_id")
            .eq("reporter_id", user.id)
            .in("comment_id", reviewsData.map((r) => r.id));
          setReportedReviewIds(new Set((reportsData || []).map((r) => r.comment_id)));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, paramId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.from("profiles").upsert({ id: user.id, ...editForm });
      if (error) {
        setSaveError("Erreur lors de la sauvegarde. Veuillez réessayer.");
        return;
      }
      // Shadow update: reflect new values instantly without a full refetch
      setProfile((prev) => ({ ...prev, ...editForm }));
      setIsEditing(false);
      setShowSaveAlert(true);
      setTimeout(() => setShowSaveAlert(false), 3000);
    } catch {
      setSaveError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const openReportDialog = (review) => {
    setReportingReview(review);
    setReportReason("");
    setReportError(null);
  };

  const closeReportDialog = () => {
    if (submittingReport) return;
    setReportingReview(null);
    setReportReason("");
    setReportError(null);
  };

  const handleSubmitReport = async () => {
    if (!reportingReview || !user) return;
    setSubmittingReport(true);
    setReportError(null);
    try {
      const { error } = await supabase.from("comment_reports").insert({
        comment_id: reportingReview.id,
        reporter_id: user.id,
        reason: reportReason.trim() || null,
        status: "pending",
      });
      if (error) {
        setReportError("Une erreur est survenue. Veuillez réessayer.");
        return;
      }
      setReportedReviewIds((prev) => {
        const next = new Set(prev);
        next.add(reportingReview.id);
        return next;
      });
      setReportingReview(null);
      setReportReason("");
    } catch {
      setReportError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    try {
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
      const deleted = listings.find((l) => l.id === listingId);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setStats((prev) => ({
        ...prev,
        listings: Math.max(0, prev.listings - 1),
        sales: deleted?.is_for_sale ? Math.max(0, prev.sales - 1) : prev.sales,
      }));
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      alert("Une erreur est survenue lors de la suppression de l'annonce.");
    }
  };

  const navInitials = (user?.user_metadata?.full_name || user?.email?.[0] || "?")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const profileInitials = isOwnProfile
    ? (editForm.full_name || user?.email?.[0] || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (profile?.full_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F3EEE0", display: "grid", gridTemplateColumns: "auto 1fr", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar active="Profil" />
      <main style={{ padding: "26px 42px 56px", maxWidth: 1440, width: "100%" }}>
        {/* Profile card skeleton */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, padding: "30px 32px 28px", marginBottom: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 26 }}>
            <div className="skeleton-pulse" style={{ width: 104, height: 104, borderRadius: "50%" }} />
            <div className="skeleton-pulse" style={{ width: 180, height: 22, borderRadius: 8 }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 4 }}>
              <div className="skeleton-pulse" style={{ width: 140, height: 15, borderRadius: 6 }} />
              <div className="skeleton-pulse" style={{ width: 120, height: 15, borderRadius: 6 }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ background: "#E4F6E6", border: "1px solid #D5E9D8", borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div className="skeleton-pulse" style={{ width: 56, height: 48, borderRadius: 8 }} />
                <div className="skeleton-pulse" style={{ width: "65%", height: 13, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>
        {/* Tabs skeleton */}
        <div style={{ display: "flex", gap: 18, borderBottom: "1px solid #E5DFCE", marginBottom: 22, paddingBottom: 14 }}>
          {[100, 120, 90].map((w, i) => (
            <div key={i} className="skeleton-pulse" style={{ width: w, height: 14, borderRadius: 6 }} />
          ))}
        </div>
        {/* Listing cards skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
          {[0, 1, 2].map((i) => (
            <article key={i} style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="skeleton-pulse" style={{ width: "100%", aspectRatio: "4/3" }} />
              <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="skeleton-pulse" style={{ height: 18, width: "72%", borderRadius: 6 }} />
                <div className="skeleton-pulse" style={{ height: 14, width: "48%", borderRadius: 6 }} />
                <div className="skeleton-pulse" style={{ height: 14, width: "38%", borderRadius: 6 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                  <div className="skeleton-pulse" style={{ height: 38, borderRadius: 12 }} />
                  <div className="skeleton-pulse" style={{ height: 38, borderRadius: 12 }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );

  const TABS = [
    { id: "annonces",  label: isOwnProfile ? "Mes annonces"  : "Annonces" },
    ...(isOwnProfile ? [{ id: "exchanges", label: "Mes échanges" }] : []),
    { id: "reviews",   label: "Avis reçus" },
    ...(isOwnProfile ? [{ id: "likes",     label: "Maisons aimées" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F3EEE0", display: "grid", gridTemplateColumns: "auto 1fr", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar active="Profil" />

      <main style={{ padding: "26px 42px 56px", maxWidth: 1440, width: "100%" }}>
        {showSaveAlert && (
          <Alert style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "18px 22px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 14 }}>
            <CheckCircle2 style={{ color: "#16A34A", width: 22, height: 22, flexShrink: 0, marginTop: 2 }} />
            <div>
              <AlertTitle style={{ fontSize: 16, fontWeight: 700, color: "#14532D", marginBottom: 4 }}>
                Profil mis à jour !
              </AlertTitle>
              <AlertDescription style={{ fontSize: 14, color: "#166534", lineHeight: 1.5 }}>
                Vos modifications ont été enregistrées et s'afficheront publiquement après validation de l'administrateur.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Topbar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, paddingBottom: 22 }}>
          <button
            onClick={handleLogout}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#005B5B", padding: "8px 12px", borderRadius: 999, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            Déconnexion
          </button>
          <NotificationBell userId={user?.id} />
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>
            {navInitials}
          </div>
        </header>

        {/* Profile card */}
        <section style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, padding: "30px 32px 28px", position: "relative", marginBottom: 22 }}>
          {isOwnProfile && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{ position: "absolute", top: 22, right: 22, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 999, background: "#FFFFFF", border: "1px solid #005B5B", color: "#005B5B", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              <Edit2 style={{ width: 14, height: 14 }} />
              Modifier
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", marginBottom: 26 }}>
            <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 34, letterSpacing: "-0.02em", border: "3px solid #ADEBB3", flexShrink: 0 }}>
              {profileInitials}
            </div>

            {isOwnProfile && isEditing ? (
              <div style={{ width: "100%", maxWidth: 400 }}>
                <div style={{ marginBottom: 12 }}>
                  <input
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #E5DFCE", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", color: "#0F2A2A" }}
                    placeholder="Nom complet"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #E5DFCE", fontSize: 14, background: "#fff", color: editForm.wilaya ? "#0F2A2A" : "#B0B5B3", cursor: "pointer", outline: "none", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
                        {editForm.wilaya || "Sélectionner wilaya"}
                        <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent style={{ backgroundColor: "#fff", border: "1px solid #E5DFCE", borderRadius: 12, padding: 6, minWidth: 240, maxHeight: 260, overflowY: "auto", scrollbarWidth: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 9999 }}>
                      <DropdownMenuRadioGroup value={editForm.wilaya} onValueChange={(w) => setEditForm({ ...editForm, wilaya: w })}>
                        <DropdownMenuRadioItem value="" style={{ padding: "9px 36px 9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#B0B5B3", fontFamily: "inherit" }}>
                          Sélectionner wilaya
                        </DropdownMenuRadioItem>
                        {WILAYAS.map((w) => (
                          <DropdownMenuRadioItem key={w} value={w} style={{ padding: "9px 36px 9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#0F2A2A", backgroundColor: editForm.wilaya === w ? "#F3EEE0" : "transparent", fontFamily: "inherit" }}>
                            {w}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #E5DFCE", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", color: "#0F2A2A" }}
                    placeholder="Quartier"
                    value={editForm.quartier}
                    onChange={(e) => setEditForm({ ...editForm, quartier: e.target.value })}
                  />
                </div>
                {saveError && (
                  <div style={{ background: "#F7DCD8", border: "1px solid #C0392B", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#C0392B", marginBottom: 12 }}>
                    {saveError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 999, background: "#005B5B", color: "#ADEBB3", border: "none", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <Save style={{ width: 14, height: 14 }} />
                    {saving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setSaveError(null); }}
                    disabled={saving}
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 999, background: "#FFFFFF", color: "#6E7B79", border: "1px solid #E5DFCE", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#0F2A2A" }}>
                  {(isOwnProfile ? editForm.full_name : profile?.full_name) || "Utilisateur"}
                </h1>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#005B5B", fontSize: 14, fontWeight: 500 }}>
                    <MapPin style={{ width: 14, height: 14, opacity: 0.9 }} />
                    {profile?.quartier ? `${profile.quartier}, ` : ""}{profile?.wilaya || "Algérie"}
                  </div>
                  {isOwnProfile && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#005B5B", fontSize: 14, fontWeight: 500 }}>
                      <Mail style={{ width: 14, height: 14, opacity: 0.9 }} />
                      {user?.email}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Profile stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { label: "Annonces actives",  value: stats.listings },
              { label: "Échanges réalisés", value: stats.exchanges },
              { label: "Ventes réalisées",  value: stats.sales },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#E4F6E6", border: "1px solid #D5E9D8", borderRadius: 16, padding: 22, textAlign: "center" }}>
                <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1, color: "#005B5B", letterSpacing: "-0.03em" }}>{value}</div>
                <div style={{ marginTop: 10, fontSize: 13, color: "#6E7B79", fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #E5DFCE", marginBottom: 22, padding: "0 4px" }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: "14px 18px", fontSize: 14.5, fontWeight: activeTab === id ? 600 : 500,
                color: activeTab === id ? "#005B5B" : "#6E7B79",
                borderBottom: activeTab === id ? "2px solid #005B5B" : "2px solid transparent",
                marginBottom: -1, background: "none", border: "none",
                borderBottomStyle: "solid", borderBottomWidth: 2,
                borderBottomColor: activeTab === id ? "#005B5B" : "transparent",
                cursor: "pointer", transition: "color 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Mes annonces */}
        {activeTab === "annonces" && (
          <div>
            {listings.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#6E7B79" }}>
                <p style={{ marginBottom: 16 }}>Aucune annonce publiée</p>
                <Link to="/add-listing" style={{ display: "inline-block", padding: "12px 24px", background: "#005B5B", color: "#ADEBB3", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  Publier une annonce
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
                {listings.map((listing) => (
                  <article key={listing.id} style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {/* Image */}
                    <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#E5DFCE", overflow: "hidden" }}>
                      {listing.images?.[0] ? (
                        <img src={listing.images[0]} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "#6E7B79" }}>property photo</span>
                        </div>
                      )}
                      <span style={{
                        position: "absolute", top: 12, right: 12,
                        background: listing.status === "rejected" ? "#FEE2E2" : listing.is_verified ? "#ADEBB3" : "#FBEACB",
                        color: listing.status === "rejected" ? "#991B1B" : listing.is_verified ? "#005B5B" : "#C77A1E",
                        padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", gap: 5,
                        border: listing.status === "rejected" ? "1px solid #FCA5A5" : listing.is_verified ? "1px solid #8FD89A" : "1px solid #C77A1E",
                      }}>
                        {listing.status === "rejected" ? "✕ Refusé" : listing.is_verified ? "✓ Vérifié" : "En attente"}
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A" }}>{listing.title}</h3>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#005B5B", fontWeight: 500 }}>
                        <MapPin style={{ width: 13, height: 13 }} /> {listing.wilaya}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6E7B79" }}>
                        <Bed style={{ width: 13, height: 13 }} /> {listing.rooms} chambres
                      </span>

                      {listing.status === "rejected" && (
                        <div style={{
                          marginTop: 4, padding: "10px 12px", borderRadius: 10,
                          background: "#FEF2F2", border: "1px solid #FECACA",
                          display: "flex", alignItems: "flex-start", gap: 8,
                        }}>
                          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                          <div>
                            <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Motif du refus
                            </p>
                            <span style={{ fontSize: 12.5, color: "#B91C1C", lineHeight: 1.55 }}>
                              {listing.rejection_reason?.trim()
                                ? listing.rejection_reason
                                : "Aucun motif spécifique fourni. Veuillez contacter le support."}
                            </span>
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <span style={{ background: "#E4F6E6", border: "1px solid #D5E9D8", color: "#005B5B", padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                          {listing.is_for_exchange && listing.is_for_sale ? "Échange & Vente" : listing.is_for_sale ? "Vente" : "Échange"}
                        </span>
                        <Link
                          to={`/listing/${listing.id}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#005B5B", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}
                        >
                          <Eye style={{ width: 14, height: 14 }} /> Voir
                        </Link>
                      </div>

                      {isOwnProfile && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                          <button
                            onClick={() => navigate(`/modifier-annonce/${listing.id}`)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#005B5B", cursor: "pointer" }}
                          >
                            <Edit2 style={{ width: 13, height: 13 }} /> Modifier
                          </button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, background: "#F7DCD8", color: "#C0392B", border: "none", cursor: "pointer" }}>
                                Supprimer
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 16, padding: 24, background: "#fff", border: "1px solid #E5DFCE", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxWidth: 400, margin: "auto" }}>
                              <AlertDialogHeader style={{ marginBottom: 24 }}>
                                <AlertDialogTitle style={{ fontSize: 18, fontWeight: 600, color: "#0F2A2A", marginBottom: 8 }}>
                                  Êtes-vous absolument sûr ?
                                </AlertDialogTitle>
                                <AlertDialogDescription style={{ fontSize: 14, color: "#6E7B79", lineHeight: 1.5 }}>
                                  Cette action ne peut pas être annulée. Cela supprimera définitivement votre annonce.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                                <AlertDialogCancel asChild>
                                  <button style={{ padding: "10px 16px", borderRadius: 12, background: "#fff", color: "#0F2A2A", border: "1px solid #E5DFCE", fontSize: 14, fontWeight: 500, cursor: "pointer", margin: 0 }}>Annuler</button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                  <button onClick={() => handleDeleteListing(listing.id)} style={{ padding: "10px 16px", borderRadius: 12, background: "#005B5B", color: "#ADEBB3", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", margin: 0 }}>Supprimer</button>
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Mes échanges */}
        {activeTab === "exchanges" && (
          <div>
            {exchanges.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#6E7B79" }}>Aucun échange pour le moment.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {exchanges.map((ex) => (
                  <div key={ex.id} style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "#0F2A2A" }}>{ex.listings?.title || "Annonce supprimée"}</div>
                      <div style={{ fontSize: 13, color: "#6E7B79" }}>{ex.listings?.wilaya}</div>
                    </div>
                    <span style={{
                      padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                      background: ex.status === "accepted" ? "#D6EEDD" : ex.status === "rejected" ? "#F7DCD8" : "#FBEACB",
                      color: ex.status === "accepted" ? "#1F7A4F" : ex.status === "rejected" ? "#C0392B" : "#C77A1E",
                    }}>
                      {ex.status === "accepted" ? "Accepté" : ex.status === "rejected" ? "Refusé" : "En attente"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Avis reçus */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#6E7B79" }}>Aucun avis reçu pour le moment.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {reviews.map((rv) => {
                  const alreadyReported = reportedReviewIds.has(rv.id);
                  return (
                    <div key={rv.id} style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 16, padding: 20, position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#0F2A2A" }}>{rv.profiles?.full_name || "Utilisateur"}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 13, color: "#6E7B79" }}>{rv.listings?.title}</span>
                          {isOwnProfile && (
                            alreadyReported ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#9CA3AF", padding: "5px 10px", borderRadius: 999, background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
                                <Flag style={{ width: 12, height: 12 }} /> Signalé
                              </span>
                            ) : (
                              <button
                                onClick={() => openReportDialog(rv)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#B91C1C", padding: "5px 10px", borderRadius: 999, background: "#FFFFFF", border: "1px solid #FECACA", cursor: "pointer" }}
                              >
                                <Flag style={{ width: 12, height: 12 }} /> Signaler
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      {rv.rating && <div style={{ fontSize: 14, color: "#C77A1E", marginBottom: 6 }}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</div>}
                      {rv.comment && <p style={{ fontSize: 14, color: "#0F2A2A", margin: 0 }}>{rv.comment}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Report review dialog */}
        <Dialog open={!!reportingReview} onOpenChange={(open) => { if (!open) closeReportDialog(); }}>
          <DialogContent
            style={{ borderRadius: 16, padding: 24, background: "#fff", border: "1px solid #E5DFCE", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxWidth: 460 }}
          >
            <DialogHeader>
              <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#0F2A2A", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <Flag style={{ width: 18, height: 18, color: "#B91C1C" }} />
                Signaler cet avis
              </DialogTitle>
              <DialogDescription style={{ fontSize: 14, color: "#6E7B79", lineHeight: 1.55 }}>
                Si vous pensez que cet avis est offensant, mensonger ou sans preuve, vous pouvez le signaler à l'administrateur pour examen.
              </DialogDescription>
            </DialogHeader>

            <div style={{ marginTop: 8 }}>
              <label htmlFor="report-reason" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F2A2A", marginBottom: 6 }}>
                Raison du signalement (optionnel)
              </label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Expliquez brièvement pourquoi vous signalez cet avis…"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #E5DFCE", fontSize: 13.5, fontFamily: "inherit", color: "#0F2A2A", outline: "none", resize: "vertical", boxSizing: "border-box", background: "#FFFFFF" }}
              />
            </div>

            {reportError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#B91C1C", marginTop: 12 }}>
                {reportError}
              </div>
            )}

            <DialogFooter style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
              <button
                onClick={closeReportDialog}
                disabled={submittingReport}
                style={{ padding: "10px 16px", borderRadius: 12, background: "#fff", color: "#0F2A2A", border: "1px solid #E5DFCE", fontSize: 14, fontWeight: 500, cursor: submittingReport ? "not-allowed" : "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submittingReport}
                style={{ padding: "10px 16px", borderRadius: 12, background: "#B91C1C", color: "#FFFFFF", border: "none", fontSize: 14, fontWeight: 600, cursor: submittingReport ? "not-allowed" : "pointer", opacity: submittingReport ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Flag style={{ width: 14, height: 14 }} />
                {submittingReport ? "Envoi…" : "Confirmer le signalement"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tab: Maisons aimées */}
        {activeTab === "likes" && (
          <div>
            {savedListings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 48px", color: "#6E7B79" }}>
                <Heart style={{ width: 40, height: 40, color: "#E5DFCE", margin: "0 auto 16px", display: "block" }} />
                <p style={{ fontSize: 15, marginBottom: 8, fontWeight: 500, color: "#0F2A2A" }}>Aucune maison sauvegardée</p>
                <p style={{ fontSize: 13, marginBottom: 20 }}>Parcourez les annonces et cliquez sur le cœur pour sauvegarder vos coups de cœur.</p>
                <Link to="/browse" style={{ display: "inline-block", padding: "12px 24px", background: "#ADEBB3", color: "#005B5B", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  Parcourir les annonces
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
                {savedListings.map((saved) => {
                  const l = saved.listings;
                  if (!l) return null;
                  return (
                    <article key={saved.id} style={{ background: "#FFFFFF", borderRadius: 18, border: "1px solid #E5DFCE", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#E5DFCE", overflow: "hidden" }}>
                        {l.images?.[0] ? (
                          <img src={l.images[0]} alt={l.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Heart style={{ width: 32, height: 32, color: "#6E7B79" }} />
                          </div>
                        )}
                        <div style={{ position: "absolute", top: 12, right: 12, background: "#ADEBB3", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Heart style={{ width: 16, height: 16, color: "#005B5B", fill: "#005B5B" }} />
                        </div>
                      </div>
                      <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: "#0F2A2A" }}>{l.title}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#005B5B" }}>
                          <MapPin style={{ width: 13, height: 13 }} /> {l.wilaya}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6E7B79" }}>
                          <Bed style={{ width: 13, height: 13 }} /> {l.rooms} chambre{l.rooms > 1 ? "s" : ""}
                        </div>
                        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#E4F6E6", color: "#005B5B", border: "1px solid #D5E9D8" }}>
                            {l.is_for_exchange && l.is_for_sale ? "Échange & Vente" : l.is_for_sale ? "Vente" : "Échange"}
                          </span>
                          <Link to={`/listing/${l.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#005B5B", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
                            <Eye style={{ width: 14, height: 14 }} /> Voir
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
