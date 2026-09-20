import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const categories = await db.collection("categories").find({}).toArray();

    return Response.json({ data: categories });
  } catch {
    return Response.json(
      { error: "Unable to load categories" },
      { status: 500 },
    );
  }
}
