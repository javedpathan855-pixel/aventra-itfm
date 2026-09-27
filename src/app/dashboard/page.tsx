import { redirect } from "next/navigation";
import { Building2, Check, Shield } from "lucide-react";
import { AppError } from "@/shared/error/app-error";
import { isOrganizationMember } from "@/features/auth/domain/authorization/authorization-context";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  formatRoleLabel,
  getRoleBadgeVariant,
} from "@/features/dashboard/presentation/utils/role-formatter";
import { switchOrganizationFormAction } from "./actions";
import { getDashboardServerContext } from "./loaders";

export const dynamic = "force-dynamic";

/**
 * Protected dashboard home (server-only).
 * Displays a clean workspace overview without speculative modules or fake metrics.
 * Data is resolved via cached server context to prevent duplicate queries.
 */
const DashboardPage = async () => {
  let serverData;
  try {
    serverData = await getDashboardServerContext();
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw error;
  }

  const { context, organizations } = serverData;

  if (!isOrganizationMember(context) || !context.organization) {
    return (
      <section aria-label="Select organization" className="flex flex-col gap-6 max-w-2xl">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Select an Organization
          </h1>
          <p className="text-sm text-muted">
            Your account is not scoped to an active organization yet. Choose a workspace below to continue.
          </p>
        </div>

        {organizations.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            No organization memberships found. Contact your administrator for access.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {organizations.map((org) => (
              <Card
                key={org.organizationId}
                className="flex items-center justify-between gap-4 p-4 hover:border-border-strong transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted border border-border-subtle text-primary">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{org.name}</span>
                    <span className="text-xs text-muted">
                      Role: {formatRoleLabel(org.role)}
                    </span>
                  </div>
                </div>

                <form
                  action={switchOrganizationFormAction.bind(null, {
                    organizationId: org.organizationId,
                  })}
                >
                  <Button type="submit" variant="primary" size="sm">
                    Select
                  </Button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </section>
    );
  }

  const roleLabel = formatRoleLabel(context.organizationRole);

  return (
    <section aria-label="Workspace overview" className="flex flex-col gap-6 max-w-3xl">
      {/* Workspace Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {context.organization.name}
          </h1>
          <Badge variant={getRoleBadgeVariant(context.organizationRole)} size="md">
            {roleLabel}
          </Badge>
          {context.platformRole === "SUPERADMIN" && (
            <Badge variant="primary" size="md" className="gap-1">
              <Shield className="h-3 w-3" aria-hidden="true" />
              <span>Super Admin</span>
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Welcome to your IT facility management workspace. You are signed in as{" "}
          <span className="text-foreground font-medium">{context.email}</span> with{" "}
          <span className="text-foreground font-medium">{roleLabel}</span> permissions.
        </p>
      </div>

      {/* Workspace Status Card */}
      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-muted text-primary">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Active Workspace</h2>
              <p className="text-xs text-muted">Current operational context</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Connected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-md border border-border-subtle bg-surface p-3">
            <span className="text-muted block mb-1">Organization Name</span>
            <span className="font-semibold text-foreground text-sm">
              {context.organization.name}
            </span>
          </div>
          <div className="rounded-md border border-border-subtle bg-surface p-3">
            <span className="text-muted block mb-1">Assigned Role</span>
            <span className="font-semibold text-foreground text-sm">
              {roleLabel}
            </span>
          </div>
        </div>
      </Card>

      {/* Available Organizations */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Your Workspaces</h2>
          <span className="text-xs text-muted">
            {organizations.length} {organizations.length === 1 ? "organization" : "organizations"}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {organizations.map((org) => {
            const isCurrent = org.active;
            const orgRole = formatRoleLabel(org.role);

            return (
              <div
                key={org.organizationId}
                className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-muted text-muted">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{org.name}</span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted">{orgRole}</span>
                  </div>
                </div>

                {!isCurrent && (
                  <form
                    action={switchOrganizationFormAction.bind(null, {
                      organizationId: org.organizationId,
                    })}
                  >
                    <Button type="submit" variant="secondary" size="xs">
                      Switch
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
