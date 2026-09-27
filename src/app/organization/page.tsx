import { redirect } from "next/navigation";
import { AppError } from "@/shared/error/app-error";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { prismaOrganizationRepository } from "@/features/organization/infrastructure/prisma/prisma-organization-repository";
import { defaultLogoStorageService } from "@/features/organization/infrastructure/storage/logo-storage-service";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { transactionalMailer } from "@/features/auth/infrastructure/email/mailer";
import { executeGetOrganizationProfile } from "@/features/organization/application/use-cases/get-organization-profile.use-case";
import { OrganizationManagementView } from "@/features/organization/presentation/components/organization-management-view";

export const metadata = {
  title: "Organization Management | Aventra ITFM",
  description: "Manage your organization profile, legal identifiers, addresses, and team roles.",
};

const OrganizationPage = async () => {
  const deps = {
    getSession: () => betterAuthProvider.getSession(),
    authorizationRepository: prismaAuthorizationRepository,
    organizationRepository: prismaOrganizationRepository,
    logoStorageService: defaultLogoStorageService,
    auditLog: auditLogger,
    mailer: transactionalMailer,
  };

  let data;
  try {
    data = await executeGetOrganizationProfile({ autoSelectDefault: true }, deps);
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw error;
  }

  return (
    <main className="space-y-6">
      <OrganizationManagementView
        initialProfile={data.profile}
        initialCompletion={data.completion}
        userRole={data.role}
      />
    </main>
  );
};

export default OrganizationPage;
