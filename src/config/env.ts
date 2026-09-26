import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_URL: z
    .string()
    .min(1, "BETTER_AUTH_URL is required")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "BETTER_AUTH_URL must be a valid http(s) URL"),
  BETTER_AUTH_SECRET: z
    .string("BETTER_AUTH_SECRET is required")
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().min(1, "RESEND_FROM_EMAIL is required"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cached: AppEnv | null = null;

/**
 * Read and validate the server environment once. Throws a non-secret
 * diagnostic naming only the missing variable when invalid.
 */
const getEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => {
  if (cached && source === process.env) {
    return cached;
  }

  const result = EnvSchema.safeParse({
    DATABASE_URL: source.DATABASE_URL,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    RESEND_API_KEY: source.RESEND_API_KEY,
    RESEND_FROM_EMAIL: source.RESEND_FROM_EMAIL,
  });

  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Invalid server environment: ${missing.join(", ")}. See .env.example.`,
    );
  }

  if (source === process.env) {
    cached = result.data;
  }

  return result.data;
};

/** Test seam: reset the memoized environment between tests. */
const resetEnvCache = () => {
  cached = null;
};

export { getEnv, resetEnvCache };
