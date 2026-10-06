import "server-only";
import { ObjectId, type Db, type Filter, type WithId } from "mongodb";
import type { Claim, ClaimInput, ClaimStatus, Item } from "@/types/models";

export type ClaimDocument = Omit<ClaimInput, "itemId"> & {
  itemId: ObjectId;
  status: ClaimStatus;
  createdAt: string;
};
export function serializeClaim(claim: WithId<ClaimDocument>): Claim {
  return {
    _id: claim._id.toHexString(),
    itemId: claim.itemId.toHexString(),
    claimantName: claim.claimantName,
    contactInformation: claim.contactInformation,
    description: claim.description,
    status: claim.status,
    createdAt: claim.createdAt,
  };
}
export async function listClaims(
  db: Db,
  filter: Filter<ClaimDocument>,
  skip = 0,
  limit = 20,
): Promise<Claim[]> {
  const claims = await db
    .collection<ClaimDocument>("claims")
    .aggregate<
      WithId<ClaimDocument> & {
        item: (Pick<Item, "itemName" | "type" | "status"> & {
          _id: ObjectId;
        })[];
      }
    >([
      { $match: filter },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          pipeline: [{ $project: { itemName: 1, type: 1, status: 1 } }],
          as: "item",
        },
      },
    ])
    .toArray();
  return claims.map((claim) => ({
    ...serializeClaim(claim),
    item: claim.item[0]
      ? { ...claim.item[0], _id: claim.item[0]._id.toHexString() }
      : null,
  }));
}
