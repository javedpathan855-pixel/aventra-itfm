import { redirect } from "next/navigation";
import { getLocationDetailAction, getViewerRoleAction } from "@/app/organization/actions";
import { LocationDetailView } from "@/features/organization/presentation/components/location-detail-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Location Details | Aventra ITFM",
  description: "View and manage an organization location.",
};

interface LocationDetailPageProps {
  params: Promise<{ locationId: string }>;
}

/** Organization location detail (server-only composition). */
const LocationDetailPage = async ({ params }: LocationDetailPageProps) => {
  const { locationId } = await params;
  const [detailResult, roleResult] = await Promise.all([
    getLocationDetailAction({ locationId }),
    getViewerRoleAction(),
  ]);

  if (!detailResult.ok) {
    if (detailResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    if (detailResult.code === "NOT_FOUND" || detailResult.code === "FORBIDDEN") {
      redirect("/organization/locations");
    }
    throw new Error(detailResult.message);
  }
  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }

  return (
    <main className="space-y-6">
      <LocationDetailView
        initialLocation={detailResult.data.location}
        userRole={roleResult.data.role}
      />
    </main>
  );
};

export default LocationDetailPage;
