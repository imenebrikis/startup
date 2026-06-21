import { useState, useEffect } from "react";
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

export default function Sidebar({ active, mobileOpen = false, onMobileClose }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Drawer vs in-flow is a layout decision, not a class toggle: the <aside>
  // carries heavy inline styles (incl. a dynamic width) that would beat any
  // breakpoint class, so we branch on a matchMedia flag instead. Desktop (lg+)
  // renders the exact same in-flow sticky sidebar as before; phone renders a
  // fixed off-canvas drawer. Default true so first paint on desktop is correct.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // On phone the drawer always shows the full nav (no 70px collapsed state).
  const expanded = isDesktop ? isSidebarExpanded : true;

  // Desktop: identical to the original in-flow sticky sidebar.
  const desktopStyle = {
    position: "sticky", top: 0, height: "100vh", flexShrink: 0,
    width: isSidebarExpanded ? "260px" : "70px",
    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    padding: isSidebarExpanded ? "26px 18px" : "26px 10px",
    borderRight: "1px solid #E5DFCE", background: "#F3EEE0",
    display: "flex", flexDirection: "column", gap: 22,
    overflow: "hidden",
  };
  // Phone: fixed off-canvas drawer. Slide easing matches the SwapSheet motion
  // already defined in index.css (cubic-bezier(.32,1,.58,1)); elevation matches
  // the app's modal shadow tone. Stays mounted (off-screen) when closed.
  const drawerStyle = {
    position: "fixed", top: 0, left: 0, height: "100vh", width: "280px",
    zIndex: 1000,
    transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 0.28s cubic-bezier(0.32, 1, 0.58, 1)",
    padding: "26px 18px",
    borderRight: "1px solid #E5DFCE", background: "#F3EEE0",
    display: "flex", flexDirection: "column", gap: 22,
    overflow: "hidden",
    boxShadow: mobileOpen ? "4px 0 28px rgba(0,0,0,0.18)" : "none",
  };

  return (
    <>
      {/* Reduced-motion floor: kill the slide/fade for users who ask for it.
          Inline transitions can't carry a media query, so override by class. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .dbd-drawer, .dbd-drawer-backdrop { transition: none !important; }
        }
      `}</style>

      {/* Backdrop — phone only, behind the drawer. Fades via opacity and goes
          inert (pointer-events:none) when closed so it never blocks the page. */}
      {!isDesktop && (
        <div
          className="dbd-drawer-backdrop"
          aria-hidden="true"
          onClick={onMobileClose}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.45)",
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 0.22s ease",
          }}
        />
      )}

      <aside className="dbd-drawer" style={isDesktop ? desktopStyle : drawerStyle}>

      {/* Brand + toggle row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: expanded ? "space-between" : "center",
        minHeight: 32,
      }}>
        {expanded && (
          <Logo to="/" size={24} color="#0A3D3D" style={{ padding: "6px 10px 4px" }} />
        )}
        {/* Dock collapse/expand is a desktop affordance only — on the phone
            drawer the width is fixed, so this control would be inert. */}
        {isDesktop && (
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
        )}
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
              onClick={() => onMobileClose?.()}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex", alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                justifyContent: expanded ? "flex-start" : "center",
                borderRadius: 12, fontSize: 14.5, fontWeight: 500,
                color: on ? "#F3EEE0" : "#005B5B",
                background: on ? "#005B5B" : isHov ? "rgba(0,91,91,0.06)" : "transparent",
                textDecoration: "none", position: "relative",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <Icon style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.9, color: on ? "#ADEBB3" : "currentColor" }} />
              {expanded && (
                <span style={{ whiteSpace: "nowrap" }}>{label}</span>
              )}
              {on && expanded && (
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
    </>
  );
}
