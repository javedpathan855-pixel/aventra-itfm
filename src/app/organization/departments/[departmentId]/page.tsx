import { redirect } from "next/navigation";
import { getDepartmentDetailAction, getViewerRoleAction } from "@/app/organization/actions";
import { DepartmentDetailView } from "@/features/organization/presentation/components/department-detail-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Department Details | Aventra ITFM",
  description: "View and manage an organization department.",
};

interface DepartmentDetailPageProps {
  params: Promise<{ departmentId: string }>;
}

/** Organization department detail (server-only composition). */
const DepartmentDetailPage = async ({ params }: DepartmentDetailPageProps) => {
  const { departmentId } = await params;
  const [detailResult, roleResult] = await Promise.all([
    getDepartmentDetailAction({ departmentId }),
    getViewerRoleAction(),
  ]);

  if (!detailResult.ok) {
    if (detailResult.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    if (detailResult.code === "NOT_FOUND" || detailResult.code === "FORBIDDEN") {
      redirect("/organization/departments");
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
      <DepartmentDetailView
        initialDepartment={detailResult.data.department}
        userRole={roleResult.data.role}
      />
    </main>
  );
};

export default DepartmentDetailPage;
