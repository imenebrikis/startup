import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MapPin, Edit2, Save, X, Bed, Eye, EyeOff, Heart, ChevronDown, LogOut, CheckCircle2,
  MoreVertical, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { supabase } from "../lib/supabase";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Sidebar from "../components/Sidebar";


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
  const { t } = useTranslation();
  const { id: paramId } = useParams();
  const [user, setUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [profile, setProfile] = useState(null);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "annonces");
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", wilaya: "", quartier: "" });
  const [listings, setListings] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUser(user);

      const targetId = paramId || user.id;
      const own = !paramId || paramId === user.id;
      setIsOwnProfile(own);

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", targetId).single();
      setProfile(profileData || {});
      setEditForm({
        full_name: profileData?.full_name || "",
        wilaya: profileData?.wilaya || "",
        quartier: profileData?.quartier || "",
      });

      const { data: listingsData } = await supabase.from("listings").select("*").eq("user_id", targetId).order("created_at", { ascending: false });
      setListings(listingsData || []);

      if (own) {
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
        setSaveError(t("profile.saveError"));
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

  const handleDeleteListing = async (listingId) => {
    try {
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      alert(t("profile.deleteError"));
    }
  };

  const handleToggleActive = async (listing) => {
    const next = !listing.is_active;
    // Optimistic update, rolled back on failure.
    setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, is_active: next } : l)));
    const { error } = await supabase.from("listings").update({ is_active: next }).eq("id", listing.id);
    if (error) {
      console.error("Erreur lors du changement de visibilité:", error);
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, is_active: listing.is_active } : l)));
    }
  };

  // Derives the lifecycle badge for an owner's listing card.
  const getListingStatus = (listing) => {
    const today = new Date().toISOString().slice(0, 10);
    const expired = listing.available_to && listing.available_to < today;
    if (listing.status === "pending") return { key: "pending", bg: "#FBEACB", color: "#C77A1E", border: "#E7C892" };
    if (listing.status === "rejected") return { key: "rejected", bg: "#F7DCD8", color: "#C0392B", border: "#E7B3AC" };
    if (!listing.is_active) return { key: "hidden", bg: "#EFEFEA", color: "#6E7B79", border: "#DDDDD3" };
    if (expired) return { key: "expired", bg: "#F7DCD8", color: "#C0392B", border: "#E7B3AC" };
    return { key: "published", bg: "#ADEBB3", color: "#005B5B", border: "#8FD89A" };
  };

  const navInitials = (profile?.full_name || user?.email?.[0] || "?")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const profileInitials = isOwnProfile
    ? (editForm.full_name || user?.email?.[0] || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (profile?.full_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F3EEE0", display: "grid", gridTemplateColumns: "auto 1fr", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar active="Profil" />
      <main style={{ padding: "26px 42px 56px", maxWidth: 1440, width: "100%" }}>
        {/* Profile card skeleton — mirrors avatar → full name → location */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 22, padding: "30px 32px 28px", marginBottom: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 26 }}>
            <div className="animate-pulse" style={{ width: 104, height: 104, borderRadius: "50%", background: "#E5E7EB" }} />
            <div className="animate-pulse" style={{ width: 200, height: 30, borderRadius: 8, background: "#E5E7EB", marginTop: 6 }} />
            <div className="animate-pulse" style={{ width: 160, height: 16, borderRadius: 6, background: "#E5E7EB", marginTop: 4 }} />
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
    { id: "annonces",  label: isOwnProfile ? t("profile.tabs.listings") : t("profile.tabs.listingsOther") },
    { id: "reviews",   label: t("profile.tabs.reviews") },
    ...(isOwnProfile ? [{ id: "likes",     label: t("profile.tabs.favorites") }] : []),
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
                {t("profile.saved.title")}
              </AlertTitle>
              <AlertDescription style={{ fontSize: 14, color: "#166534", lineHeight: 1.5 }}>
                {t("profile.saved.desc")}
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
            {t("profile.actions.logout")}
          </button>
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
              {t("profile.actions.edit")}
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
                    placeholder={t("profile.form.fullName")}
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #E5DFCE", fontSize: 14, background: "#fff", color: editForm.wilaya ? "#0F2A2A" : "#B0B5B3", cursor: "pointer", outline: "none", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
                        {editForm.wilaya || t("profile.form.selectWilaya")}
                        <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent style={{ backgroundColor: "#fff", border: "1px solid #E5DFCE", borderRadius: 12, padding: 6, minWidth: 240, maxHeight: 260, overflowY: "auto", scrollbarWidth: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 9999 }}>
                      <DropdownMenuRadioGroup value={editForm.wilaya} onValueChange={(w) => setEditForm({ ...editForm, wilaya: w })}>
                        <DropdownMenuRadioItem value="" style={{ padding: "9px 36px 9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#B0B5B3", fontFamily: "inherit" }}>
                          {t("profile.form.selectWilaya")}
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
                    placeholder={t("profile.form.quartier")}
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
                    {saving ? t("profile.actions.saving") : t("profile.actions.save")}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setSaveError(null); }}
                    disabled={saving}
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 999, background: "#FFFFFF", color: "#6E7B79", border: "1px solid #E5DFCE", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                    {t("profile.actions.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#0F2A2A" }}>
                  {(isOwnProfile ? editForm.full_name : profile?.full_name) || t("profile.userFallback")}
                </h1>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#005B5B", fontSize: 14, fontWeight: 500 }}>
                    <MapPin style={{ width: 14, height: 14, opacity: 0.9 }} />
                    {profile?.quartier ? `${profile.quartier}, ` : ""}{profile?.wilaya || t("profile.countryFallback")}
                  </div>
                </div>
              </>
            )}
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
                <p style={{ marginBottom: 16 }}>{t("profile.empty.listings")}</p>
                <Link to="/add-listing" style={{ display: "inline-block", padding: "12px 24px", background: "#005B5B", color: "#ADEBB3", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  {t("profile.publishListing")}
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
                          <span style={{ fontSize: 11, color: "#6E7B79" }}>{t("profile.photoPlaceholder")}</span>
                        </div>
                      )}
                      {(() => {
                        const st = getListingStatus(listing);
                        return (
                          <span style={{
                            position: "absolute", top: 12, right: 12,
                            background: st.bg, color: st.color,
                            padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                            display: "inline-flex", alignItems: "center", gap: 5,
                            border: `1px solid ${st.border}`,
                          }}>
                            {t(`profile.status.${st.key}`)}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Body */}
                    <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A" }}>{listing.title}</h3>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#005B5B", fontWeight: 500 }}>
                        <MapPin style={{ width: 13, height: 13 }} /> {listing.wilaya}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6E7B79" }}>
                        <Bed style={{ width: 13, height: 13 }} /> {t("profile.rooms", { count: listing.rooms })}
                      </span>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <span style={{ background: "#E4F6E6", border: "1px solid #D5E9D8", color: "#005B5B", padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                          {listing.is_for_exchange && listing.is_for_sale ? t("profile.badge.exchangeSale") : listing.is_for_sale ? t("profile.badge.sale") : t("profile.badge.exchange")}
                        </span>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <Link
                            to={`/listing/${listing.id}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#005B5B", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}
                          >
                            <Eye style={{ width: 14, height: 14 }} />
                          </Link>

                          {isOwnProfile && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  aria-label={t("profile.actions.menu")}
                                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, background: "transparent", border: "1px solid #E5DFCE", color: "#005B5B", cursor: "pointer" }}
                                >
                                  <MoreVertical style={{ width: 16, height: 16 }} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={8} style={{
                                backgroundColor: '#ffffff', border: '1px solid #e5e7eb',
                                borderRadius: '12px', padding: '6px', minWidth: '180px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                zIndex: 9999,
                              }}>
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(listing)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#1f2937', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                                >
                                  {listing.is_active
                                    ? <><EyeOff style={{ width: '15px', height: '15px' }} /> {t("profile.actions.hide")}</>
                                    : <><Eye style={{ width: '15px', height: '15px' }} /> {t("profile.actions.show")}</>}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/modifier-annonce/${listing.id}`)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#1f2937', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                                >
                                  <Edit2 style={{ width: '15px', height: '15px' }} /> {t("profile.actions.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(listing)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13.5px', color: '#ef4444', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                                >
                                  <Trash2 style={{ width: '15px', height: '15px' }} /> {t("profile.actions.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Single delete-confirmation dialog, driven by the kebab menu (kept outside the
                menu so the dropdown can close without unmounting the dialog). */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
              <AlertDialogContent style={{ borderRadius: 16, padding: 24, background: "#fff", border: "1px solid #E5DFCE", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxWidth: 400, margin: "auto" }}>
                <AlertDialogHeader style={{ marginBottom: 24 }}>
                  <AlertDialogTitle style={{ fontSize: 18, fontWeight: 600, color: "#0F2A2A", marginBottom: 8 }}>
                    {t("profile.deleteConfirm.title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription style={{ fontSize: 14, color: "#6E7B79", lineHeight: 1.5 }}>
                    {t("profile.deleteConfirm.desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <AlertDialogCancel asChild>
                    <button style={{ padding: "10px 16px", borderRadius: 12, background: "#fff", color: "#0F2A2A", border: "1px solid #E5DFCE", fontSize: 14, fontWeight: 500, cursor: "pointer", margin: 0 }}>{t("profile.actions.cancel")}</button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <button onClick={() => { if (deleteTarget) handleDeleteListing(deleteTarget.id); setDeleteTarget(null); }} style={{ padding: "10px 16px", borderRadius: 12, background: "#005B5B", color: "#ADEBB3", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", margin: 0 }}>{t("profile.actions.delete")}</button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Tab: Avis reçus */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#6E7B79" }}>{t("profile.empty.reviews")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {reviews.map((rv) => (
                  <div key={rv.id} style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 16, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#0F2A2A" }}>{rv.profiles?.full_name || t("profile.userFallback")}</span>
                      <span style={{ fontSize: 13, color: "#6E7B79" }}>{rv.listings?.title}</span>
                    </div>
                    {rv.rating && <div style={{ fontSize: 14, color: "#C77A1E", marginBottom: 6 }}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</div>}
                    {rv.comment && <p style={{ fontSize: 14, color: "#0F2A2A", margin: 0 }}>{rv.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Maisons aimées */}
        {activeTab === "likes" && (
          <div>
            {savedListings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 48px", color: "#6E7B79" }}>
                <Heart style={{ width: 40, height: 40, color: "#E5DFCE", margin: "0 auto 16px", display: "block" }} />
                <p style={{ fontSize: 15, marginBottom: 8, fontWeight: 500, color: "#0F2A2A" }}>{t("profile.empty.favoritesTitle")}</p>
                <p style={{ fontSize: 13, marginBottom: 20 }}>{t("profile.empty.favoritesSubtitle")}</p>
                <Link to="/browse" style={{ display: "inline-block", padding: "12px 24px", background: "#ADEBB3", color: "#005B5B", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  {t("profile.browseListings")}
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
                          <Bed style={{ width: 13, height: 13 }} /> {t("profile.rooms", { count: l.rooms })}
                        </div>
                        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#E4F6E6", color: "#005B5B", border: "1px solid #D5E9D8" }}>
                            {l.is_for_exchange && l.is_for_sale ? t("profile.badge.exchangeSale") : l.is_for_sale ? t("profile.badge.sale") : t("profile.badge.exchange")}
                          </span>
                          <Link to={`/listing/${l.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#005B5B", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
                            <Eye style={{ width: 14, height: 14 }} />
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
