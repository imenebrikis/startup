import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Search,
  List,
  Repeat,
  MessageSquare,
  User,
  Settings,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Save,
  X,
  Bed,
  Eye,
  Heart,
  ChevronDown,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { supabase } from "../lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [editForm, setEditForm] = useState({ full_name: "", wilaya: "", quartier: "", phone: "" });
  const [listings, setListings] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);
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
        phone: profileData?.phone || "",
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
          .eq("requester_id", targetId)
          .order("created_at", { ascending: false });
        setExchanges(exchangesData || []);

        const { data: savedData } = await supabase
          .from("user_favorites")
          .select("*, listings(id, title, wilaya, rooms, images, is_for_exchange, is_for_sale)")
          .eq("user_id", targetId)
          .order("created_at", { ascending: false });
        setSavedListings(savedData || []);
      }

      const userListingIds = listingsData?.map((l) => l.id) || [];
      if (userListingIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*, profiles!reviewer_id(full_name), listings(title)")
          .in("listing_id", userListingIds)
          .order("created_at", { ascending: false });
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
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...editForm });
    setSaving(false);
    if (error) { setSaveError("Erreur lors de la sauvegarde. Veuillez réessayer."); return; }
    setIsEditing(false);
    fetchData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

  const navLinks = [
    { to: "/browse",       icon: <Search className="w-5 h-5" />,        label: "Parcourir" },
    { to: "/profile",      icon: <List className="w-5 h-5" />,          label: "Mes annonces" },
    { to: "/my-exchanges", icon: <Repeat className="w-5 h-5" />,        label: "Mes échanges" },
    { to: "/messages",     icon: <MessageSquare className="w-5 h-5" />, label: "Messages" },
    { to: "/profile",      icon: <User className="w-5 h-5" />,          label: "Profil" },
  ];

  if (loading) return <div style={{ padding: "48px", textAlign: "center" }}>Chargement...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7EC", fontFamily: "'Inter', sans-serif", display: "flex" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 240, minHeight: "100vh", background: "#F7F7EC", flexShrink: 0, padding: "28px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <Link
          to="/dashboard"
          style={{ fontSize: 20, fontWeight: 700, color: "#0A3D3D", textDecoration: "none", fontFamily: "'Bricolage Grotesque', sans-serif", padding: "4px 12px", marginBottom: 16, display: "block" }}
        >
          DarBelDar
        </Link>

        {navLinks.map(({ to, icon, label }) => {
          const active = label === "Profil";
          return (
            <Link
              key={label}
              to={to}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "11px 16px",
                borderRadius: 12,
                color: active ? "#fff" : "#4B5563",
                background: active ? "#0A3D3D" : "transparent",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>{icon} {label}</span>
              {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ADEBB3", flexShrink: 0 }} />}
            </Link>
          );
        })}

        <div style={{ borderTop: "1px solid #D1D5DB", margin: "8px 0" }} />
        <Link
          to="/admin"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderRadius: 12, color: "#4B5563", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
        >
          <Settings className="w-5 h-5" /> Admin
        </Link>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "40px 48px 48px 32px" }}>

        {/* Top-right: logout + avatar */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4B5563", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            <LogOut style={{ width: 15, height: 15 }} /> Déconnexion
          </button>
          <div style={{ width: 34, height: 34, background: "#0A3D3D", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
            {navInitials}
          </div>
        </div>

        {/* ── Profile card ── */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 32, marginBottom: 28, position: "relative" }}>

          {isOwnProfile && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{ position: "absolute", top: 24, right: 24, padding: "8px 16px", borderRadius: 100, border: "1.5px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Edit2 style={{ width: 13, height: 13 }} /> Modifier
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <div style={{ width: 80, height: 80, background: "#0A3D3D", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 28, marginBottom: 16 }}>
              {profileInitials}
            </div>

            {isOwnProfile && isEditing ? (
              <div style={{ width: "100%", maxWidth: 400 }}>
                <div style={{ marginBottom: 12 }}>
                  <input
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
                    placeholder="Nom complet"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, background: "#fff", color: editForm.wilaya ? "#1a1a1a" : "#9ca3af", cursor: "pointer", outline: "none", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
                        {editForm.wilaya || "Sélectionner wilaya"}
                        <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 6, minWidth: 240, maxHeight: 260, overflowY: "auto", scrollbarWidth: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 9999 }}>
                      <DropdownMenuRadioGroup value={editForm.wilaya} onValueChange={(w) => setEditForm({ ...editForm, wilaya: w })}>
                        <DropdownMenuRadioItem value="" style={{ padding: "9px 36px 9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#9ca3af", fontFamily: "'Inter', sans-serif" }}>
                          Sélectionner wilaya
                        </DropdownMenuRadioItem>
                        {WILAYAS.map((w) => (
                          <DropdownMenuRadioItem key={w} value={w} style={{ padding: "9px 36px 9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#1f2937", backgroundColor: editForm.wilaya === w ? "#f3f4f6" : "transparent", fontFamily: "'Inter', sans-serif" }}>
                            {w}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
                    placeholder="Quartier"
                    value={editForm.quartier}
                    onChange={(e) => setEditForm({ ...editForm, quartier: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <input
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
                    placeholder="Téléphone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                {saveError && (
                  <div style={{ background: "#FEE2E2", border: "1px solid #EF4444", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 12 }}>
                    {saveError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ flex: 1, padding: 10, borderRadius: 100, background: "#0A3D3D", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <Save style={{ width: 14, height: 14 }} /> {saving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setSaveError(null); }}
                    disabled={saving}
                    style={{ flex: 1, padding: 10, borderRadius: 100, background: "#fff", color: "#717182", border: "1.5px solid #E5E7EB", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <X style={{ width: 14, height: 14 }} /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
                  {(isOwnProfile ? editForm.full_name : profile?.full_name) || "Utilisateur"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4B3FD8", fontSize: 14, marginBottom: 5 }}>
                  <MapPin style={{ width: 15, height: 15 }} />
                  {profile?.quartier ? `${profile.quartier} , ` : ""}{profile?.wilaya || "Algérie"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#374151", fontSize: 14, marginBottom: 5 }}>
                  <Phone style={{ width: 15, height: 15 }} />
                  {profile?.phone || "Non renseigné"}
                </div>
                {isOwnProfile && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#717182", fontSize: 13 }}>
                    <Mail style={{ width: 14, height: 14 }} />
                    {user?.email}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "Annonces actives",  value: stats.listings },
              { label: "Échanges réalisés", value: stats.exchanges },
              { label: "Ventes réalisées",  value: stats.sales },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#ECFDF5", borderRadius: 16, padding: 20, textAlign: "center" }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "#0A3D3D", marginBottom: 4 }}>
                  {value}
                </div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ marginBottom: 24, borderBottom: "1px solid #E5E7EB" }}>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { id: "annonces",  label: isOwnProfile ? "Mes annonces"  : "Annonces" },
              ...(isOwnProfile ? [{ id: "exchanges", label: "Mes échanges" }] : []),
              { id: "reviews",   label: "Avis reçus" },
              ...(isOwnProfile ? [{ id: "likes",     label: "Maisons aimées" }] : []),
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  padding: "12px 0",
                  background: "none",
                  border: "none",
                  fontSize: 15,
                  fontWeight: activeTab === id ? 600 : 400,
                  color: activeTab === id ? "#111827" : "#9CA3AF",
                  borderBottom: activeTab === id ? "2px solid #111827" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab: Mes annonces ── */}
        {activeTab === "annonces" && (
          <div>
            {listings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "#717182" }}>
                <p style={{ marginBottom: 16 }}>Aucune annonce publiée</p>
                <Link to="/add-listing" style={{ display: "inline-block", padding: "12px 24px", background: "#0A3D3D", color: "#fff", borderRadius: 100, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  Publier une annonce
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
                {listings.map((listing) => (
                  <div key={listing.id} style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {/* Image */}
                    <div style={{ height: 190, background: "#F0EFE4", position: "relative" }}>
                      {listing.images?.[0] ? (
                        <img src={listing.images[0]} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "#c4c4d4" }}>property photo</span>
                        </div>
                      )}
                      <div style={{ position: "absolute", top: 12, right: 12, background: listing.is_verified ? "#10B981" : "#F59E0B", color: "#fff", padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        {listing.is_verified ? "✓ Vérifié" : "En attente"}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 600, marginBottom: 6, color: "#111827" }}>
                        {listing.title}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#4B3FD8", marginBottom: 4 }}>
                        <MapPin style={{ width: 13, height: 13 }} /> {listing.wilaya}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#717182", marginBottom: 14 }}>
                        <Bed style={{ width: 13, height: 13 }} /> {listing.rooms} chambres
                      </div>

                      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ padding: "5px 12px", borderRadius: 100, background: listing.is_for_exchange ? "#ECFDF5" : "#EEF2FF", color: listing.is_for_exchange ? "#0A3D3D" : "#4B3FD8", fontSize: 12, fontWeight: 600 }}>
                          {listing.is_for_exchange && listing.is_for_sale ? "Échange & Vente" : listing.is_for_sale ? "Vente" : "Échange"}
                        </span>
                        <Link
                          to={`/listing/${listing.id}`}
                          style={{ display: "flex", alignItems: "center", gap: 5, color: "#4B3FD8", textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "5px 10px", borderRadius: 8 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#EEF2FF")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Eye style={{ width: 14, height: 14 }} /> Voir
                        </Link>
                      </div>

                      {isOwnProfile && (
                        <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid #F3F4F6" }}>
                          <button
                            onClick={() => navigate(`/modifier-annonce/${listing.id}`)}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", borderRadius: 8, background: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                          >
                            <Edit2 style={{ width: 13, height: 13 }} /> Modifier
                          </button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                Supprimer
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 16, padding: 24, background: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxWidth: 400, margin: "auto" }}>
                              <AlertDialogHeader style={{ marginBottom: 24 }}>
                                <AlertDialogTitle style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
                                  Êtes-vous absolument sûr ?
                                </AlertDialogTitle>
                                <AlertDialogDescription style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.5 }}>
                                  Cette action ne peut pas être annulée. Cela supprimera définitivement votre annonce et retirera les données de nos serveurs.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                                <AlertDialogCancel asChild>
                                  <button style={{ padding: "10px 16px", borderRadius: 8, background: "#fff", color: "#374151", border: "1px solid #D1D5DB", fontSize: 14, fontWeight: 500, cursor: "pointer", margin: 0 }}>
                                    Annuler
                                  </button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                  <button onClick={() => handleDeleteListing(listing.id)} style={{ padding: "10px 16px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", margin: 0 }}>
                                    Continuer
                                  </button>
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Mes échanges ── */}
        {activeTab === "exchanges" && (
          <div>
            {exchanges.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "#717182" }}>Aucun échange pour le moment.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {exchanges.map((ex) => (
                  <div key={ex.id} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{ex.listings?.title || "Annonce supprimée"}</div>
                      <div style={{ fontSize: 13, color: "#717182" }}>{ex.listings?.wilaya}</div>
                    </div>
                    <span style={{ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: ex.status === "accepted" ? "#D1FAE5" : ex.status === "rejected" ? "#FEE2E2" : "#FEF3C7", color: ex.status === "accepted" ? "#065F46" : ex.status === "rejected" ? "#991B1B" : "#92400E" }}>
                      {ex.status === "accepted" ? "Accepté" : ex.status === "rejected" ? "Refusé" : "En attente"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Avis reçus ── */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "#717182" }}>Aucun avis reçu pour le moment.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {reviews.map((rv) => (
                  <div key={rv.id} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{rv.profiles?.full_name || "Utilisateur"}</span>
                      <span style={{ fontSize: 13, color: "#717182" }}>{rv.listings?.title}</span>
                    </div>
                    {rv.rating && <div style={{ fontSize: 14, color: "#F59E0B", marginBottom: 6 }}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</div>}
                    {rv.comment && <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>{rv.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Maisons aimées ── */}
        {activeTab === "likes" && (
          <div>
            {savedListings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 48px", color: "#717182" }}>
                <Heart style={{ width: 40, height: 40, color: "#D1D5DB", margin: "0 auto 16px", display: "block" }} />
                <p style={{ fontSize: 15, marginBottom: 8, fontWeight: 500, color: "#374151" }}>Aucune maison sauvegardée</p>
                <p style={{ fontSize: 13, marginBottom: 20 }}>Parcourez les annonces et cliquez sur le cœur pour sauvegarder vos coups de cœur.</p>
                <Link to="/browse" style={{ display: "inline-block", padding: "12px 24px", background: "#ADEBB3", color: "#0A3D3D", borderRadius: 100, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  Parcourir les annonces
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
                {savedListings.map((saved) => {
                  const l = saved.listings;
                  if (!l) return null;
                  return (
                    <div key={saved.id} style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ height: 180, background: "#F0EFE4", position: "relative" }}>
                        {l.images?.[0] ? (
                          <img src={l.images[0]} alt={l.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Heart style={{ width: 32, height: 32, color: "#D1D5DB" }} />
                          </div>
                        )}
                        <div style={{ position: "absolute", top: 12, right: 12, background: "#ADEBB3", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Heart style={{ width: 16, height: 16, color: "#0A3D3D", fill: "#0A3D3D" }} />
                        </div>
                      </div>
                      <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 600, margin: 0 }}>{l.title}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#4B3FD8" }}>
                          <MapPin style={{ width: 13, height: 13 }} /> {l.wilaya}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#717182" }}>
                          <Bed style={{ width: 13, height: 13 }} /> {l.rooms} chambre{l.rooms > 1 ? "s" : ""}
                        </div>
                        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: l.is_for_exchange ? "#ECFDF5" : "#EEF2FF", color: l.is_for_exchange ? "#0A3D3D" : "#4B3FD8" }}>
                            {l.is_for_exchange && l.is_for_sale ? "Échange & Vente" : l.is_for_sale ? "Vente" : "Échange"}
                          </span>
                          <Link
                            to={`/listing/${l.id}`}
                            style={{ display: "flex", alignItems: "center", gap: 5, color: "#4B3FD8", textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "5px 10px", borderRadius: 8 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#EEF2FF")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Eye style={{ width: 14, height: 14 }} /> Voir
                          </Link>
                        </div>
                      </div>
                    </div>
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
