import { type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  itemReferences,
  listItems,
  serializeItem,
  type ItemDocument,
} from "@/lib/items";
import {
  ApiError,
  errorResponse,
  idFrom,
  pagination,
  readObject,
} from "@/lib/server-api";
import { validateItem } from "@/lib/report-validation";
import { ITEM_STATUSES, ITEM_TYPES } from "@/types/models";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { page, limit, skip } = pagination(params);
    const filter: Filter<ItemDocument> = {};
    const query = params.get("q")?.trim();
    if (query) {
      if (query.length > 120)
        throw new ApiError("Search must be 120 characters or fewer");
      // Treat search as literal text, not a user-controlled regular expression.
      const literal = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { itemName: { $regex: literal, $options: "i" } },
        { description: { $regex: literal, $options: "i" } },
      ];
    }
    for (const field of ["categoryId", "locationId"] as const) {
      const value = params.get(field);
      if (value)
        filter[field] = idFrom(
          value,
          field === "categoryId" ? "category" : "location",
        );
    }
    const type = params.get("type"),
      status = params.get("status");
    if (type) {
      if (!ITEM_TYPES.some((value) => value === type))
        throw new ApiError("Invalid item type");
      filter.type = type as ItemDocument["type"];
    }
    if (status) {
      if (!ITEM_STATUSES.some((value) => value === status))
        throw new ApiError("Invalid item status");
      filter.status = status as ItemDocument["status"];
    }
    const db = await getDb();
    const [data, total] = await Promise.all([
      listItems(db, filter, skip, limit),
      db.collection<ItemDocument>("items").countDocuments(filter),
    ]);
    return Response.json({
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error, "Unable to load items");
  }
}

export async function POST(request: Request) {
  try {
    const input = validateItem(await readObject(request));
    if (input.error !== undefined) throw new ApiError(input.error);
    const db = await getDb();
    const refs = await itemReferences(db, input.data);
    const item: ItemDocument = {
      ...input.data,
      ...refs,
      status: input.data.type,
      createdAt: new Date().toISOString(),
    };
    const result = await db.collection<ItemDocument>("items").insertOne(item);
    return Response.json(
      { data: serializeItem({ ...item, _id: result.insertedId }) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Unable to create item");
  }
}
