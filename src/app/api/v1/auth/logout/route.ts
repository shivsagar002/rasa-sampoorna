import { NextRequest } from "next/server";
import { removeSessionCookie } from "@/lib/security/session";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function POST(_req: NextRequest) {
  try {
    await removeSessionCookie();
    return apiSuccess(null, "Logged out successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
