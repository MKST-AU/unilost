import { ObjectId } from "mongodb";
import {
  categoryErrorResponse,
  getCategoriesCollection,
  readCategoryInput,
  serializeCategory,
} from "@/lib/categories";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

function invalidId() {
  return Response.json({ error: "Invalid category ID" }, { status: 400 });
}

function notFound() {
  return Response.json({ error: "Category not found" }, { status: 404 });
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) return invalidId();

  try {
    const collection = await getCategoriesCollection();
    const category = await collection.findOne({ _id: new ObjectId(id) });

    if (!category) return notFound();

    return Response.json({ data: serializeCategory(category) });
  } catch {
    return Response.json({ error: "Unable to load category" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) return invalidId();

  const input = await readCategoryInput(request);

  if (input.error !== undefined) {
    return Response.json({ error: input.error }, { status: 400 });
  }

  try {
    const collection = await getCategoriesCollection();
    await collection.createIndex({ name: 1 }, { unique: true });
    const category = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: input.data },
      { returnDocument: "after" },
    );

    if (!category) return notFound();

    return Response.json({ data: serializeCategory(category) });
  } catch (error) {
    return categoryErrorResponse(error, "Unable to update category");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) return invalidId();

  try {
    const _id = new ObjectId(id);
    const collection = await getCategoriesCollection();

    if (!(await collection.findOne({ _id }))) return notFound();

    const db = await getDb();
    const item = await db.collection("items").findOne({ categoryId: _id });

    if (item) {
      return Response.json(
        { error: "This category is used by an item and cannot be deleted" },
        { status: 400 },
      );
    }

    const category = await collection.findOneAndDelete({ _id });

    if (!category) return notFound();

    return Response.json({ data: serializeCategory(category) });
  } catch {
    return Response.json({ error: "Unable to delete category" }, { status: 500 });
  }
}
