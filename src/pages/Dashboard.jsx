import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Repeat, LogOut, Menu } from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import tripIllustration from "../assets/Trip-bro.svg";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState(null);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchDashboardData = async (userId) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles").select("full_name").eq("id", userId).single();
      setProfileName(profileData?.full_name || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/login");
      else { setUser(user); fetchDashboardData(user.id); }
    });
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const initials = profileName
    ? profileName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || "?";
  const displayName = profileName
    ? profileName.split(" ")[0]
    : user?.email?.split("@")[0] || "Utilisateur";

  const actionCards = [
    { to: "/add-listing",   Icon: Plus,   title: t("dashboard.publishTitle"),   sub: t("dashboard.publishSub"),   btn: t("dashboard.publishBtn")   },
    { to: "/browse",        Icon: Search, title: t("dashboard.browseTitle"),    sub: t("dashboard.browseSub"),    btn: t("dashboard.browseBtn")    },
    { to: "/my-exchanges",  Icon: Repeat, title: t("dashboard.exchangesTitle"), sub: t("dashboard.exchangesSub"), btn: t("dashboard.exchangesBtn") },
  ];

  return (
    <div
      className="dbd-dashboard-grid"
      style={{ minHeight: "100vh", background: "#F3EEE0", display: "grid", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}
    >
      {/* Responsive grid via a literal <style> (not a Tailwind arbitrary class):
          inline display:grid stays, but grid-template-columns is class-owned so
          it can switch at the breakpoint. Phone = single column (the sidebar is
          a fixed drawer, out of flow); desktop (lg+) = auto/1fr, identical to
          before. A <style> tag ships with the component, so it can't be dropped
          by a stale Tailwind build. */}
      <style>{`
        .dbd-dashboard-grid { grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 1024px) {
          .dbd-dashboard-grid { grid-template-columns: auto minmax(0, 1fr); }
        }
      `}</style>
      <Sidebar
        active="Parcourir"
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      <main style={{ padding: "26px 42px 56px" }}>
        {/* Cap + center the content so it doesn't sit left-aligned with an
            uneven right gutter on wide screens. flex justify-center (not
            mx-auto: the global * { margin: 0 } reset overrides margin-inline). */}
        <div className="flex justify-center">
        <div className="w-full max-w-7xl">
        {/* Topbar */}
        <header style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", gap: 14, paddingBottom: 22 }}>
          {/* Hamburger — phone only; opens the sidebar drawer. Sits at the start
              of the row (marginRight:auto pushes the rest to flex-end). Display
              is class-owned (inline-flex / lg:hidden) — no inline `display`, or
              it would beat the lg:hidden utility. */}
          <button
            onClick={() => setSidebarMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="inline-flex items-center justify-center lg:hidden"
            style={{ marginRight: "auto", width: 40, height: 40, borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "#005B5B", padding: 0 }}
          >
            <Menu style={{ width: 22, height: 22 }} />
          </button>
          <button
            onClick={handleLogout}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#005B5B", padding: "8px 12px", borderRadius: 999, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            <span className="hidden lg:inline">{t("dashboard.logout")}</span>
          </button>
          <NotificationBell userId={user?.id} />
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>
            {initials}
          </div>
        </header>

        {/* Welcome */}
        <section style={{ margin: "6px 0 24px" }}>
          <h1 style={{ fontSize: 42, lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 700, margin: 0, color: "#0F2A2A" }}>
            {t("dashboard.welcome")},{" "}
            <span style={{ background: "#ADEBB3", padding: "0 0.18em", borderRadius: 6, color: "#005B5B" }}>
              {displayName}
            </span>!
          </h1>
        </section>

        {/* Quick actions */}
        {/* Columns + top margin are class-owned (literal <style>, immune to stale
            Tailwind builds): 1-up below 768px, 3-up at 768px+ (cards have no
            min-width, so they shrink cleanly). The 96px top margin only exists
            to clear the decorative illustration, which is hidden below 2xl
            (1536px) — so reserve it only there, and use 24px below. */}
        <section className="dbd-quick-actions" style={{ position: "relative", display: "grid", gap: 18, marginBottom: 24 }}>
          <style>{`
            .dbd-quick-actions { grid-template-columns: 1fr; margin-top: 24px; }
            @media (min-width: 768px) {
              .dbd-quick-actions { grid-template-columns: repeat(3, 1fr); }
            }
            @media (min-width: 1536px) {
              .dbd-quick-actions { margin-top: 96px; }
            }
          `}</style>
          {/* Illustration overlaid above the middle "Parcourir" card so it looks like it walks on it */}
          {/* Decorative only (aria-hidden). Hidden below 2xl: the centered art
              collides with the left-aligned welcome name while the content
              wrapper is narrow (<~1400px). display is owned by the classes —
              no inline `display` (inline would override Tailwind `hidden`). */}
          <img
            src={tripIllustration}
            alt=""
            aria-hidden="true"
            className="hidden 2xl:block"
            style={{
              position: "absolute", left: "50%", bottom: "100%",
              transform: "translate(-50%, 2px)",
              width: 230, height: "auto",
              pointerEvents: "none", zIndex: 2,
            }}
          />
          {actionCards.map((card) => (
            <div key={card.to} style={{ borderRadius: 22, padding: "24px 26px", background: "#ADEBB3", border: "1px solid #D5E9D8", display: "flex", flexDirection: "column", gap: 14, minHeight: 200 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#005B5B", color: "#ADEBB3", flexShrink: 0 }}>
                <card.Icon style={{ width: 22, height: 22 }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A" }}>{card.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45, color: "#6E7B79" }}>{card.sub}</p>
              <Link
                to={card.to}
                style={{ marginTop: "auto", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: "#005B5B", color: "#F3EEE0", padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, textDecoration: "none" }}
              >
                {card.btn} →
              </Link>
            </div>
          ))}
        </section>
        </div>
        </div>
      </main>
    </div>
  );
}
