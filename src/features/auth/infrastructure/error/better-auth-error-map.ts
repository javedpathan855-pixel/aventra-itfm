// Better Auth error adapter (server-side).
//
// Reads raw Better Auth / better-call failure shapes without importing the
// provider SDK (duck-typed on `body.code` / `code`), maps them through the
// domain taxonomy (domain/error/auth-error.ts), and builds safe AppErrors.
// `cause` stays server-side and is never serialized to clients.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { mapProviderCodeToAppCode } from "../../domain/error/auth-error";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Read a Better Auth / better-call APIError code without importing it. */
const readBetterAuthCode = (error: unknown): string | null => {
  if (!isRecord(error)) return null;
  const body = error.body;
  if (isRecord(body) && typeof body.code === "string") return body.code;
  if (typeof error.code === "string") return error.code;
  return null;
};

/**
 * Map a Better Auth failure to a safe AppError (null when unrecognized so
 * callers fall through to Prisma/generic handling).
 */
const fromBetterAuthError = (error: unknown): AppError | null => {
  const rawCode = readBetterAuthCode(error);
  const mapped = mapProviderCodeToAppCode(rawCode);
  if (!mapped) return null;
  return new AppError(mapped, { cause: error });
};

/**
 * Auth-aware normalizer: Better Auth map first, then shared
 * (Prisma → generic). Use this — not shared normalizeError — for all
 * auth provider call sites.
 */
const normalizeAuthError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  return fromBetterAuthError(error) ?? normalizeError(error);
};

export { fromBetterAuthError, normalizeAuthError, readBetterAuthCode };
