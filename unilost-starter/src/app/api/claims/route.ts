import type { Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { listClaims, serializeClaim, type ClaimDocument } from "@/lib/claims";
import {
  ApiError,
  errorResponse,
  idFrom,
  pagination,
  readObject,
} from "@/lib/server-api";
import { validateClaim } from "@/lib/report-validation";
import { CLAIM_STATUSES } from "@/types/models";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams,
      { page, limit, skip } = pagination(params);
    const filter: Filter<ClaimDocument> = {};
    const itemId = params.get("itemId"),
      status = params.get("status");
    if (itemId) filter.itemId = idFrom(itemId, "item");
    if (status) {
      if (!CLAIM_STATUSES.some((value) => value === status))
        throw new ApiError("Invalid claim status");
      filter.status = status as ClaimDocument["status"];
    }
    const db = await getDb();
    const [data, total] = await Promise.all([
      listClaims(db, filter, skip, limit),
      db.collection<ClaimDocument>("claims").countDocuments(filter),
    ]);
    return Response.json({
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error, "Unable to load claims");
  }
}
export async function POST(request: Request) {
  try {
    const input = validateClaim(await readObject(request));
    if (input.error !== undefined) throw new ApiError(input.error);
    const db = await getDb(),
      itemId = idFrom(input.data.itemId, "item");
    const item = await db.collection("items").findOne({ _id: itemId });
    if (!item) throw new ApiError("Item does not exist");
    if (item.status === "CLAIMED" || item.status === "RETURNED")
      throw new ApiError("This item is already claimed or returned");
    const claim: ClaimDocument = {
      ...input.data,
      itemId,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    const result = await db
      .collection<ClaimDocument>("claims")
      .insertOne(claim);
    return Response.json(
      { data: serializeClaim({ ...claim, _id: result.insertedId }) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Unable to create claim");
  }
}
