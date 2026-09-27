import { redirect } from "next/navigation";
import { getViewerRoleAction, listLocationsAction, listDepartmentsAction } from "@/app/organization/actions";
import {
  listAssetsAction,
  listCategoriesAction,
  listModelsAction,
} from "@/app/assets/actions";
import { AssetListView } from "@/features/asset/presentation/components/asset-list-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Asset Registry | Aventra ITFM",
  description: "Browse, search and manage your organization's assets.",
};

/**
 * Asset registry (server-only composition).
 * Initial rows plus filter lookups are fetched server-side; search,
 * filters, sorting and pagination run through tenant-scoped actions.
 */
const AssetsPage = async () => {
  const [listResult, roleResult, categoriesResult, modelsResult, locationsResult, departmentsResult] =
    await Promise.all([
      listAssetsAction({}),
      getViewerRoleAction(),
      listCategoriesAction({ status: "active", pageSize: 100 }),
      listModelsAction({ status: "active", pageSize: 100 }),
      listLocationsAction({ status: "active", pageSize: 100 }),
      listDepartmentsAction({ status: "active", pageSize: 100 }),
    ]);

  if (!listResult.ok) {
    if (listResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(listResult.message);
  }
  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }

  return (
    <main className="space-y-6">
      <AssetListView
        initialData={listResult.data}
        userRole={roleResult.data.role}
        categories={categoriesResult.ok ? categoriesResult.data.items : []}
        models={modelsResult.ok ? modelsResult.data.items : []}
        locations={locationsResult.ok ? locationsResult.data.items : []}
        departments={departmentsResult.ok ? departmentsResult.data.items : []}
      />
    </main>
  );
};

export default AssetsPage;
