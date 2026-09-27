import { redirect } from "next/navigation";
import {
  getOrganizationProfileAction,
  getViewerRoleAction,
  listDepartmentsAction,
  listLocationsAction,
} from "@/app/organization/actions";
import { getAssetDetailAction, listCategoriesAction, listModelsAction } from "@/app/assets/actions";
import { AssetFormView } from "@/features/asset/presentation/components/asset-form-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Asset | Aventra ITFM",
  description: "Update an existing asset.",
};

interface EditAssetPageProps {
  params: Promise<{ assetId: string }>;
}

/** Asset editing (server-only composition). Managers only. */
const EditAssetPage = async ({ params }: EditAssetPageProps) => {
  const { assetId } = await params;
  const [detailResult, roleResult] = await Promise.all([
    getAssetDetailAction({ assetId }),
    getViewerRoleAction(),
  ]);

  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }
  if (roleResult.data.role !== "OWNER" && roleResult.data.role !== "ADMIN") {
    redirect(`/assets/${assetId}`);
  }
  if (!detailResult.ok) {
    if (detailResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    if (detailResult.code === "NOT_FOUND" || detailResult.code === "FORBIDDEN") {
      redirect("/assets");
    }
    throw new Error(detailResult.message);
  }

  const asset = detailResult.data.asset;
  const [categoriesResult, modelsResult, locationsResult, departmentsResult, profileResult] =
    await Promise.all([
      listCategoriesAction({ status: "active", pageSize: 100 }),
      listModelsAction({ categoryId: asset.categoryId, status: "active", pageSize: 100 }),
      listLocationsAction({ pageSize: 100 }),
      listDepartmentsAction({ pageSize: 100 }),
      getOrganizationProfileAction(),
    ]);

  return (
    <main className="space-y-6">
      <AssetFormView
        mode="edit"
        initialAsset={asset}
        categories={categoriesResult.ok ? categoriesResult.data.items : []}
        initialModels={modelsResult.ok ? modelsResult.data.items : []}
        locations={locationsResult.ok ? locationsResult.data.items : []}
        departments={departmentsResult.ok ? departmentsResult.data.items : []}
        defaultCurrency={profileResult.ok ? (profileResult.data.profile.settings?.currency ?? "INR") : "INR"}
        cancelHref={`/assets/${asset.id}`}
        backLabel="Back to asset"
        backHref={`/assets/${asset.id}`}
        title="Edit Asset"
        subtitle={`${asset.name} · ${asset.assetTag}`}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
        successTitle="Asset updated"
      />
    </main>
  );
};

export default EditAssetPage;
