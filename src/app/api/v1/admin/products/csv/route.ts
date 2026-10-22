import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { catalogService } from "@/modules/catalog/catalog.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const csvData = await catalogService.exportCsv();

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rasa-products-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
    const text = await req.text();

    if (!text || text.trim().length === 0) {
      throw new BadRequestError("CSV content is empty.");
    }

    const result = await catalogService.importCsv(text);
    return apiSuccess(result, `Imported ${result.importedCount} products successfully.`);
  } catch (error) {
    return handleApiError(error);
  }
}
