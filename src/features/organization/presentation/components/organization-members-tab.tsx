"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { toast } from "@/shared/components/ui/toast";
import {
  listOrganizationMembersAction,
  inviteOrganizationMemberAction,
  updateOrganizationMemberRoleAction,
  removeOrganizationMemberAction,
} from "@/app/organization/actions";
import { invitationSchema, type InvitationFormData } from "@/features/auth/domain/schemas/auth.schema";

interface MemberItem {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface OrganizationMembersTabProps {
  currentRole: string;
}

export const OrganizationMembersTab = ({ currentRole }: OrganizationMembersTabProps) => {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selected member to edit role
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const canManageMembers = currentRole === "OWNER" || currentRole === "ADMIN";

  const inviteForm = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "USER" as const,
    },
    mode: "onTouched",
  });

  const loadMembers = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await listOrganizationMembersAction();
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setMembers(result.data.members);
  };

  useEffect(() => {
    let isMounted = true;
    listOrganizationMembersAction().then((result) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (result.ok) {
        setMembers(result.data.members);
      } else {
        setErrorMessage(result.message);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInvite = inviteForm.handleSubmit(async (values) => {
    setErrorMessage(null);

    const result = await inviteOrganizationMemberAction(values);

    if (!result.ok) {
      toast.error("Invitation Failed", { description: result.message });
      return;
    }

    toast.success("Invitation Sent", {
      description: `Invitation successfully dispatched to ${values.email}.`,
    });

    inviteForm.reset({ email: "", role: "USER" });
    setIsInviteOpen(false);
    loadMembers();
  });

  const handleUpdateRole = async (memberId: string, role: string) => {
    if (!role) return;

    startTransition(async () => {
      const result = await updateOrganizationMemberRoleAction({ memberId, role });

      if (!result.ok) {
        toast.error("Role Update Failed", { description: result.message });
        return;
      }

      toast.success("Role Updated", {
        description: `Member role updated to ${role}.`,
      });

      setEditingMember(null);
      loadMembers();
    });
  };

  const handleRemoveMember = async (member: MemberItem) => {
    if (member.role === "OWNER") {
      toast.error("Action Prohibited", {
        description: "Organization Owner cannot be removed from this interface.",
      });
      return;
    }

    if (!confirm(`Are you sure you want to remove ${member.name || member.email} from the organization?`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeOrganizationMemberAction({ memberId: member.memberId });

      if (!result.ok) {
        toast.error("Removal Failed", { description: result.message });
        return;
      }

      toast.success("Member Removed", {
        description: `${member.name || member.email} has been removed from the organization.`,
      });

      loadMembers();
    });
  };

  const getRoleBadgeVariant = (role: string): "primary" | "secondary" | "default" => {
    switch (role) {
      case "OWNER":
        return "primary";
      case "ADMIN":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">Organization Members</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-muted border border-border">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>
            <p className="text-sm text-muted mt-1">
              Manage team members, roles, and collaborative permissions across your organization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMembers}
              disabled={isLoading || isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canManageMembers && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Invite Member
              </Button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-md bg-error/10 border border-error/30 text-error text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Invite Dialog Modal */}
        {isInviteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-member-title"
          >
            <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 id="invite-member-title" className="text-base font-semibold text-foreground">
                  Invite New Member
                </h3>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded p-1 text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Form {...inviteForm}>
                <form onSubmit={handleInvite} className="space-y-4">
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="colleague@company.com"
                            type="email"
                            disabled={inviteForm.formState.isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Role</FormLabel>
                        <FormControl>
                          <select
                            className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={inviteForm.formState.isSubmitting}
                            {...field}
                          >
                            <option value="USER">USER (Standard Member)</option>
                            <option value="ENGINEER">ENGINEER (Technical Operator)</option>
                            {currentRole === "OWNER" && (
                              <option value="ADMIN">ADMIN (Organization Administrator)</option>
                            )}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsInviteOpen(false)}
                      disabled={inviteForm.formState.isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={inviteForm.formState.isSubmitting}
                    >
                      {inviteForm.formState.isSubmitting ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* Member List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted">
              <RefreshCw className="h-6 w-6 animate-spin text-muted/60 mb-2" />
              <p className="text-sm">Loading organization members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <Users className="h-10 w-10 mx-auto text-muted/40 mb-2" />
              <p className="text-sm font-medium text-foreground">No members found</p>
              <p className="text-xs text-muted mt-1">
                You are currently the sole member of this organization.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {members.map((member) => (
                <div
                  key={member.memberId}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card hover:bg-surface-elevated/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} email={member.email} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {member.name || "Unnamed Member"}
                        </span>
                        <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Role changer modal/inline */}
                    {editingMember?.memberId === member.memberId ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          className="h-8 rounded border border-input-border bg-input-background px-2 text-xs text-foreground"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                        >
                          <option value="USER">USER</option>
                          <option value="ENGINEER">ENGINEER</option>
                          {currentRole === "OWNER" && <option value="ADMIN">ADMIN</option>}
                        </select>
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-8 px-2"
                          onClick={() => handleUpdateRole(member.memberId, newRole)}
                          disabled={isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => setEditingMember(null)}
                          disabled={isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      canManageMembers &&
                      member.role !== "OWNER" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              setEditingMember(member);
                              setNewRole(member.role);
                            }}
                            disabled={isPending}
                          >
                            Change Role
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 text-error border-error/30 hover:bg-error/10 hover:border-error/50"
                            onClick={() => handleRemoveMember(member)}
                            disabled={isPending}
                            title="Remove Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )
                    )}

                    {member.role === "OWNER" && (
                      <span className="text-[11px] text-muted flex items-center gap-1 px-2 py-1 rounded bg-surface-elevated border border-border">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Sole Primary Owner
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
