import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, List, Repeat, MessageSquare, User } from "lucide-react";
import DockLeftIcon from "./icons/DockLeftIcon";
import Logo from "./Logo";

// `id` is the stable value matched against the `active` prop (keep in French —
// pages pass these literally); `tKey` resolves the translated, displayed label.
const NAV = [
  { to: "/browse",       Icon: Search,        id: "Parcourir",    tKey: "browse" },
  { to: "/profile",      Icon: List,          id: "Mes annonces", tKey: "listings" },
  { to: "/my-exchanges", Icon: Repeat,        id: "Mes échanges", tKey: "exchanges" },
  { to: "/messages",     Icon: MessageSquare, id: "Messages",     tKey: "messages" },
  { to: "/profile",      Icon: User,          id: "Profil",       tKey: "profile" },
];

export default function Sidebar({ active }) {
  const { t } = useTranslation();
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
          <Logo to="/" size={24} color="#0A3D3D" style={{ padding: "6px 10px 4px" }} />
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
        {NAV.map((item) => {
          const { to, id, tKey } = item;
          const Icon = item.Icon;
          const on = id === active;
          const isHov = hovered === id && !on;
          const label = t(`sidebar.${tKey}`);
          return (
            <Link
              key={id}
              to={to}
              onMouseEnter={() => setHovered(id)}
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
