import { redirect } from "next/navigation";
import { listDepartmentsAction, getViewerRoleAction } from "@/app/organization/actions";
import { DepartmentListView } from "@/features/organization/presentation/components/department-list-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Departments | Aventra ITFM",
  description: "Manage your organization's departments.",
};

/**
 * Organization departments listing (server-only composition).
 * Initial data is fetched server-side; search, filters, sorting, and
 * pagination run through server actions so all querying stays tenant-scoped.
 */
const DepartmentsPage = async () => {
  const [listResult, roleResult] = await Promise.all([
    listDepartmentsAction({}),
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
      <DepartmentListView initialData={listResult.data} userRole={roleResult.data.role} />
    </main>
  );
};

export default DepartmentsPage;
