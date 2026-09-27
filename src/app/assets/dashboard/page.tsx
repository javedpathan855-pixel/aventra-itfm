import { redirect } from "next/navigation";
import { getViewerRoleAction } from "@/app/organization/actions";
import { getAssetDashboardAction } from "@/app/assets/actions";
import { AssetDashboardView } from "@/features/asset/presentation/components/asset-dashboard-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Asset Dashboard | Aventra ITFM",
  description: "Organization asset overview, KPIs and recent activity.",
};

/** Asset dashboard (server-only composition). */
const AssetDashboardPage = async () => {
  const [dashboardResult, roleResult] = await Promise.all([
    getAssetDashboardAction(),
    getViewerRoleAction(),
  ]);

  if (!dashboardResult.ok) {
    if (dashboardResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(dashboardResult.message);
  }
  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }

  return (
    <main className="space-y-6">
      <AssetDashboardView metrics={dashboardResult.data.metrics} userRole={roleResult.data.role} />
    </main>
  );
};

export default AssetDashboardPage;
