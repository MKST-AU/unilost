import { getDb } from "@/lib/mongodb";
import {
  itemReferences,
  listItems,
  serializeItem,
  type ItemDocument,
} from "@/lib/items";
import { ApiError, errorResponse, idFrom, readObject } from "@/lib/server-api";
import { validateItem } from "@/lib/report-validation";
import { ITEM_STATUSES, type ItemStatus } from "@/types/models";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const _id = idFrom((await params).id, "item");
    const data = (await listItems(await getDb(), { _id }, 0, 1))[0];
    if (!data) throw new ApiError("Item not found", 404);
    return Response.json({ data });
  } catch (error) {
    return errorResponse(error, "Unable to load item");
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const _id = idFrom((await params).id, "item");
    const body = await readObject(request),
      input = validateItem(body);
    if (input.error !== undefined) throw new ApiError(input.error);
    if (
      body.status !== undefined &&
      !ITEM_STATUSES.some((status) => status === body.status)
    )
      throw new ApiError("Invalid item status");
    const db = await getDb(),
      collection = db.collection<ItemDocument>("items");
    const current = await collection.findOne({ _id });
    if (!current) throw new ApiError("Item not found", 404);
    const references = await itemReferences(db, input.data);
    const status = (body.status ??
      (current.status === "LOST" || current.status === "FOUND"
        ? input.data.type
        : current.status)) as ItemStatus;
    if ((status === "LOST" || status === "FOUND") && status !== input.data.type)
      throw new ApiError("Open item status must match its report type");
    if (current.status === "RETURNED" && status !== "RETURNED")
      throw new ApiError("A returned item cannot be reopened");
    if (
      current.status === "CLAIMED" &&
      status !== "CLAIMED" &&
      status !== "RETURNED"
    )
      throw new ApiError(
        "A claimed item can only move to RETURNED after handover",
      );
    if (
      status === "RETURNED" &&
      current.status !== "CLAIMED" &&
      current.status !== "RETURNED"
    )
      throw new ApiError("Mark the item CLAIMED before confirming handover");
    if (status === "CLAIMED" || status === "RETURNED") {
      if (
        !(await db
          .collection("claims")
          .findOne({ itemId: _id, status: "APPROVED" }))
      )
        throw new ApiError(
          "An approved claim is required before marking an item claimed or returned",
        );
    }
    const item = await collection.findOneAndUpdate(
      { _id, status: current.status },
      { $set: { ...input.data, ...references, status } },
      { returnDocument: "after" },
    );
    if (!item) throw new ApiError("Item changed; reload and try again", 409);
    return Response.json({ data: serializeItem(item) });
  } catch (error) {
    return errorResponse(error, "Unable to update item");
  }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const _id = idFrom((await params).id, "item"),
      db = await getDb();
    if (!(await db.collection("items").findOne({ _id })))
      throw new ApiError("Item not found", 404);
    if (await db.collection("claims").findOne({ itemId: _id }))
      throw new ApiError("Delete this item's claims before deleting the item");
    const item = await db
      .collection<ItemDocument>("items")
      .findOneAndDelete({ _id });
    if (!item) throw new ApiError("Item not found", 404);
    return Response.json({ data: serializeItem(item) });
  } catch (error) {
    return errorResponse(error, "Unable to delete item");
  }
}
