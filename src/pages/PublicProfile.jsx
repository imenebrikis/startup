import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Home, Calendar, ArrowLeft, User } from "lucide-react";
import Logo from "../components/Logo";
import LanguageSelector from "../components/LanguageSelector";
import { supabase } from "../lib/supabase";

// ── Helpers (mirrors Browse.jsx) ────────────────────────────────────────────
function formatDate(dateStr, locale = "fr-FR") {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(d).replace(".", "");
  return `${d.getDate()} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

function getInitials(name) {
  if (!name) return "";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Listing card — self-contained, mirrors the Browse aesthetic ─────────────
function ListingCard({ listing, navigate, locale, t }) {
  const [hovered, setHovered] = useState(false);
  const photo = listing.images?.[0];
  const from = formatDate(listing.available_from, locale);
  const to = formatDate(listing.available_to, locale);
  const location = [listing.wilaya, listing.quartier || listing.city].filter(Boolean).join(", ");

  const badge = listing.is_for_exchange && listing.is_for_sale
    ? t("browse.badge.exchangeSale")
    : listing.is_for_exchange
      ? t("browse.badge.exchange")
      : t("browse.badge.sale");

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/listing/${listing.id}`)}
      style={{
        background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb",
        overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer",
        transition: "box-shadow 0.22s, transform 0.22s",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.10)" : "0 1px 6px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-3px)" : "none",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        {photo ? (
          <img src={photo} alt={listing.title} style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "200px", background: "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Home style={{ width: "36px", height: "36px", color: "#c4c4d4" }} />
          </div>
        )}
        <span style={{
          position: "absolute", top: "10px", left: "10px", background: "#004949",
          color: "#fff", fontSize: "11px", fontWeight: "600", padding: "3px 10px",
          borderRadius: "999px", fontFamily: "'Inter', sans-serif",
        }}>
          {badge}
        </span>
      </div>

      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        {listing.title && (
          <p style={{
            fontSize: "14px", fontWeight: "600", color: "#1a1a1a", margin: 0,
            textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "'Inter', sans-serif",
          }}>
            {listing.title}
          </p>
        )}

        {location && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
            <MapPin style={{ width: "12px", height: "12px", color: "#717182", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#1a1a1a", fontWeight: "500", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {location}
            </span>
          </div>
        )}

        {(from || to) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
            <Calendar style={{ width: "12px", height: "12px", color: "#717182", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#717182", fontWeight: "500" }}>
              {from && to ? `${from} – ${to}` : from || to}
            </span>
          </div>
        )}

        {listing.is_for_sale && listing.price && (
          <p style={{ fontSize: "13px", fontWeight: "700", color: "#4B3FD8", margin: 0, textAlign: "center" }}>
            {new Intl.NumberFormat("fr-DZ").format(listing.price)} DZD
          </p>
        )}

        <div style={{ flex: 1 }} />

        <button
          style={{
            marginTop: "6px", width: "100%", padding: "9px", borderRadius: "999px", border: "none",
            background: hovered ? "#004949" : "#f4f4f4", color: hovered ? "#ffffff" : "#004949",
            fontSize: "12px", fontWeight: "600", cursor: "pointer",
            transition: "background 0.18s, color 0.18s", fontFamily: "'Inter', sans-serif",
          }}
        >
          {t("browse.card.viewDetails")}
        </button>
      </div>
    </div>
  );
}

// ── Public profile page ──────────────────────────────────────────────────────
export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      setLoading(true);
      const [{ data: prof }, { data: rows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, wilaya, quartier, avatar_url, created_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("listings")
          .select("*")
          .eq("user_id", id)
          .eq("status", "approved")                              // moderation
          .eq("is_active", true)                                 // not hidden by owner
          .or(`available_to.gte.${today},available_to.is.null`)  // not expired (null = never expires)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;
      setProfile(prof || null);
      setListings(rows || []);
      setLoading(false);
    })();

    return () => { active = false; };
  }, [id]);

  const name = profile?.full_name || t("details.ownerFallback");
  const location = [profile?.quartier, profile?.wilaya].filter(Boolean).join(", ");
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale, { month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7EC", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top nav ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100, background: "#004949",
        padding: "12px 32px", minHeight: "68px", display: "flex",
        alignItems: "center", gap: "16px",
      }}>
        <Link to="/browse" style={{ textDecoration: "none", flexShrink: 0 }}>
          <Logo size={22} color="#ffffff" />
        </Link>

        <Link to="/browse" style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px 16px", borderRadius: "999px",
          border: "1.5px solid rgba(255,255,255,0.25)", background: "transparent",
          color: "#ffffff", fontSize: "13px", fontWeight: "600",
          textDecoration: "none", whiteSpace: "nowrap",
        }}>
          <ArrowLeft style={{ width: "14px", height: "14px" }} />
          {t("details.back")}
        </Link>

        <div style={{ flex: 1 }} />
        <LanguageSelector />
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#717182", fontSize: "14px" }}>…</p>
        ) : !profile ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{
              width: "64px", height: "64px", background: "#ffffff", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <User style={{ width: "28px", height: "28px", color: "#c4c4d4" }} />
            </div>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "18px", fontWeight: "700", color: "#1a1a1a" }}>
              {t("details.ownerFallback")}
            </p>
          </div>
        ) : (
          <>
            {/* ── Host header (centered, Airbnb-style) ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "10px", marginBottom: "44px" }}>
              <div style={{
                width: "112px", height: "112px", borderRadius: "50%", overflow: "hidden",
                background: "#0A3D3D", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#ADEBB3", fontWeight: "700", fontSize: "40px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  getInitials(name) || <User style={{ width: "44px", height: "44px" }} />
                )}
              </div>

              <h1 style={{
                fontSize: "30px", fontWeight: "700", color: "#0A3D3D", margin: 0,
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}>
                {name}
              </h1>

              {location && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px", color: "#0A3D3D", fontWeight: "500" }}>
                  <MapPin style={{ width: "14px", height: "14px" }} />
                  {location}
                </span>
              )}

              {memberSince && (
                <span style={{ fontSize: "13px", color: "#717182" }}>
                  {t("details.memberSince", { date: memberSince })}
                </span>
              )}
            </div>

            {/* ── Published listings grid ── */}
            <p style={{ fontSize: "12px", color: "#717182", marginBottom: "20px" }}>
              {t("browse.results", { count: listings.length })}
            </p>

            {listings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{
                  width: "64px", height: "64px", background: "#ffffff", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  <Home style={{ width: "28px", height: "28px", color: "#c4c4d4" }} />
                </div>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "18px", fontWeight: "700", color: "#1a1a1a", marginBottom: "8px" }}>
                  {t("browse.empty.title")}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} navigate={navigate} locale={locale} t={t} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
