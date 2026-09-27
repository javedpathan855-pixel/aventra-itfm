// Authorization repository port (contracts only — no Prisma, no SQL).
//
// Tenant-scoped persistence for membership, organization, and invitation
// reads/writes. Methods that mutate or read members take organizationId
// explicitly so tenant scoping is enforced at the persistence boundary in
// addition to the application boundary. Callers must supply the
// organizationId from a verified AuthorizationContext — never from raw
// client input.

interface MembershipRecord {
  id: string;
  userId: string;
  organizationId: string;
  /** Raw stored role; normalized to OrganizationRole at the domain boundary. */
  role: string;
}

interface MemberWithUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
}

interface InvitationRecord {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | null;
  inviterId: string;
}

interface CreatedInvitation {
  invitation: InvitationRecord;
  /**
   * Raw acceptance token, returned exactly once at creation for email
   * dispatch. Never persisted (only its hash is stored) and never logged.
   */
  token: string;
}

interface CreateInvitationInput {
  organizationId: string;
  email: string;
  /** Canonical organization role (never SUPERADMIN — enforced by type). */
  role: string;
  inviterId: string;
  expiresAt: Date;
}

interface AuthorizationRepository {
  /** Membership of a user in a specific organization, if any. */
  getMembership(userId: string, organizationId: string): Promise<MembershipRecord | null>;
  /** All memberships of a user (organization switcher foundation). */
  listMembershipsForUser(userId: string): Promise<MembershipRecord[]>;
  /** Members of one organization with user display data. */
  listMembersOfOrganization(organizationId: string): Promise<MemberWithUser[]>;
  /** Raw stored platform role (null = standard user). */
  getUserPlatformRole(userId: string): Promise<string | null>;
  getOrganizationById(organizationId: string): Promise<OrganizationRecord | null>;
  /**
   * Create a pending invitation scoped to an organization. The adapter
   * issues a cryptographic acceptance token, stores only its hash, and
   * returns the raw token once for email dispatch.
   */
  createInvitation(input: CreateInvitationInput): Promise<CreatedInvitation>;
  /** Pending invitation for an email inside an organization, if any. */
  findPendingInvitation(
    organizationId: string,
    email: string,
  ): Promise<InvitationRecord | null>;
  /**
   * Look up an invitation by raw acceptance token (hashed inside the
   * adapter). Returns null for unknown tokens — no existence signal.
   */
  findInvitationByToken(token: string): Promise<InvitationRecord | null>;
  /**
   * Atomically accept an invitation: re-checks pending status inside the
   * transaction, marks accepted, and creates the membership. Throws
   * NOT_FOUND when the row is no longer pending (replay-safe).
   */
  acceptInvitation(input: {
    invitationId: string;
    organizationId: string;
    userId: string;
    /** Validated canonical role from the invitation (checked by the caller). */
    role: string;
  }): Promise<MembershipRecord>;
  /** Cancel a pending invitation (org-scoped; no-op when absent). */
  cancelInvitation(input: { invitationId: string; organizationId: string }): Promise<void>;
  /** Set a member's role (org-scoped; throws NOT_FOUND when absent). */
  updateMemberRole(input: {
    memberId: string;
    organizationId: string;
    role: string;
  }): Promise<MembershipRecord>;
  /** Remove a member (org-scoped; no-op when absent). */
  removeMember(input: { memberId: string; organizationId: string }): Promise<void>;
}

export type {
  AuthorizationRepository,
  MembershipRecord,
  MemberWithUser,
  OrganizationRecord,
  InvitationRecord,
  CreatedInvitation,
  CreateInvitationInput,
};
