import { NextResponse, type NextRequest } from "next/server";
import { getSearchSuggestions } from "@/features/catalog/queries";

const EMPTY = { products: [], categories: [], brands: [] };

/** Sugerencias del buscador del encabezado. Respuesta pública y cacheada. */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  if (query.length < 2) return NextResponse.json(EMPTY);

  try {
    const suggestions = await getSearchSuggestions(query);
    return NextResponse.json(suggestions, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(EMPTY, { status: 503 });
  }
}
