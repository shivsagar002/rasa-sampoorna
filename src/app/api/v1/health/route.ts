import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = `disconnected (${(err as Error).message})`;
  }

  return apiSuccess({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    database: dbStatus,
  });
}
