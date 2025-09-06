import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearTokens, getAccessToken, getAccessTokenExp, refreshAccessToken } from "@/lib/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const schedule = () => {
      const exp = getAccessTokenExp();
      if (!exp) return;
      const nowMs = Date.now();
      const expMs = exp * 1000;
      const lead = 30_000; // refresh 30s before expiry
      const delay = Math.max(1_000, expMs - nowMs - lead);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(async () => {
        const t = await refreshAccessToken();
        if (!t) {
          clearTokens();
          navigate("/admin", { replace: true, state: { from: location } });
          return;
        }
        schedule();
      }, delay) as unknown as number;
    };

    (async () => {
      const token = getAccessToken();
      if (!token) {
        navigate("/admin", { replace: true, state: { from: location } });
        return;
      }
      // Try refresh immediately if close to expiry
      await refreshAccessToken();
      if (!cancelled) {
        setReady(true);
        schedule();
      }
    })();

    return () => {
      cancelled = true;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [navigate, location]);

  if (!ready) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-border border-t-orange animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
