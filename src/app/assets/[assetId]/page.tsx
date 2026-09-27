import { redirect } from "next/navigation";
import {
  getViewerRoleAction,
  listDepartmentsAction,
  listLocationsAction,
} from "@/app/organization/actions";
import { getAssetDetailAction, listAssetEmployeesAction } from "@/app/assets/actions";
import { AssetDetailView } from "@/features/asset/presentation/components/asset-detail-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Asset Details | Aventra ITFM",
  description: "View asset details, assignment and history.",
};

interface AssetDetailPageProps {
  params: Promise<{ assetId: string }>;
}

/** Asset detail (server-only composition). */
const AssetDetailPage = async ({ params }: AssetDetailPageProps) => {
  const { assetId } = await params;
  const [detailResult, roleResult] = await Promise.all([
    getAssetDetailAction({ assetId }),
    getViewerRoleAction(),
  ]);

  if (!detailResult.ok) {
    if (detailResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    if (detailResult.code === "NOT_FOUND" || detailResult.code === "FORBIDDEN") {
      redirect("/assets");
    }
    throw new Error(detailResult.message);
  }
  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }

  const role = roleResult.data.role;
  const canAssign = role === "OWNER" || role === "ADMIN" || role === "ENGINEER";
  const [employeesResult, locationsResult, departmentsResult] = await Promise.all([
    canAssign ? listAssetEmployeesAction() : Promise.resolve(null),
    listLocationsAction({ status: "active", pageSize: 100 }),
    listDepartmentsAction({ status: "active", pageSize: 100 }),
  ]);

  return (
    <main className="space-y-6">
      <AssetDetailView
        initialAsset={detailResult.data.asset}
        userRole={role}
        employees={employeesResult?.ok ? employeesResult.data.employees : []}
        locations={locationsResult.ok ? locationsResult.data.items : []}
        departments={departmentsResult.ok ? departmentsResult.data.items : []}
      />
    </main>
  );
};

export default AssetDetailPage;
