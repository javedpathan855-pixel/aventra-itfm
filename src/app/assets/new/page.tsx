import { redirect } from "next/navigation";
import {
  getOrganizationProfileAction,
  getViewerRoleAction,
  listDepartmentsAction,
  listLocationsAction,
} from "@/app/organization/actions";
import { listCategoriesAction } from "@/app/assets/actions";
import { AssetFormView } from "@/features/asset/presentation/components/asset-form-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Asset | Aventra ITFM",
  description: "Register a new asset in your organization.",
};

/**
 * Asset creation (server-only composition).
 * Only managers may open the form; creation is authorized server-side.
 * Models load per selected category on the client; currency defaults
 * to the organization's configured currency.
 */
const NewAssetPage = async () => {
  const [roleResult, categoriesResult, locationsResult, departmentsResult, profileResult] =
    await Promise.all([
      getViewerRoleAction(),
      listCategoriesAction({ status: "active", pageSize: 100 }),
      listLocationsAction({ status: "active", pageSize: 100 }),
      listDepartmentsAction({ status: "active", pageSize: 100 }),
      getOrganizationProfileAction(),
    ]);

  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }
  if (roleResult.data.role !== "OWNER" && roleResult.data.role !== "ADMIN") {
    redirect("/assets");
  }

  return (
    <main className="space-y-6">
      <AssetFormView
        mode="create"
        categories={categoriesResult.ok ? categoriesResult.data.items : []}
        initialModels={[]}
        locations={locationsResult.ok ? locationsResult.data.items : []}
        departments={departmentsResult.ok ? departmentsResult.data.items : []}
        defaultCurrency={profileResult.ok ? (profileResult.data.profile.settings?.currency ?? "INR") : "INR"}
        cancelHref="/assets"
        backLabel="Back to registry"
        backHref="/assets"
        title="Add Asset"
        subtitle="Register a new asset in your organization"
        submitLabel="Create Asset"
        submittingLabel="Creating..."
        successTitle="Asset created"
      />
    </main>
  );
};

export default NewAssetPage;
