import {
  categoryErrorResponse,
  getCategoriesCollection,
  readCategoryInput,
  serializeCategory,
} from "@/lib/categories";

export const runtime = "nodejs";

export async function GET() {
  try {
    const collection = await getCategoriesCollection();
    const categories = await collection.find({}).sort({ name: 1, _id: 1 }).toArray();

    return Response.json({ data: categories.map(serializeCategory) });
  } catch {
    return Response.json({ error: "Unable to load categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const input = await readCategoryInput(request);

  if (input.error !== undefined) {
    return Response.json({ error: input.error }, { status: 400 });
  }

  try {
    const collection = await getCategoriesCollection();
    await collection.createIndex({ name: 1 }, { unique: true });
    const result = await collection.insertOne(input.data);

    return Response.json(
      { data: serializeCategory({ ...input.data, _id: result.insertedId }) },
      { status: 201 },
    );
  } catch (error) {
    return categoryErrorResponse(error, "Unable to create category");
  }
}
