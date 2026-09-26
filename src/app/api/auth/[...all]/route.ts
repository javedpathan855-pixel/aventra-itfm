import { getAuth } from "@/features/auth/infrastructure/auth/auth";

export const dynamic = "force-dynamic";

const handler = async (request: Request) => {
  const auth = getAuth();
  return auth.handler(request);
};

export { handler as GET, handler as POST };
