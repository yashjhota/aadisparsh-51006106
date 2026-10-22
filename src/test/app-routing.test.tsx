import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("has dedicated pages for /setup and /admin", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    for (const path of ["/setup", "/admin"]) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId, path).not.toBe(rootRouteId);
    }
  });
});

// Security rules of the superadmin setup bootstrap, verified against the live
// database with an anonymous (unauthenticated) client:
// - the setup functions are not executable without a signed-in user;
// - no amount of guessing through them can grant roles anonymously.
describe("Superadmin setup bootstrap security", () => {
  const url = process.env["VITE_SUPABASE_URL"];
  const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  function anonClient() {
    return createClient(url!, key!, { auth: { persistSession: false } });
  }

  it("does not let an anonymous caller check setup status", async () => {
    const { error } = await anonClient().rpc("setup_pending");
    expect(error).toBeTruthy();
  });

  it("does not let an anonymous caller claim the superadmin role", async () => {
    const { data, error } = await anonClient().rpc("claim_superadmin", { p_code: "AAAAA-BBBBB-CCCCC" });
    expect(error).toBeTruthy();
    expect(data).toBeFalsy();
  });
});
