import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

// Shared guard that enforces account suspension across every protected route.
// It only adds the ban check — session handling is left to each page's own
// getUser() logic, so existing redirect behaviour is unchanged. A banned user
// (even one arriving with an already-open session) is signed out and bounced
// to the login page, where the suspension notice is shown.
export default function RequireAuth() {
  const [status, setStatus] = useState("checking"); // checking | allowed | banned

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      // No session: defer to the page's own auth handling.
      if (!user) { setStatus("allowed"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (profile?.is_banned) {
        await supabase.auth.signOut();
        if (!cancelled) setStatus("banned");
        return;
      }
      setStatus("allowed");
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === "checking") return null;
  if (status === "banned") return <Navigate to="/" replace state={{ suspended: true }} />;
  return <Outlet />;
}
