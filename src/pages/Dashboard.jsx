import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Repeat, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import LanguageSelector from "../components/LanguageSelector";
import tripIllustration from "../assets/Trip-bro.svg";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState(null);
  const navigate = useNavigate();

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
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const initials = profileName
    ? profileName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || "?";
  const displayName = profileName
    ? profileName.split(" ")[0]
    : user?.email?.split("@")[0] || "Utilisateur";

  const actionCards = [
    { to: "/add-listing",   Icon: Plus,   title: "Publier une annonce", sub: "Listez votre propriété pour échange ou vente",    btn: "Commencer" },
    { to: "/browse",        Icon: Search, title: "Parcourir",            sub: "Découvrez des propriétés à travers l'Algérie",    btn: "Explorer"  },
    { to: "/my-exchanges",  Icon: Repeat, title: "Mes échanges",         sub: "Voir et gérer vos échanges",                      btn: "Ouvrir"    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F3EEE0", display: "grid", gridTemplateColumns: "auto 1fr", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      <Sidebar active="Parcourir" />

      <main style={{ padding: "26px 42px 56px", maxWidth: 1440, width: "100%" }}>
        {/* Topbar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, paddingBottom: 22 }}>
          <LanguageSelector />
          <button
            onClick={handleLogout}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#005B5B", padding: "8px 12px", borderRadius: 999, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            Déconnexion
          </button>
          <NotificationBell userId={user?.id} />
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>
            {initials}
          </div>
        </header>

        {/* Welcome */}
        <section style={{ margin: "6px 0 24px" }}>
          <h1 style={{ fontSize: 42, lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 700, margin: 0, color: "#0F2A2A" }}>
            Bienvenue,{" "}
            <span style={{ background: "#ADEBB3", padding: "0 0.18em", borderRadius: 6, color: "#005B5B" }}>
              {displayName}
            </span>!
          </h1>
          <p style={{ margin: "10px 0 0", color: "#6E7B79", fontSize: 15 }}>Voici ce qui se passe avec vos échanges</p>
        </section>

        {/* Quick actions */}
        <section style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 96, marginBottom: 24 }}>
          {/* Illustration overlaid above the middle "Parcourir" card so it looks like it walks on it */}
          <img
            src={tripIllustration}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute", left: "50%", bottom: "100%",
              transform: "translate(-50%, 2px)",
              width: 230, height: "auto", display: "block",
              pointerEvents: "none", zIndex: 2,
            }}
          />
          {actionCards.map(({ to, Icon, title, sub, btn }) => (
            <div key={to} style={{ borderRadius: 22, padding: "24px 26px", background: "#ADEBB3", border: "1px solid #D5E9D8", display: "flex", flexDirection: "column", gap: 14, minHeight: 200 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#005B5B", color: "#ADEBB3", flexShrink: 0 }}>
                <Icon style={{ width: 22, height: 22 }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45, color: "#6E7B79" }}>{sub}</p>
              <Link
                to={to}
                style={{ marginTop: "auto", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: "#005B5B", color: "#F3EEE0", padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, textDecoration: "none" }}
              >
                {btn} →
              </Link>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
