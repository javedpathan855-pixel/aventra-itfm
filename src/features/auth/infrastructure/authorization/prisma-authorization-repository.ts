// Prisma authorization repository (infrastructure — server-only).
//
// Implements the authorization port with whitelisted selects. All member
// reads/writes are organization-scoped (memberId + organizationId), so a
// caller cannot address another tenant's rows even if identifiers leak.
// Invitation ids use randomUUID (server-generated, unguessable).

import { randomUUID } from "node:crypto";

import { getPrisma } from "@/shared/infrastructure/prisma";
import { AppError } from "@/shared/error/app-error";
import { hashInvitationToken, issueInvitationToken } from "./invitation-token";
import type {
  AuthorizationRepository,
  CreateInvitationInput,
  CreatedInvitation,
  MembershipRecord,
  MemberWithUser,
  OrganizationRecord,
} from "../../repository/authorization-repository";

const toMembership = (row: {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
}): MembershipRecord => ({
  id: row.id,
  userId: row.userId,
  organizationId: row.organizationId,
  role: row.role,
});

const prismaAuthorizationRepository: AuthorizationRepository = {
  getMembership: async (userId, organizationId) => {
    const row = await getPrisma().member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true, userId: true, organizationId: true, role: true },
    });
    return row ? toMembership(row) : null;
  },

  listMembershipsForUser: async (userId) => {
    const rows = await getPrisma().member.findMany({
      where: { userId },
      select: { id: true, userId: true, organizationId: true, role: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toMembership);
  },

  listMembersOfOrganization: async (organizationId): Promise<MemberWithUser[]> => {
    const rows = await getPrisma().member.findMany({
      where: { organizationId },
      select: {
        id: true,
        userId: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
    }));
  },

  getUserPlatformRole: async (userId) => {
    const row = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { platformRole: true },
    });
    return row?.platformRole ?? null;
  },

  getOrganizationById: async (organizationId): Promise<OrganizationRecord | null> => {
    const row = await getPrisma().organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });
    return row ? { id: row.id, name: row.name, slug: row.slug } : null;
  },

  createInvitation: async (input: CreateInvitationInput): Promise<CreatedInvitation> => {
    const issued = issueInvitationToken();
    const row = await getPrisma().invitation.create({
      data: {
        id: randomUUID(),
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        status: "pending",
        expiresAt: input.expiresAt,
        inviterId: input.inviterId,
        tokenHash: issued.tokenHash,
      },
      select: {
        id: true,
        organizationId: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        inviterId: true,
      },
    });
    return { invitation: row, token: issued.token };
  },

  findPendingInvitation: async (organizationId, email) => {
    const row = await getPrisma().invitation.findFirst({
      where: { organizationId, email, status: "pending" },
      select: {
        id: true,
        organizationId: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        inviterId: true,
      },
    });
    return row;
  },

  findInvitationByToken: async (token) => {
    if (typeof token !== "string" || token.length === 0) return null;
    const row = await getPrisma().invitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      select: {
        id: true,
        organizationId: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        inviterId: true,
      },
    });
    return row;
  },

  acceptInvitation: async (input) => {
    // Atomic accept: the pending-status re-check, status flip, and member
    // creation happen in one transaction — concurrent accepts cannot
    // double-create memberships or resurrect settled invitations.
    return getPrisma().$transaction(async (tx) => {
      const pending = await tx.invitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
          status: "pending",
        },
        select: { id: true, role: true },
      });
      if (!pending) {
        throw new AppError("NOT_FOUND", { message: "The invitation is no longer available." });
      }
      await tx.invitation.update({
        where: { id: pending.id },
        data: { status: "accepted" },
      });
      const member = await tx.member.upsert({
        where: {
          organizationId_userId: { organizationId: input.organizationId, userId: input.userId },
        },
        update: {},
        create: {
          id: randomUUID(),
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.role,
        },
        select: { id: true, userId: true, organizationId: true, role: true },
      });
      return toMembership(member);
    });
  },

  cancelInvitation: async (input) => {
    // Status flip (not delete): preserves the audit trail and honors the
    // pending → cancelled lifecycle. No-op when absent or already settled.
    await getPrisma().invitation.updateMany({
      where: { id: input.invitationId, organizationId: input.organizationId, status: "pending" },
      data: { status: "cancelled" },
    });
  },

  updateMemberRole: async (input): Promise<MembershipRecord> => {
    // Scoped existence check first: the update itself keys by id only,
    // so tenant scoping is enforced here (a cross-tenant id reads as
    // NOT_FOUND, never as another tenant's row).
    const scoped = await getPrisma().member.findFirst({
      where: { id: input.memberId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!scoped) {
      throw new AppError("NOT_FOUND", { message: "The requested member was not found." });
    }
    const row = await getPrisma().member.update({
      where: { id: scoped.id },
      data: { role: input.role },
      select: { id: true, userId: true, organizationId: true, role: true },
    });
    return toMembership(row);
  },

  removeMember: async (input) => {
    await getPrisma().member.deleteMany({
      where: { id: input.memberId, organizationId: input.organizationId },
    });
  },
};

export { prismaAuthorizationRepository };
