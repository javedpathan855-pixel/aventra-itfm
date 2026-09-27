import { redirect } from "next/navigation";
import { getViewerRoleAction } from "@/app/organization/actions";
import { LocationCreateView } from "@/features/organization/presentation/components/location-create-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Location | Aventra ITFM",
  description: "Add a new operational location to your organization.",
};

/**
 * Organization location creation (server-only composition).
 * Only managers may open the form; the creation itself is authorized
 * server-side by `saveLocationAction`, so this gate is defense in depth
 * (UI visibility is not security).
 */
const NewLocationPage = async () => {
  const roleResult = await getViewerRoleAction();

  if (!roleResult.ok) {
    if (roleResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw new Error(roleResult.message);
  }

  if (roleResult.data.role !== "OWNER" && roleResult.data.role !== "ADMIN") {
    redirect("/organization/locations");
  }

  return (
    <main className="space-y-6">
      <LocationCreateView />
    </main>
  );
};

export default NewLocationPage;
