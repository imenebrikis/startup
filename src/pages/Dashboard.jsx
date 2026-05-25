import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Repeat, Clock, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState(null);
  const [stats, setStats] = useState({ listings: 0, exchanges: 0, messages: 0 });
  const [activity, setActivity] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async (userId) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles").select("full_name").eq("id", userId).single();
      setProfileName(profileData?.full_name || null);

      const { count: listingsCount } = await supabase
        .from("listings").select("*", { count: "exact", head: true }).eq("user_id", userId);
      const { count: exchangesCount } = await supabase
        .from("exchange_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: messagesCount } = await supabase
        .from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", userId);

      setStats({ listings: listingsCount || 0, exchanges: exchangesCount || 0, messages: messagesCount || 0 });

      const { data: requests } = await supabase
        .from("exchange_requests")
        .select(`*, listings(title, wilaya, user_id)`)
        .order("created_at", { ascending: false }).limit(2);
      const { data: messages } = await supabase
        .from("messages").select("*").eq("receiver_id", userId)
        .order("created_at", { ascending: false }).limit(2);
      const { data: verifiedListings } = await supabase
        .from("listings").select("*").eq("user_id", userId).eq("is_verified", true)
        .order("created_at", { ascending: false }).limit(2);

      const timeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 86400;
        if (interval >= 1) return `Il y a ${Math.floor(interval)} jour${Math.floor(interval) > 1 ? "s" : ""}`;
        interval = seconds / 3600;
        if (interval >= 1) return `Il y a ${Math.floor(interval)} heure${Math.floor(interval) > 1 ? "s" : ""}`;
        interval = seconds / 60;
        if (interval >= 1) return `Il y a ${Math.floor(interval)} minute${Math.floor(interval) > 1 ? "s" : ""}`;
        return "À l'instant";
      };

      const activityItems = [];
      requests?.forEach((r) => {
        if (r.listings) activityItems.push({ text: "Nouvelle demande d'échange reçue", sub: `${r.listings.title} à ${r.listings.wilaya} - ${timeAgo(r.created_at)}`, time: new Date(r.created_at) });
      });
      messages?.forEach((m) => {
        activityItems.push({ text: "Nouveau message reçu", sub: timeAgo(m.created_at), time: new Date(m.created_at) });
      });
      verifiedListings?.forEach((l) => {
        activityItems.push({ text: "Votre annonce a été vérifiée", sub: `${l.title} à ${l.wilaya} - ${timeAgo(l.created_at)}`, time: new Date(l.created_at) });
      });
      activityItems.sort((a, b) => b.time - a.time);
      setActivity(activityItems.slice(0, 4));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/");
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

        {/* Stats */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 18 }}>
          {[
            { label: "Mes annonces",        value: stats.listings,  to: "/profile"       },
            { label: "Échanges en attente", value: stats.exchanges, to: "/my-exchanges"  },
            { label: "Messages non lus",    value: stats.messages,  to: "/messages"      },
          ].map(({ label, value, to }) => (
            <Link
              key={to}
              to={to}
              style={{ borderRadius: 22, padding: "24px 26px 22px", border: "1px solid #E5DFCE", background: "#FFFFFF", display: "flex", flexDirection: "column", gap: 14, minHeight: 140, textDecoration: "none" }}
            >
              <div style={{ fontSize: 13.5, color: "#6E7B79", fontWeight: 500, letterSpacing: "0.005em" }}>{label}</div>
              <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.04em", color: "#005B5B", marginTop: "auto" }}>
                {loadingData ? "—" : value}
              </div>
            </Link>
          ))}
        </section>

        {/* Quick actions */}
      
        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 24 }}>
          {actionCards.map(({ to, Icon, title, sub, btn }) => (
            <div key={to} style={{ borderRadius: 22, padding: "24px 26px", background: "#E4F6E6", border: "1px solid #D5E9D8", display: "flex", flexDirection: "column", gap: 14, minHeight: 200 }}>
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

        {/* Activity */}
        <section style={{ borderRadius: 22, background: "#E4F6E6", border: "1px solid #D5E9D8", padding: "24px 26px 18px" }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A" }}>Activité récente</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingData ? (
              <p style={{ fontSize: 14, color: "#6E7B79" }}>Chargement...</p>
            ) : activity.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#6E7B79" }}>
                <p style={{ fontSize: 14 }}>Aucune activité récente</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Commencez par publier une annonce !</p>
              </div>
            ) : (
              activity.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 14, alignItems: "center", padding: "14px 16px", borderRadius: 14, background: "#FFFFFF", border: "1px solid #E8E2D2" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#005B5B", color: "#ADEBB3", flexShrink: 0 }}>
                    <Clock style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: "#0F2A2A", margin: "0 0 3px", letterSpacing: "-0.005em" }}>{item.text}</p>
                    <p style={{ fontSize: 12.5, color: "#6E7B79", margin: 0 }}>{item.sub}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
