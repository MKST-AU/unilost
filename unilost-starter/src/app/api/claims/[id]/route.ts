import { getDb } from "@/lib/mongodb";
import { listClaims, serializeClaim, type ClaimDocument } from "@/lib/claims";
import { ApiError, errorResponse, idFrom, readObject } from "@/lib/server-api";
import { validateClaim } from "@/lib/report-validation";
import { CLAIM_STATUSES, type ClaimStatus } from "@/types/models";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const _id = idFrom((await params).id, "claim");
    const claim = (await listClaims(await getDb(), { _id }, 0, 1))[0];
    if (!claim) throw new ApiError("Claim not found", 404);
    return Response.json({ data: claim });
  } catch (error) {
    return errorResponse(error, "Unable to load claim");
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const _id = idFrom((await params).id, "claim"),
      body = await readObject(request);
    const input = validateClaim(body);
    if (input.error !== undefined) throw new ApiError(input.error);
    if (
      body.status !== undefined &&
      !CLAIM_STATUSES.some((value) => value === body.status)
    )
      throw new ApiError("Invalid claim status");
    const db = await getDb(),
      collection = db.collection<ClaimDocument>("claims");
    const current = await collection.findOne({ _id });
    if (!current) throw new ApiError("Claim not found", 404);
    if (!current.itemId.equals(input.data.itemId))
      throw new ApiError("A claim cannot be moved to another item");
    const status = (body.status ?? current.status) as ClaimStatus;
    if (current.status !== "PENDING" && status !== current.status)
      throw new ApiError("An approved or rejected decision cannot be changed");
    const item = await db.collection("items").findOne({ _id: current.itemId });
    if (!item) throw new ApiError("Item does not exist");
    if (status === "APPROVED" && current.status !== "APPROVED") {
      if (item.status === "CLAIMED" || item.status === "RETURNED")
        throw new ApiError("This item is already claimed or returned");
      // Enforce one approved claim per item, including simultaneous approvals.
      await collection.createIndex(
        { itemId: 1 },
        {
          unique: true,
          partialFilterExpression: { status: "APPROVED" },
          name: "one_approved_claim_per_item",
        },
      );
    }
    const claim = await collection.findOneAndUpdate(
      { _id, status: current.status },
      {
        $set: {
          claimantName: input.data.claimantName,
          contactInformation: input.data.contactInformation,
          description: input.data.description,
          status,
        },
      },
      { returnDocument: "after" },
    );
    if (!claim) throw new ApiError("Claim changed; reload and try again", 409);
    return Response.json({ data: serializeClaim(claim) });
  } catch (error) {
    return errorResponse(error, "Unable to update claim");
  }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const _id = idFrom((await params).id, "claim"),
      db = await getDb();
    const collection = db.collection<ClaimDocument>("claims"),
      current = await collection.findOne({ _id });
    if (!current) throw new ApiError("Claim not found", 404);
    if (
      current.status === "APPROVED" &&
      (await db
        .collection("items")
        .findOne({
          _id: current.itemId,
          status: { $in: ["CLAIMED", "RETURNED"] },
        }))
    ) {
      throw new ApiError(
        "Keep the approved claim as evidence for a claimed or returned item",
      );
    }
    const claim = await collection.findOneAndDelete({
      _id,
      status: current.status,
    });
    if (!claim) throw new ApiError("Claim changed; reload and try again", 409);
    return Response.json({ data: serializeClaim(claim) });
  } catch (error) {
    return errorResponse(error, "Unable to delete claim");
  }
}
