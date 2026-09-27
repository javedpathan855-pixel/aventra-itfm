// Organization address management use cases (application layer).

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { organizationAddressSchema } from "../../domain/schemas/organization.schema";
import type { UpdateProfileDeps } from "./update-organization-profile.use-case";
import type { OrganizationAddressEntity } from "../../domain/entities/organization-profile";

const addressIdParamSchema = z.object({
  addressId: z.string().min(1, "Address ID is required"),
});

export const executeListAddresses = async (
  _rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<{ addresses: OrganizationAddressEntity[] }> => {
  try {
    const context = await resolveAuthorizationContext({}, deps);
    requirePermission(context, "organization.read");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const addresses = await deps.organizationRepository.listAddresses(context.organizationId);
    return { addresses };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeCreateAddress = async (
  rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<{ address: OrganizationAddressEntity; addresses: OrganizationAddressEntity[] }> => {
  const parsed = organizationAddressSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({}, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const address = await deps.organizationRepository.createAddress(
      context.organizationId,
      parsed.data,
    );

    const addresses = await deps.organizationRepository.listAddresses(context.organizationId);

    await deps.auditLog?.record({
      type: "ORGANIZATION_ADDRESS_CHANGED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetResourceId: address.id,
      result: "allowed",
      metadata: { action: "create", type: address.type },
    });

    return { address, addresses };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeUpdateAddress = async (
  rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<{ address: OrganizationAddressEntity; addresses: OrganizationAddressEntity[] }> => {
  const parsed = organizationAddressSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  if (!parsed.data.id) {
    throw new AppError("VALIDATION_ERROR", { message: "Address ID is required for update." });
  }

  try {
    const context = await resolveAuthorizationContext({}, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const address = await deps.organizationRepository.updateAddress(
      context.organizationId,
      parsed.data.id,
      parsed.data,
    );

    const addresses = await deps.organizationRepository.listAddresses(context.organizationId);

    await deps.auditLog?.record({
      type: "ORGANIZATION_ADDRESS_CHANGED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetResourceId: address.id,
      result: "allowed",
      metadata: { action: "update", type: address.type },
    });

    return { address, addresses };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeDeleteAddress = async (
  rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<{ success: boolean; addresses: OrganizationAddressEntity[] }> => {
  const parsed = addressIdParamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({}, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    await deps.organizationRepository.deleteAddress(
      context.organizationId,
      parsed.data.addressId,
    );

    const addresses = await deps.organizationRepository.listAddresses(context.organizationId);

    await deps.auditLog?.record({
      type: "ORGANIZATION_ADDRESS_CHANGED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetResourceId: parsed.data.addressId,
      result: "allowed",
      metadata: { action: "delete" },
    });

    return { success: true, addresses };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeSetDefaultAddress = async (
  rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<{ address: OrganizationAddressEntity; addresses: OrganizationAddressEntity[] }> => {
  const parsed = addressIdParamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({}, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const address = await deps.organizationRepository.setDefaultAddress(
      context.organizationId,
      parsed.data.addressId,
    );

    const addresses = await deps.organizationRepository.listAddresses(context.organizationId);

    await deps.auditLog?.record({
      type: "ORGANIZATION_ADDRESS_CHANGED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetResourceId: parsed.data.addressId,
      result: "allowed",
      metadata: { action: "setDefault" },
    });

    return { address, addresses };
  } catch (error) {
    throw normalizeError(error);
  }
};
