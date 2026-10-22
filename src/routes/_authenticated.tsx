import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Protected-area layout. The session lives in localStorage (unreadable on
 * the server), so this subtree is client-only; the check runs before the
 * first paint of any child route.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    // Client-only subtree (ssr: false), so window access is safe here.
    return supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        throw redirect({ to: "/auth", search: {} });
      }
    });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout({ children }: { children?: ReactNode }) {
  useEffect(() => {
    // Re-check on mount so a stale session (expired link, signed out in
    // another tab) cannot render protected data.
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.assign("/auth");
    });
  }, []);
  return children ?? <Outlet />;
}
