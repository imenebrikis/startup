import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, List, Repeat, MessageSquare, User } from "lucide-react";
import DockLeftIcon from "./icons/DockLeftIcon";

const NAV = [
  { to: "/browse",       Icon: Search,        label: "Parcourir" },
  { to: "/profile",      Icon: List,          label: "Mes annonces" },
  { to: "/my-exchanges", Icon: Repeat,        label: "Mes échanges" },
  { to: "/messages",     Icon: MessageSquare, label: "Messages" },
  { to: "/profile",      Icon: User,          label: "Profil" },
];

export default function Sidebar({ active }) {
  const [hovered, setHovered] = useState(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <aside style={{
      position: "sticky", top: 0, height: "100vh", flexShrink: 0,
      width: isSidebarExpanded ? "260px" : "70px",
      transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      padding: isSidebarExpanded ? "26px 18px" : "26px 10px",
      borderRight: "1px solid #E5DFCE", background: "#F3EEE0",
      display: "flex", flexDirection: "column", gap: 22,
      overflow: "hidden",
    }}>

      {/* Brand + toggle row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: isSidebarExpanded ? "space-between" : "center",
        minHeight: 32,
      }}>
        {isSidebarExpanded && (
          <Link to="/dashboard" style={{
            padding: "6px 10px 4px", fontWeight: 700, letterSpacing: "-0.01em",
            fontSize: 19, color: "#005B5B", textDecoration: "none",
            whiteSpace: "nowrap",
          }}>
            DarBelDar
          </Link>
        )}
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,91,91,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <DockLeftIcon size={20} color="#005B5B" flipHorizontal={!isSidebarExpanded} />
        </button>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ to, Icon, label }) => {
          const on = label === active;
          const isHov = hovered === label && !on;
          return (
            <Link
              key={label}
              to={to}
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex", alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                justifyContent: isSidebarExpanded ? "flex-start" : "center",
                borderRadius: 12, fontSize: 14.5, fontWeight: 500,
                color: on ? "#F3EEE0" : "#005B5B",
                background: on ? "#005B5B" : isHov ? "rgba(0,91,91,0.06)" : "transparent",
                textDecoration: "none", position: "relative",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <Icon style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.9, color: on ? "#ADEBB3" : "currentColor" }} />
              {isSidebarExpanded && (
                <span style={{ whiteSpace: "nowrap" }}>{label}</span>
              )}
              {on && isSidebarExpanded && (
                <span style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  width: 6, height: 6, borderRadius: "50%", background: "#ADEBB3",
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
