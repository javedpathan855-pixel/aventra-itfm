import { redirect } from "next/navigation";
import {
  getViewerRoleAction,
  listDepartmentsAction,
  listLocationsAction,
} from "@/app/organization/actions";
import { listCategoriesAction } from "@/app/assets/actions";
import { AssetReportView } from "@/features/asset/presentation/components/asset-report-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Asset Reports | Aventra ITFM",
  description: "Inventory, warranty and assignment reports with CSV export.",
};

/**
 * Asset reports (server-only composition).
 * Readers need `asset.report.read`; the export button additionally
 * requires `asset.export`, enforced by its own action.
 */
const ReportsPage = async () => {
  const [roleResult, categoriesResult, locationsResult, departmentsResult] = await Promise.all([
    getViewerRoleAction(),
    listCategoriesAction({ status: "active", pageSize: 100 }),
    listLocationsAction({ status: "active", pageSize: 100 }),
    listDepartmentsAction({ status: "active", pageSize: 100 }),
  ]);

  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }
  const role = roleResult.data.role;
  if (role !== "OWNER" && role !== "ADMIN" && role !== "ENGINEER") {
    redirect("/assets");
  }

  return (
    <main className="space-y-6">
      <AssetReportView
        categories={categoriesResult.ok ? categoriesResult.data.items : []}
        locations={locationsResult.ok ? locationsResult.data.items : []}
        departments={departmentsResult.ok ? departmentsResult.data.items : []}
        canExport={role === "OWNER" || role === "ADMIN"}
      />
    </main>
  );
};

export default ReportsPage;
