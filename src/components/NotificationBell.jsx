import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, MessageSquare, Star, ArrowRightLeft, ShieldAlert, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const TYPE_ICON = {
  message: <MessageSquare className="h-4 w-4 text-blue-500" />,
  review: <Star className="h-4 w-4 text-amber-500 fill-amber-500" />,
  transaction: <ArrowRightLeft className="h-4 w-4 text-emerald-500" />,
  system: <ShieldAlert className="h-4 w-4 text-destructive" />,
};

function iconFor(type) {
  return TYPE_ICON[type] || TYPE_ICON.system;
}

function timeAgo(s) {
  if (!s) return "";
  const seconds = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (seconds < 60) return "À l'instant";
  const min = Math.floor(seconds / 60);
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d} j`;
  return new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function NotificationBell({ userId }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(userId);

  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new;
          setItems((prev) => [n, ...prev].slice(0, 20));
          toast(n.title, {
            description: n.body || undefined,
            icon: iconFor(n.type),
            action: n.link
              ? { label: "Voir", onClick: () => navigate(n.link) }
              : undefined,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new;
          setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, ...n } : it)));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, navigate]);

  const markOneRead = async (n) => {
    if (n.read_at) return;
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
  };

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((it) => (it.read_at ? it : { ...it, read_at: now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
  };

  const handleRowClick = async (n) => {
    await markOneRead(n);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5DFCE] bg-white text-[#005B5B] transition-colors hover:bg-[#F3EEE0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005B5B]/40"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute top-[6px] right-[6px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
            />
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `${unreadCount} non lues` : "Aucune notification"}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] !max-w-[92vw] p-0 overflow-hidden border border-[#E2E8F0] bg-white"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#0F172A]" strokeWidth={1.8} />
            <span className="text-[14px] font-semibold tracking-tight text-[#0F172A]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-bold leading-none text-red-600 ring-1 ring-red-100">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium text-[#475569] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer lu
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2 p-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-md bg-gradient-to-r from-[#F1F5F9] via-[#E8EDF2] to-[#F1F5F9] bg-[length:200%_100%]"
                  style={{ animation: "shimmer 1.4s infinite" }}
                />
              ))}
              <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F1F5F9]">
                <Bell className="h-5 w-5 text-[#94A3B8]" strokeWidth={1.6} />
              </div>
              <div className="text-[13.5px] font-semibold text-[#0F172A]">
                Tout est calme
              </div>
              <div className="text-[12px] leading-relaxed text-[#94A3B8]">
                Vos prochaines notifications apparaîtront ici.
              </div>
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => {
                const unread = !n.read_at;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleRowClick(n)}
                      className={`group flex w-full items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#F8FAFC] ${unread ? "bg-[#F8FAFC]/60" : ""}`}
                    >
                      <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[#F1F5F9]">
                        {iconFor(n.type)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className={`truncate text-[13.5px] ${unread ? "font-semibold text-[#0F172A]" : "font-medium text-[#334155]"}`}>
                            {n.title}
                          </span>
                          {unread && (
                            <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                          )}
                        </span>
                        {n.body && (
                          <span className="line-clamp-2 text-[12.5px] leading-snug text-[#475569]">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-0.5 text-[11px] text-[#94A3B8]">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
