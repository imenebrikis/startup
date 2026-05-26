import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const TONES = [
  { bg: "#E4F6E6", color: "#005B5B", border: "#C9E8CD" },
  { bg: "#006E6E", color: "#ADEBB3", border: "#006E6E" },
];

function ini(name) {
  if (!name) return "A";
  const p = name.trim().split(" ");
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

export default function AdminSidebar({ active = "dashboard", pendingCount = 0, adminProfile }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const sbW = collapsed ? 70 : 260;

  const NAV = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="8" height="9" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></svg>,
      label: "Tableau de bord", key: "dashboard", to: "/admin",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>,
      label: "Annonces", key: "listings", to: "/admin/listings", badge: pendingCount || null,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 19c1.2-3 3.8-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/><circle cx="17" cy="7" r="2.6"/><path d="M14.5 14.5c1.5-.7 3-.9 4.5-.5 1.4.4 2.5 1.3 3 2.5"/></svg>,
      label: "Utilisateurs", key: "users", to: "/admin/users",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/></svg>,
      label: "Échanges & Ventes", key: "exchanges", to: "/admin/transactions",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
      label: "Messages 💬", key: "messages", to: "/admin/messages",
    },
  ];

  const MOD = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg>,
      label: "Modération", key: "reports", to: "/admin/reports",
    },
  ];

  function NavItem({ icon, label, itemKey, to, badge, warnBadge }) {
    const isActive = active === itemKey;
    return (
      <li style={{ position: "relative" }}>
        <Link
          to={to}
          style={{
            display: "flex", alignItems: "center", textDecoration: "none",
            gap: collapsed ? 0 : 12,
            padding: collapsed ? "10px 8px" : "9px 10px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 10, fontSize: 13.5,
            color: isActive ? "#006E6E" : "#6E7B79",
            background: isActive ? "#E4F6E6" : "transparent",
            boxShadow: isActive ? "inset 0 0 0 1px #C9E8CD" : "none",
            fontWeight: 500, position: "relative",
            transition: "background .15s, color .15s",
          }}
        >
          {isActive && (
            <span style={{ position: "absolute", left: -8, top: 8, bottom: 8, width: 3, borderRadius: 3, background: "#006E6E" }} />
          )}
          <span style={{ width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center" }}>{icon}</span>
          {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
          {!collapsed && badge > 0 && (
            <span style={{
              background: warnBadge ? "#FBEED1" : "#006E6E",
              color: warnBadge ? "#B4791E" : "#ADEBB3",
              border: warnBadge ? "1px solid #ECD6A1" : "none",
              fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            }}>{badge}</span>
          )}
        </Link>
      </li>
    );
  }

  const adminIni = ini(adminProfile?.full_name);

  return (
    <aside style={{
      position: "sticky", top: 0, height: "100vh", width: sbW, flexShrink: 0,
      background: "#F3EEE0", borderRight: "1px solid #E5DFCE",
      display: "flex", flexDirection: "column", overflow: "hidden",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", zIndex: 10,
    }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", padding: 14,
        borderBottom: "1px solid #E5DFCE", gap: 10,
        justifyContent: collapsed ? "center" : "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden" }}>
          <span style={{
            width: 34, height: 34, borderRadius: 10, background: "#006E6E", color: "#ADEBB3",
            display: "grid", placeItems: "center", flexShrink: 0,
            boxShadow: "inset 0 0 0 1px rgba(173,235,179,.30)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 11l8-7 8 7v9H4z"/>
              <path d="M9 14h7m-2-2 2 2-2 2" strokeWidth="1.6"/>
            </svg>
          </span>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#0F2A2A", lineHeight: 1 }}>DarBelDar</div>
              <span style={{
                marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 8px", borderRadius: 999, background: "#006E6E", color: "#ADEBB3",
                fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ADEBB3" }} />
                Admin
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center",
              border: "1px solid #E5DFCE", background: "#FFFFFF", color: "#6E7B79",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "6px 8px", overflowY: "auto" }}>
        <div style={{ padding: "8px 4px 4px" }}>
          {!collapsed && (
            <div style={{ padding: "6px 10px 8px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "#98A3A0", fontWeight: 600 }}>
              Plateforme
            </div>
          )}
          <ul style={{ display: "flex", flexDirection: "column", gap: 2, listStyle: "none", margin: 0, padding: 0 }}>
            {NAV.map(item => <NavItem key={item.key} {...item} itemKey={item.key} />)}
          </ul>
        </div>

        <div style={{ padding: "8px 4px 4px" }}>
          {!collapsed && (
            <div style={{ padding: "6px 10px 8px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "#98A3A0", fontWeight: 600 }}>
              Modération
            </div>
          )}
          <ul style={{ display: "flex", flexDirection: "column", gap: 2, listStyle: "none", margin: 0, padding: 0 }}>
            {MOD.map(item => <NavItem key={item.key} {...item} itemKey={item.key} />)}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #E5DFCE", padding: 14 }}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            style={{ width: "100%", display: "flex", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}
          >
            <span style={{
              width: 34, height: 34, borderRadius: "50%", background: "#006E6E", color: "#ADEBB3",
              display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12,
            }}>{adminIni}</span>
          </button>
        ) : (
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate("/"))}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderRadius: 12, background: "#FFFFFF", border: "1px solid #E5DFCE",
              width: "100%", cursor: "pointer", minWidth: 0,
            }}
          >
            <span style={{
              width: 34, height: 34, borderRadius: "50%", background: "#006E6E", color: "#ADEBB3",
              display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>{adminIni}</span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, textAlign: "left" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F2A2A", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {adminProfile?.full_name || "Admin"}
              </span>
              <span style={{ fontSize: 11.5, color: "#6E7B79", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {adminProfile?.email || ""}
              </span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E7B79" strokeWidth="1.8"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        )}
      </div>
    </aside>
  );
}
