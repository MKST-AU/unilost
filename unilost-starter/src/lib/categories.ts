import "server-only";
import { MongoServerError, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { validateCategory } from "@/lib/validation";
import type { Category, CategoryInput } from "@/types/models";

export async function getCategoriesCollection() {
  const db = await getDb();
  return db.collection<CategoryInput>("categories");
}

export function serializeCategory(category: WithId<CategoryInput>): Category {
  return {
    _id: category._id.toHexString(),
    name: category.name,
    description: category.description ?? "",
  };
}

export async function readCategoryInput(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { error: "Request body must be valid JSON" } as const;
  }

  return validateCategory(body);
}

export function categoryErrorResponse(error: unknown, message: string) {
  if (error instanceof MongoServerError && error.code === 11000) {
    return Response.json(
      { error: "A category with this name already exists" },
      { status: 400 },
    );
  }

  return Response.json({ error: message }, { status: 500 });
}
