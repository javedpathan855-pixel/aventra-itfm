import { redirect } from "next/navigation";
import { listLocationsAction, getViewerRoleAction } from "@/app/organization/actions";
import { LocationListView } from "@/features/organization/presentation/components/location-list-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Locations | Aventra ITFM",
  description: "Manage your organization's operational locations.",
};

/**
 * Organization locations listing (server-only composition).
 * Initial data is fetched server-side; search, filters, sorting, and
 * pagination run through server actions so all querying stays tenant-scoped.
 */
const LocationsPage = async () => {
  const [listResult, roleResult] = await Promise.all([
    listLocationsAction({}),
    getViewerRoleAction(),
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
      <LocationListView initialData={listResult.data} userRole={roleResult.data.role} />
    </main>
  );
};

export default LocationsPage;
