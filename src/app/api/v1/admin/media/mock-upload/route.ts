import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  // Mock endpoint for dev environments to acknowledge image upload
  return NextResponse.json({
    success: true,
    message: "Image uploaded successfully (local mock store).",
  });
}
