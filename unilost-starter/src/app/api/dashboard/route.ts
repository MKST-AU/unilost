import { getDb } from "@/lib/mongodb";
import { listItems } from "@/lib/items";
import { errorResponse } from "@/lib/server-api";

export const runtime = "nodejs";
export async function GET() {
  try {
    const db = await getDb();
    const [items, claims, recentItems] = await Promise.all([
      db
        .collection("items")
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection("claims")
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
      listItems(db, {}, 0, 5),
    ]);
    const count = (rows: { _id: string; count: number }[], status: string) =>
      rows.find((row) => row._id === status)?.count ?? 0;
    return Response.json({
      data: {
        totalItems: items.reduce((sum, row) => sum + row.count, 0),
        lostItems: count(items, "LOST"),
        foundItems: count(items, "FOUND"),
        claimedItems: count(items, "CLAIMED"),
        returnedItems: count(items, "RETURNED"),
        pendingClaims: count(claims, "PENDING"),
        approvedClaims: count(claims, "APPROVED"),
        rejectedClaims: count(claims, "REJECTED"),
        recentItems,
      },
    });
  } catch (error) {
    return errorResponse(error, "Unable to load dashboard");
  }
}
