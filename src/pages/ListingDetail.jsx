import { useCallback, useEffect, useState, lazy, Suspense } from "react";

const NeighborhoodMap = lazy(() => import('../components/NeighborhoodMap'))
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  BedDouble,
  Calendar,
  Home,
  Wind,
  Thermometer,
  Wifi,
  Droplets,
  Flame,
  Zap,
  Car,
  Trees,
  Waves,
  UtensilsCrossed,
  WashingMachine,
  ArrowUpDown,
  Star,
  X,
  Maximize2,
  Layers,
  Globe2,
  BookOpen,
  Heart,
  MessageCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import SwapSheet from "../components/SwapSheet";

const AMENITY_ICONS = {
  Climatisation: Wind,
  Chauffage: Thermometer,
  Wifi: Wifi,
  "Citerne d'eau": Droplets,
  "Chauffe-eau": Flame,
  "Groupe électrogène": Zap,
  "Parking / Garage": Car,
  "Jardin / Terrasse": Trees,
  Piscine: Waves,
  "Cuisine équipée": UtensilsCrossed,
  "Machine à laver": WashingMachine,
  Ascenseur: ArrowUpDown,
};

const MONTHS_FR = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
const fmtDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtPrice = (p) =>
  p ? new Intl.NumberFormat("fr-DZ").format(p) + " DZD" : null;
const fmtRange = (from, to) => {
  const fmt = (s, withYear) => {
    if (!s) return null;
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}),
    });
  };
  if (from && to) return `Du ${fmt(from)} au ${fmt(to, true)}`;
  if (from) return `À partir du ${fmt(from, true)}`;
  if (to) return `Jusqu'au ${fmt(to, true)}`;
  return null;
};
const initFrom = (name) =>
  name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

const muted = { fontSize: "13px", color: "#717182", fontFamily: "'Inter', sans-serif" };
const label = { fontSize: "13px", fontWeight: "600", color: "#1a1a1a", fontFamily: "'Inter', sans-serif" };
const sectionLabel = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#717182",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  fontFamily: "'Inter', sans-serif",
  marginBottom: "14px",
};

function Stars({ rating, max = 5, onClick, hoveredStar, setHoveredStar, emptyColor = "#d1d5db" }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = onClick ? i < (hoveredStar ?? rating) : i < rating;
        return (
          <Star
            key={i}
            onClick={() => onClick?.(i + 1)}
            onMouseEnter={() => setHoveredStar?.(i + 1)}
            onMouseLeave={() => setHoveredStar?.(null)}
            style={{
              width: "16px", height: "16px",
              cursor: onClick ? "pointer" : "default",
              color: filled ? "#F59E0B" : emptyColor,
              fill: filled ? "#F59E0B" : "none",
              transition: "color 0.12s",
            }}
          />
        );
      })}
    </div>
  );
}

