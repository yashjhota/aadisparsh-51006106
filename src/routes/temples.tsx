import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for /temples and /temples/$slug — the list page itself lives in
// temples.index.tsx so the detail route can render through this <Outlet />.
export const Route = createFileRoute("/temples")({
  component: () => <Outlet />,
});
