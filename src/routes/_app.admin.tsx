import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";

type UserWithRoles = { app_metadata?: { roles?: Array<string | null> } } | null;

function getRolesFromUser(user: UserWithRoles) {
  const roles = user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles.map(String) : [];
}

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async ({ location }) => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) throw redirect({ to: "/login" });

    const jwtRoles = getRolesFromUser(userData.user);
    let isAdmin = jwtRoles.includes("admin");
    let isAdvisor = jwtRoles.includes("advisor");

    if (!isAdmin && !isAdvisor) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      isAdmin = !!roles?.some((r) => String(r.role) === "admin");
      isAdvisor = !!roles?.some((r) => String(r.role) === "advisor");
    }

    if (!isAdmin && !isAdvisor) {
      throw redirect({ to: "/community" });
    }
    if (location.pathname === "/admin") {
      throw redirect({ to: isAdmin ? "/admin/users" : "/admin/holdings" });
    }
    // Admin can access: users, prices (market data), transactions
    // Advisor can access: holdings, user-portfolios, insight, insight-ai, broadcast
    const adminOnly = [
      "/admin/users",
      "/admin/prices",
      "/admin/transactions",
      "/admin/audit",
      "/admin/security",
      "/admin/settings",
    ];
    const advisorOnly = [
      "/admin/holdings",
      "/admin/user-portfolios",
      "/admin/insight",
      "/admin/insight-ai",
      "/admin/broadcast",
    ];
    const isAdminPath = adminOnly.some((p) => location.pathname.startsWith(p));
    const isAdvisorPath = advisorOnly.some((p) => location.pathname.startsWith(p));
    if (isAdminPath && !isAdmin) {
      throw redirect({ to: "/admin/holdings" });
    }
    if (isAdvisorPath && !isAdvisor) {
      throw redirect({ to: "/admin/users" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const auth = useAuth();
  const navigate = Route.useNavigate();
  // SEC-04: redirect instead of rendering null to avoid flash of admin shell
  if (!auth.isLoading && !auth.isAdmin && !auth.isAdvisor) {
    navigate({ to: "/community" });
    return null;
  }
  if (auth.isLoading) return null;
  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
}
