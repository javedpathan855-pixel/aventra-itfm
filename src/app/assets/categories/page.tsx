import { redirect } from "next/navigation";
import { getViewerRoleAction } from "@/app/organization/actions";
import { listCategoriesAction, listModelsAction } from "@/app/assets/actions";
import { AssetTaxonomyView } from "@/features/asset/presentation/components/asset-taxonomy-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories & Models | Aventra ITFM",
  description: "Manage asset categories and models.",
};

/**
 * Asset taxonomy (server-only composition).
 * Categories and models load server-side; search and mutations run
 * through tenant-scoped actions.
 */
const CategoriesPage = async () => {
  const [categoriesResult, modelsResult, roleResult] = await Promise.all([
    listCategoriesAction({}),
    listModelsAction({}),
    getViewerRoleAction(),
  ]);

  if (!categoriesResult.ok) {
    if (categoriesResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(categoriesResult.message);
  }
  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }

  return (
    <main className="space-y-6">
      <AssetTaxonomyView
        initialCategories={categoriesResult.data}
        initialModels={modelsResult.ok ? modelsResult.data : { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }}
        userRole={roleResult.data.role}
      />
    </main>
  );
};

export default CategoriesPage;