function Skeleton({ h = 16, w = "100%", radius = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [initials, setInitials] = useState("?");
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(null);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [exchangeSent, setExchangeSent] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const [contactLoading, setContactLoading] = useState(false);
  const [contactSaleLoading, setContactSaleLoading] = useState(false);
  const [saleSent, setSaleSent] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .maybeSingle()
      .then(({ data }) => setIsLiked(Boolean(data)));
  }, [id, user]);

  const handleToggleLike = async () => {
    if (!user || likeLoading) return;
    setLikeLoading(true);
    if (isLiked) {
      await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("listing_id", id);
      setIsLiked(false);
    } else {
      await supabase.from("user_favorites").insert({ user_id: user.id, listing_id: id });
      setIsLiked(true);
    }
    setLikeLoading(false);
  };

  const handleContact = async () => {
    if (!user || !listing || contactLoading) return;
    setContactLoading(true);

    // conversations table requires participant_one < participant_two (UUID order)
    const [p1, p2] = [user.id, listing.user_id].sort();

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_one", p1)
      .eq("participant_two", p2)
      .maybeSingle();

    let convId;
    if (existing) {
      convId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ participant_one: p1, participant_two: p2, listing_id: id })
        .select("id")
        .single();
      if (error) {
        console.error(error);
        setContactLoading(false);
        return;
      }
      convId = created.id;
    }

    navigate("/messages", { state: { conversationId: convId } });
    setContactLoading(false);
  };

  const handleContactSeller = async () => {
    if (!user || !listing || contactSaleLoading) return;
    setContactSaleLoading(true);

    const [p1, p2] = [user.id, listing.user_id].sort();

    // Get or create conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_one", p1)
      .eq("participant_two", p2)
      .maybeSingle();

    let convId;
    if (existing) {
      convId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ participant_one: p1, participant_two: p2, listing_id: id })
        .select("id")
        .single();
      if (error) { setContactSaleLoading(false); return; }
      convId = created.id;
    }

    // Log sale transaction if not already recorded
    const { data: existingTx } = await supabase
      .from("exchanges")
      .select("id")
      .eq("requester_id", user.id)
      .eq("listing_id", id)
      .is("offered_house_id", null)
      .maybeSingle();

    if (!existingTx) {
      await supabase.from("exchanges").insert({
        requester_id: user.id,
        receiver_id: listing.user_id,
        listing_id: id,
        offered_house_id: null,
        status: "pending",
      });
    }

    setSaleSent(true);
    setContactSaleLoading(false);
    navigate("/messages", { state: { conversationId: convId } });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/"); return; }
      setUser(user);
      const fn = user.user_metadata?.full_name;
      setInitials(
        fn
          ? fn.split(" ").map((n) => n[0]).join("").toUpperCase()
          : user.email?.[0]?.toUpperCase() || "?",
      );
    });

    supabase
      .from("listings")
      .select("*, profiles(full_name, wilaya, created_at, avatar_url)")
      .eq("id", id)
      .single()
      .then(({ data }) => { setListing(data); setLoading(false); });
  }, [id, navigate]);

  const fetchReviews = useCallback(() =>
    supabase
      .from("reviews")
      .select("*, profiles(full_name, avatar_url)")
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews(data || []))
  , [id]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const photos = listing?.images || [];
  const prevPhoto = () => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  const nextPhoto = () => setPhotoIdx((i) => (i + 1) % photos.length);


  const handleReview = async () => {
    if (!rating || !user) return;
    setSubmittingReview(true);
    await supabase.from("reviews").insert({
      listing_id: id, reviewer_id: user.id, rating, comment, created_at: new Date(),
    });
    setRating(0); setComment(""); setSubmittingReview(false);
    fetchReviews();
  };

  const isOwner = user && listing && user.id === listing.user_id;
  const showExchange = listing?.is_for_exchange && !isOwner;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav style={{
        borderBottom: "1px solid #e5e7eb", background: "#ffffff",
        position: "sticky", top: 0, zIndex: 10,
        padding: "0 32px", height: "64px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link to="/dashboard" style={{
          fontSize: "22px", fontWeight: "700", color: "#0A3D3D",
          textDecoration: "none", fontFamily: "'Bricolage Grotesque', sans-serif",
        }}>DarBelDar</Link>
        <div style={{
          width: "40px", height: "40px", background: "#4B3FD8", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: "600", fontSize: "14px",
        }}>{initials}</div>
      </nav>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* Back */}
        <Link to="/browse" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          color: "#4B3FD8", fontSize: "14px", fontWeight: "500",
          textDecoration: "none", marginBottom: "24px",
        }}>
          <ChevronLeft style={{ width: "16px", height: "16px" }} />
          Retour aux annonces
        </Link>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Skeleton h={420} radius={20} />
            <Skeleton h={32} w="50%" />
            <Skeleton h={120} />
          </div>
        ) : !listing ? (
          <p style={muted}>Annonce introuvable.</p>
        ) : (
          <>
            {/* ── Rejection banner (owner only) ── */}
            {isOwner && listing.status === "rejected" && (
              <div style={{
                marginBottom: "20px", padding: "16px 20px", borderRadius: "14px",
                background: "#FEF2F2", border: "1px solid #FECACA",
                display: "flex", alignItems: "flex-start", gap: "12px",
              }}>
                <span style={{ fontSize: "20px", flexShrink: 0, lineHeight: 1 }}>⚠️</span>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "700", color: "#991B1B", fontFamily: "'Inter', sans-serif" }}>
                    Votre annonce a été refusée
                  </p>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#B91C1C", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                    {listing.rejection_reason?.trim()
                      ? listing.rejection_reason
                      : "Aucun motif spécifique fourni. Veuillez contacter le support."}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: "12.5px", color: "#991B1B", opacity: 0.75, fontFamily: "'Inter', sans-serif" }}>
                    Corrigez les points mentionnés puis modifiez votre annonce pour la soumettre à nouveau.
                  </p>
                </div>
              </div>
            )}

            {/* ── Page title ── */}
            <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <h1 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: "32px", fontWeight: "700",
                  color: "#1a1a1a", marginBottom: "10px", lineHeight: 1.2,
                }}>{listing.title}</h1>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {listing.is_for_exchange && (
                    <span style={{ background: "#0A3D3D", color: "#fff", fontSize: "12px", fontWeight: "600", padding: "4px 14px", borderRadius: "999px" }}>
                      Échange
                    </span>
                  )}
                  {listing.is_for_sale && (
                    <span style={{ background: "#4B3FD8", color: "#fff", fontSize: "12px", fontWeight: "600", padding: "4px 14px", borderRadius: "999px" }}>
                      Vente
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bento grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", alignItems: "start" }}>

              {/* ════ LEFT COLUMN ════ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* Main image */}
                <div style={{
                  borderRadius: "20px", overflow: "hidden",
                  height: "370px", background: "#F7F7EC", position: "relative",
                }}>
                  {photos.length > 0 ? (
                    <>
                      <img
                        src={photos[photoIdx]}
                        alt="photo principale"
                        onClick={() => setIsFullscreen(true)}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }}
                      />
                      {photos.length > 1 && (
                        <>
                          <button onClick={prevPhoto} style={{
                            position: "absolute", top: "50%", left: "14px",
                            transform: "translateY(-50%)", width: "38px", height: "38px",
                            borderRadius: "50%", background: "rgba(255,255,255,0.92)",
                            border: "none", display: "flex", alignItems: "center",
                            justifyContent: "center", cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}>
                            <ChevronLeft style={{ width: "18px", height: "18px", color: "#1a1a1a" }} />
                          </button>
                          <button onClick={nextPhoto} style={{
                            position: "absolute", top: "50%", right: "14px",
                            transform: "translateY(-50%)", width: "38px", height: "38px",
                            borderRadius: "50%", background: "rgba(255,255,255,0.92)",
                            border: "none", display: "flex", alignItems: "center",
                            justifyContent: "center", cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}>
                            <ChevronRight style={{ width: "18px", height: "18px", color: "#1a1a1a" }} />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Home style={{ width: "48px", height: "48px", color: "#c4c4d4" }} />
                    </div>
                  )}
                </div>

                {/* Thumbnail strip */}
                {photos.length > 1 && (
                  <div style={{ display: "flex", gap: "10px", height: "88px" }}>
                    {photos.slice(0, 4).map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIdx(i)}
                        style={{
                          flex: 1, borderRadius: "12px", overflow: "hidden", padding: 0,
                          border: i === photoIdx ? "2.5px solid #0A3D3D" : "2.5px solid transparent",
                          cursor: "pointer", background: "none",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <img src={src} alt={`miniature ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    ))}
                    {photos.length > 4 && (
                      <button
                        onClick={() => setIsFullscreen(true)}
                        style={{
                          flex: 1, borderRadius: "12px", background: "#1a1a1a",
                          border: "none", cursor: "pointer",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: "5px",
                        }}
                      >
                        <span style={{ fontSize: "20px", color: "#fff" }}>⊞</span>
                        <span style={{ fontSize: "11px", color: "#fff", fontWeight: "600", fontFamily: "'Inter', sans-serif" }}>Voir tout</span>
                      </button>
                    )}
                  </div>
                )}

                {/* ── Owner card (green) ── */}
                <div style={{ background: "#ADEBB3", borderRadius: "20px", padding: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#0A3D3D", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Propriétaire
                    </span>
                    {showExchange && (
                      exchangeSent ? (
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#0A3D3D", background: "rgba(10,61,61,0.12)", padding: "8px 16px", borderRadius: "999px" }}>
                          ✓ Demande envoyée
                        </span>
                      ) : (
                        <SwapSheet
                          listing={listing}
                          user={user}
                          onSuccess={() => setExchangeSent(true)}
                        />
                      )
                    )}
                    {isOwner && (
                      <span style={{ fontSize: "12px", color: "#0A3D3D80", fontStyle: "italic" }}>Votre annonce</span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px" }}>
                    <div style={{
                      width: "84px", height: "84px", background: "#0A3D3D",
                      borderRadius: "50%", display: "flex", alignItems: "center",
                      justifyContent: "center", color: "#ADEBB3",
                      fontWeight: "700", fontSize: "30px",
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      marginBottom: "4px",
                    }}>
                      {initFrom(listing.profiles?.full_name || (isOwner ? user?.user_metadata?.full_name : null) || "P")}
                    </div>
                    <p style={{
                      fontSize: "22px", fontWeight: "700", color: "#0A3D3D",
                      fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0,
                    }}>
                      {listing.profiles?.full_name || (isOwner ? user?.user_metadata?.full_name || user?.email?.split("@")[0] : null) || "Propriétaire"}
                    </p>
                    {listing.profiles?.wilaya && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#0A3D3D", fontWeight: "500" }}>
                        <MapPin style={{ width: "13px", height: "13px" }} />
                        {listing.profiles.wilaya}
                      </span>
                    )}
                    {listing.profiles?.created_at && (
                      <span style={{ fontSize: "12px", color: "rgba(10,61,61,0.6)" }}>
                        Membre depuis {fmtDate(listing.profiles.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Sale contact */}
                  {listing.is_for_sale && !isOwner && (
                    saleSent ? (
                      <div style={{
                        marginTop: "20px", width: "100%", padding: "12px",
                        borderRadius: "999px", border: "1.5px solid #0A3D3D",
                        background: "rgba(10,61,61,0.1)", color: "#0A3D3D",
                        fontSize: "14px", fontWeight: "700",
                        fontFamily: "'Inter', sans-serif", textAlign: "center",
                        boxSizing: "border-box",
                      }}>
                        ✓ Demande envoyée
                      </div>
                    ) : (
                      <button
                        onClick={handleContactSeller}
                        disabled={contactSaleLoading}
                        style={{
                          marginTop: "20px", width: "100%", padding: "12px",
                          borderRadius: "999px", border: "1.5px solid #0A3D3D",
                          background: "transparent", color: "#0A3D3D",
                          fontSize: "14px", fontWeight: "700",
                          cursor: contactSaleLoading ? "wait" : "pointer",
                          fontFamily: "'Inter', sans-serif",
                          opacity: contactSaleLoading ? 0.65 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        {contactSaleLoading ? "Chargement…" : "Contacter le vendeur"}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* ════ RIGHT COLUMN ════ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* ── Heart + Contact row ── */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleToggleLike}
                    disabled={likeLoading}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "8px", padding: "13px", borderRadius: "12px",
                      border: `1.5px solid ${isLiked ? "#fca5a5" : "#e5e7eb"}`,
                      background: isLiked ? "#fff1f2" : "#fff",
                      color: isLiked ? "#ef4444" : "#717182",
                      fontSize: "14px", fontWeight: "600", cursor: likeLoading ? "wait" : "pointer",
                      fontFamily: "'Inter', sans-serif", transition: "all 0.18s",
                    }}
                  >
                    <Heart style={{ width: "17px", height: "17px", fill: isLiked ? "#ef4444" : "none" }} />
                    {isLiked ? "Sauvegardé" : "Sauvegarder"}
                  </button>
                  {!isOwner && (
                    <button
                      onClick={handleContact}
                      disabled={contactLoading}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        gap: "8px", padding: "13px", borderRadius: "12px",
                        border: "none", background: "#ADEBB3",
                        color: "#0A3D3D", fontSize: "14px", fontWeight: "700",
                        cursor: contactLoading ? "wait" : "pointer",
                        fontFamily: "'Inter', sans-serif",
                        opacity: contactLoading ? 0.65 : 1, transition: "opacity 0.15s",
                      }}
                    >
                      <MessageCircle style={{ width: "17px", height: "17px" }} />
                      {contactLoading ? "Chargement…" : "Contacter"}
                    </button>
                  )}
                </div>

                {/* Availability / info card */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px 24px" }}>
                  <p style={sectionLabel}>
                    Disponibilités{listing.profiles?.full_name ? ` de ${listing.profiles.full_name}` : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                    {fmtRange(listing.available_from, listing.available_to) && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ADEBB3", borderRadius: "999px", padding: "7px 14px" }}>
                        <Calendar style={{ width: "14px", height: "14px", color: "#0A3D3D" }} />
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#0A3D3D" }}>
                          {fmtRange(listing.available_from, listing.available_to)}
                        </span>
                      </div>
                    )}
                    {listing.wilaya && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#ADEBB3", borderRadius: "999px", padding: "7px 14px" }}>
                        <MapPin style={{ width: "14px", height: "14px", color: "#0A3D3D" }} />
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#0A3D3D" }}>
                          {[listing.wilaya, listing.city || listing.quartier].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const anyWilaya = listing.any_wilaya;
                    const raw = listing.destination_wilayas;
                    const wilayas = typeof raw === "string"
                      ? raw.split(",").map((w) => w.trim()).filter((w) => w && isNaN(w))
                      : Array.isArray(raw) ? raw.map(String).map((w) => w.trim()).filter((w) => w && isNaN(w)) : [];
                    if (!anyWilaya && wilayas.length === 0) return null;
                    return (
                      <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #f3f4f6" }}>
                        <p style={{ ...sectionLabel, marginBottom: "10px" }}>Destinations souhaitées</p>
                        {anyWilaya ? (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: "7px",
                            background: "#ADEBB3", borderRadius: "999px", padding: "7px 16px",
                          }}>
                            <Globe2 style={{ width: "13px", height: "13px", color: "#0A3D3D" }} />
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#0A3D3D" }}>
                              Ouvert à toutes les wilayas
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                            {wilayas.map((w) => (
                              <span key={w} style={{
                                display: "inline-flex", alignItems: "center", gap: "5px",
                                background: "#ADEBB3", borderRadius: "999px",
                                padding: "5px 13px", fontSize: "13px",
                                fontWeight: "500", color: "#0A3D3D",
                              }}>
                                <MapPin style={{ width: "11px", height: "11px", color: "#0A3D3D", flexShrink: 0 }} />
                                {w}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {!!listing.price && (
                    <p style={{
                      fontSize: "24px", fontWeight: "800", color: "#4B3FD8",
                      margin: "14px 0 0", fontFamily: "'Bricolage Grotesque', sans-serif",
                    }}>
                      {fmtPrice(listing.price)}
                    </p>
                  )}
                </div>

                {/* ── Stats bar (green) ── */}
                <div style={{
                  background: "#ADEBB3", borderRadius: "16px",
                  padding: "20px 24px", display: "flex", alignItems: "center",
                }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
                    <BedDouble style={{ width: "20px", height: "20px", color: "#0A3D3D" }} />
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0A3D3D", fontFamily: "'Inter', sans-serif" }}>
                      {listing.rooms} chambre{listing.rooms > 1 ? "s" : ""}
                    </span>
                  </div>
                  {listing.size && (
                    <div style={{
                      flex: 1, display: "flex", alignItems: "center", gap: "10px",
                      borderLeft: "1px solid rgba(10,61,61,0.2)", paddingLeft: "20px",
                    }}>
                      <Maximize2 style={{ width: "18px", height: "18px", color: "#0A3D3D" }} />
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#0A3D3D", fontFamily: "'Inter', sans-serif" }}>
                        {listing.size} m² superficie
                      </span>
                    </div>
                  )}
                  {listing.property_type === "appart" && listing.floor != null && (
                    <div style={{
                      flex: 1, display: "flex", alignItems: "center", gap: "10px",
                      borderLeft: "1px solid rgba(10,61,61,0.2)", paddingLeft: "20px",
                    }}>
                      <Layers style={{ width: "18px", height: "18px", color: "#0A3D3D" }} />
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#0A3D3D", fontFamily: "'Inter', sans-serif" }}>
                        {listing.floor === 0 ? "RDC" : `Étage ${listing.floor}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {listing.description && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px 24px" }}>
                    <p style={sectionLabel}>Description</p>
                    <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.75, margin: 0 }}>
                      {listing.description}
                    </p>
                  </div>
                )}

                {/* Amenities */}
                {listing.amenities?.length > 0 && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px 24px" }}>
                    <p style={sectionLabel}>Équipements</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                      {listing.amenities.map((name) => {
                        const Icon = AMENITY_ICONS[name] || Wifi;
                        return (
                          <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Icon style={{ width: "16px", height: "16px", color: "#717182", flexShrink: 0 }} />
                            <span style={{ fontSize: "13px", color: "#1a1a1a" }}>{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Rules (green, exchange only) ── */}
                {listing.is_for_exchange && listing.house_rules && (
                  <div style={{ background: "#ADEBB3", borderRadius: "16px", padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <BookOpen style={{ width: "15px", height: "15px", color: "#0A3D3D" }} />
                      <p style={{ ...sectionLabel, color: "#0A3D3D", marginBottom: 0 }}>Règles du logement</p>
                    </div>
                    <p style={{ fontSize: "14px", color: "#0A3D3D", lineHeight: 1.75, margin: 0 }}>
                      {listing.house_rules}
                    </p>
                  </div>
                )}

                {/* ── Neighbourhood map (SeLoger-style privacy zone) ── */}
                <div>
                  <p style={sectionLabel}>Carte du quartier</p>
                  <Suspense fallback={
                    <div style={{ height: "240px", borderRadius: "14px", border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "13px", color: "#9ca3af", fontFamily: "'Inter',sans-serif" }}>Chargement…</span>
                    </div>
                  }>
                    <NeighborhoodMap listing={listing} />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* ── Reviews — full width below grid ── */}
            <div style={{ marginTop: "40px" }}>
              <h2 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "22px", fontWeight: "700", color: "#1a1a1a",
                marginBottom: "20px",
              }}>
                Avis ({reviews.length})
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {reviews.length === 0 && (
                  <p style={muted}>Aucun avis pour le moment.</p>
                )}
                {reviews.map((r) => (
                  <div key={r.id} style={{
                    background: "#F7F7EC", borderRadius: "14px", padding: "18px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <div style={{
                        width: "36px", height: "36px", background: "#0A3D3D",
                        borderRadius: "50%", display: "flex", alignItems: "center",
                        justifyContent: "center", color: "#fff", fontSize: "13px",
                        fontWeight: "600", flexShrink: 0,
                      }}>
                        {initFrom(r.profiles?.full_name)}
                      </div>
                      <div>
                        <p style={{ ...label, marginBottom: "2px" }}>{r.profiles?.full_name || "Utilisateur"}</p>
                        <Stars rating={r.rating} />
                      </div>
                      <span style={{ ...muted, marginLeft: "auto", fontSize: "12px" }}>
                        {fmtDate(r.created_at)}
                      </span>
                    </div>
                    {r.comment && (
                      <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.6, margin: 0 }}>{r.comment}</p>
                    )}
                  </div>
                ))}

                {!isOwner && user && (
                  <div style={{ background: "#ADEBB3", borderRadius: "14px", padding: "20px", marginTop: "8px" }}>
                    <p style={{ ...label, marginBottom: "12px", fontSize: "14px", color: "#0A3D3D" }}>Laisser un avis</p>
                    <Stars rating={rating} onClick={setRating} hoveredStar={hoveredStar} setHoveredStar={setHoveredStar} emptyColor="rgba(0,73,73,0.35)" />
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Partagez votre expérience..."
                      style={{
                        width: "100%", marginTop: "12px", padding: "10px 14px",
                        borderRadius: "10px", border: "1.5px solid rgba(0,73,73,0.2)",
                        fontSize: "14px", fontFamily: "'Inter', sans-serif",
                        resize: "vertical", outline: "none", boxSizing: "border-box",
                        background: "#ffffff", color: "#1a1a1a",
                      }}
                    />
                    <button
                      onClick={handleReview}
                      disabled={!rating || submittingReview}
                      style={{
                        marginTop: "10px", padding: "10px 24px",
                        borderRadius: "999px", border: "none",
                        background: !rating ? "rgba(0,73,73,0.25)" : "#004949",
                        color: !rating ? "rgba(0,73,73,0.5)" : "#ADEBB3",
                        fontSize: "13px", fontWeight: "600",
                        cursor: !rating ? "not-allowed" : "pointer",
                        fontFamily: "'Inter', sans-serif",
                        transition: "background 0.15s",
                      }}
                    >
                      {submittingReview ? "Publication…" : "Publier l'avis"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Fullscreen modal ── */}
      {isFullscreen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.92)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <button
            onClick={() => setIsFullscreen(false)}
            style={{
              position: "absolute", top: "24px", right: "24px",
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: "50%", width: "48px", height: "48px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", cursor: "pointer", zIndex: 101,
            }}
          >
            <X style={{ width: "24px", height: "24px" }} />
          </button>
          <img
            src={photos[photoIdx]}
            alt="fullscreen"
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }}
          />
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} style={{
                position: "absolute", left: "24px", top: "50%",
                transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)",
                border: "none", color: "#fff", width: "48px", height: "48px",
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", zIndex: 101,
              }}>
                <ChevronLeft style={{ width: "24px", height: "24px" }} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} style={{
                position: "absolute", right: "24px", top: "50%",
                transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)",
                border: "none", color: "#fff", width: "48px", height: "48px",
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", zIndex: 101,
              }}>
                <ChevronRight style={{ width: "24px", height: "24px" }} />
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
