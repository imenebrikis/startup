import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function NotificationBell({ userId }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    async function fetchUnread() {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    }

    fetchUnread();

    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        fetchUnread
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  return (
    <button
      onClick={() => navigate("/messages")}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0A3D3D",
      }}
      aria-label="Notifications"
    >
      <Bell style={{ width: 20, height: 20 }} />
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "#4B3FD8",
            color: "#fff",
            borderRadius: "50%",
            width: 16,
            height: 16,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
