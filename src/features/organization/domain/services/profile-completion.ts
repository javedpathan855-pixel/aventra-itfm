// Profile completion evaluation service (domain layer — framework-independent).

import type { OrganizationProfileEntity, ProfileChecklistItem, ProfileCompletionResult } from "../entities/organization-profile";

/**
 * Calculates a deterministic, weighted completion score and actionable
 * checklist for an organization profile without arbitrarily penalizing optional fields.
 */
export const calculateProfileCompletion = (
  profile: Pick<
    OrganizationProfileEntity,
    | "name"
    | "businessType"
    | "description"
    | "establishedDate"
    | "contactEmail"
    | "phone"
    | "website"
    | "logo"
    | "gstin"
    | "pan"
    | "addresses"
  >,
): ProfileCompletionResult => {
  const hasBasicInfo = Boolean(
    profile.name?.trim() &&
    profile.businessType?.trim() &&
    profile.description?.trim(),
  );

  const hasContactInfo = Boolean(
    profile.contactEmail?.trim() || profile.phone?.trim(),
  );

  const hasAddress = Array.isArray(profile.addresses) && profile.addresses.length > 0;

  const hasTaxInfo = Boolean(profile.gstin?.trim() || profile.pan?.trim());

  const hasBranding = Boolean(profile.logo && profile.logo.trim().length > 0);

  const checklist: ProfileChecklistItem[] = [
    {
      key: "basic_info",
      label: "Basic Profile",
      description: "Organization type, description, and founding details.",
      completed: hasBasicInfo,
      weight: 25,
    },
    {
      key: "contact_info",
      label: "Contact & Online Presence",
      description: "Official contact email, phone, or corporate website.",
      completed: hasContactInfo,
      weight: 20,
    },
    {
      key: "address",
      label: "Official Address",
      description: "At least one registered or operational office address.",
      completed: hasAddress,
      weight: 25,
    },
    {
      key: "legal_tax",
      label: "Legal & Tax Details",
      description: "GSTIN or PAN business registration credentials.",
      completed: hasTaxInfo,
      weight: 15,
    },
    {
      key: "branding",
      label: "Corporate Branding",
      description: "High-resolution corporate logo for documents and portal.",
      completed: hasBranding,
      weight: 15,
    },
  ];

  const score = checklist.reduce((acc, item) => (item.completed ? acc + item.weight : acc), 0);

  const level: ProfileCompletionResult["level"] =
    score >= 80 ? "complete" : score >= 40 ? "in_progress" : "incomplete";

  return {
    score,
    level,
    checklist,
  };
};
