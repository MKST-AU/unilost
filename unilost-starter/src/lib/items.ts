import "server-only";
import { ObjectId, type Db, type Filter, type WithId } from "mongodb";
import { ApiError } from "@/lib/server-api";
import type {
  Item,
  ItemInput,
  ItemStatus,
  Category,
  Location,
} from "@/types/models";

export type ItemDocument = Omit<ItemInput, "categoryId" | "locationId"> & {
  categoryId: ObjectId;
  locationId: ObjectId;
  status: ItemStatus;
  createdAt: string;
};
type JoinedItem = WithId<ItemDocument> & {
  category: (Omit<Category, "_id"> & { _id: ObjectId })[];
  location: (Omit<Location, "_id"> & { _id: ObjectId })[];
};
export function serializeItem(item: WithId<ItemDocument>): Item {
  return {
    _id: item._id.toHexString(),
    itemName: item.itemName,
    description: item.description,
    type: item.type,
    categoryId: item.categoryId.toHexString(),
    locationId: item.locationId.toHexString(),
    date: item.date,
    status: item.status,
    createdAt: item.createdAt,
  };
}
export async function itemReferences(db: Db, input: ItemInput) {
  const categoryId = new ObjectId(input.categoryId),
    locationId = new ObjectId(input.locationId);
  const [category, location] = await Promise.all([
    db
      .collection("categories")
      .findOne({ _id: categoryId }, { projection: { _id: 1 } }),
    db
      .collection("locations")
      .findOne({ _id: locationId }, { projection: { _id: 1 } }),
  ]);
  if (!category || !location)
    throw new ApiError(
      !category ? "Category does not exist" : "Location does not exist",
    );
  return { categoryId, locationId };
}
export async function listItems(
  db: Db,
  filter: Filter<ItemDocument>,
  skip = 0,
  limit = 20,
): Promise<Item[]> {
  const items = await db
    .collection<ItemDocument>("items")
    .aggregate<JoinedItem>([
      { $match: filter },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, description: 1 } }],
          as: "category",
        },
      },
      {
        $lookup: {
          from: "locations",
          localField: "locationId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, building: 1, description: 1 } }],
          as: "location",
        },
      },
    ])
    .toArray();
  return items.map((item) => ({
    ...serializeItem(item),
    category: item.category[0]
      ? { ...item.category[0], _id: item.category[0]._id.toHexString() }
      : null,
    location: item.location[0]
      ? { ...item.location[0], _id: item.location[0]._id.toHexString() }
      : null,
  }));
}
