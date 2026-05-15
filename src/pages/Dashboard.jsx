import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  List,
  Repeat,
  MessageSquare,
  User,
  Plus,
  Clock,
  LogOut,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    listings: 0,
    exchanges: 0,
    messages: 0,
  });
  const [activity, setActivity] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async (userId) => {
    try {
      const { count: listingsCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: exchangesCount } = await supabase
        .from("exchange_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId);

      setStats({
        listings: listingsCount || 0,
        exchanges: exchangesCount || 0,
        messages: messagesCount || 0,
      });

      const { data: requests } = await supabase
        .from("exchange_requests")
        .select(`*, listings(title, wilaya, user_id)`)
        .order("created_at", { ascending: false })
        .limit(2);

      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(2);

      const { data: verifiedListings } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", userId)
        .eq("is_verified", true)
        .order("created_at", { ascending: false })
        .limit(2);

      const timeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 86400;
        if (interval >= 1)
          return `Il y a ${Math.floor(interval)} jour${Math.floor(interval) > 1 ? "s" : ""}`;
        interval = seconds / 3600;
        if (interval >= 1)
          return `Il y a ${Math.floor(interval)} heure${Math.floor(interval) > 1 ? "s" : ""}`;
        interval = seconds / 60;
        if (interval >= 1)
          return `Il y a ${Math.floor(interval)} minute${Math.floor(interval) > 1 ? "s" : ""}`;
        return "À l'instant";
      };

      const activityItems = [];
      requests?.forEach((r) => {
        if (r.listings) {
          activityItems.push({
            text: "Nouvelle demande d'échange reçue",
            sub: `${r.listings.title} à ${r.listings.wilaya} - ${timeAgo(r.created_at)}`,
            time: new Date(r.created_at),
          });
        }
      });
      messages?.forEach((m) => {
        activityItems.push({
          text: "Nouveau message reçu",
          sub: timeAgo(m.created_at),
          time: new Date(m.created_at),
        });
      });
      verifiedListings?.forEach((l) => {
        activityItems.push({
          text: "Votre annonce a été vérifiée",
          sub: `${l.title} à ${l.wilaya} - ${timeAgo(l.created_at)}`,
          time: new Date(l.created_at),
        });
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
      else {
        setUser(user);
        fetchDashboardData(user.id);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0].toUpperCase() || "?";

  const displayName = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ")[0]
    : user?.email?.split("@")[0];

  const navLinks = [
    { to: "/browse", Icon: Search, label: "Parcourir", active: true },
    { to: "/profile", Icon: List, label: "Mes annonces", active: false },
    { to: "/my-exchanges", Icon: Repeat, label: "Mes échanges", active: false },
    { to: "/messages", Icon: MessageSquare, label: "Messages", active: false },
    { to: "/profile", Icon: User, label: "Profil", active: false },
  ];

  const actionCards = [
    {
      to: "/add-listing",
      Icon: Plus,
      title: "Publier une annonce",
      sub: "Listez votre propriété pour échange ou vente",
      btn: "Commencer",
    },
    {
      to: "/browse",
      Icon: Search,
      title: "Parcourir",
      sub: "Découvrez des propriétés à travers l'Algérie",
      btn: "Explorer",
    },
    {
      to: "/my-exchanges",
      Icon: Repeat,
      title: "Mes échanges",
      sub: "Voir et gérer vos échanges",
      btn: "Ouvrir",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F7EC",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        style={{
          height: "62px",
          background: "#F7F7EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          flexShrink: 0,
        }}
      >
        <Link
          to="/dashboard"
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#0A3D3D",
            textDecoration: "none",
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          DarBelDar
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              color: "#374151",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <LogOut style={{ width: "15px", height: "15px" }} />
            Déconnexion
          </button>

          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#0A3D3D",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside
          style={{
            width: "210px",
            flexShrink: 0,
            padding: "12px 12px",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {navLinks.map(({ to, Icon, label, active }) => (
              <Link
                key={label}
                to={to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: active ? "600" : "500",
                  color: active ? "#ffffff" : "#374151",
                  background: active ? "#0A3D3D" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.background = "rgba(10,61,61,0.07)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <Icon style={{ width: "17px", height: "17px" }} />
                  {label}
                </span>
                {active && (
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "#5eead4",
                      flexShrink: 0,
                    }}
                  />
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* ── Main ────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "36px 48px", minWidth: 0 }}>
          {/* Welcome */}
          <div style={{ marginBottom: "28px" }}>
            <h1
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "32px",
                fontWeight: "700",
                color: "#111827",
                marginBottom: "6px",
                lineHeight: 1.25,
              }}
            >
              Bienvenue,{" "}
              <span
                style={{
                  color: "#0A3D3D",
                  background: "rgba(10,61,61,0.1)",
                  borderRadius: "6px",
                  padding: "1px 8px",
                }}
              >
                {displayName}
              </span>{" "}
              !
            </h1>
            <p style={{ fontSize: "14px", color: "#717182" }}>
              Voici ce qui se passe avec vos echanges et annonces récemment.
              Jetez un oeil a votre activité récente.
            </p>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {[
              { label: "Mes annonces", value: stats.listings, to: "/profile" },
              {
                label: "Échanges en attente",
                value: stats.exchanges,
                to: "/my-exchanges",
              },
              {
                label: "Messages non lus",
                value: stats.messages,
                to: "/messages",
              },
            ].map(({ label, value, to }) => (
              <Link
                key={to}
                to={to}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "22px 26px",
                  textDecoration: "none",
                  display: "block",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 1px 4px rgba(0,0,0,0.06)")
                }
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#717182",
                    fontWeight: "500",
                    marginBottom: "10px",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: "42px",
                    fontWeight: "700",
                    color: "#111827",
                    lineHeight: 1,
                  }}
                >
                  {loadingData ? "—" : value}
                </p>
              </Link>
            ))}
          </div>

          {/* Action cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {actionCards.map(({ to, Icon, title, sub, btn }) => (
              <div
                key={to}
                style={{
                  background: "#ADEBB3",
                  borderRadius: "16px",
                  padding: "26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#0A3D3D",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    style={{ width: "20px", height: "20px", color: "#ffffff" }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: "17px",
                      fontWeight: "700",
                      color: "#111827",
                      marginBottom: "6px",
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      lineHeight: 1.55,
                    }}
                  >
                    {sub}
                  </p>
                </div>

                <Link
                  to={to}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "9px 18px",
                    background: "#0A3D3D",
                    color: "#ffffff",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: "600",
                    textDecoration: "none",
                    width: "fit-content",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {btn} →
                </Link>
              </div>
            ))}
          </div>

          {/* Activity */}
          <div
            style={{
              background: "#ADEBB3",
              borderRadius: "16px",
              padding: "26px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "18px",
                fontWeight: "700",
                color: "#111827",
                marginBottom: "14px",
              }}
            >
              Activité récente
            </h2>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {loadingData ? (
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  Chargement...
                </p>
              ) : activity.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  <p style={{ fontSize: "14px" }}>Aucune activité récente</p>
                  <p style={{ fontSize: "13px", marginTop: "6px" }}>
                    Commencez par publier une annonce !
                  </p>
                </div>
              ) : (
                activity.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "14px 18px",
                    }}
                  >
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        background: "#0A3D3D",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Clock
                        style={{
                          width: "16px",
                          height: "16px",
                          color: "#ffffff",
                        }}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: "3px",
                        }}
                      >
                        {item.text}
                      </p>
                      <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {item.sub}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
