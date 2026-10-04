import { ObjectId } from "mongodb";
import {
  locationErrorResponse,
  getLocationsCollection,
  readLocationInput,
  serializeLocation,
} from "@/lib/locations";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

function invalidId() {
  return Response.json({ error: "Invalid location ID" }, { status: 400 });
}

function notFound() {
  return Response.json({ error: "Location not found" }, { status: 404 });
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) return invalidId();

  try {
    const collection = await getLocationsCollection();
    const location = await collection.findOne({ _id: new ObjectId(id) });

    if (!location) return notFound();

    return Response.json({ data: serializeLocation(location) });
  } catch {
    return Response.json({ error: "Unable to load location" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) return invalidId();

  const input = await readLocationInput(request);

  if (input.error !== undefined) {
    return Response.json({ error: input.error }, { status: 400 });
  }

  try {
    const collection = await getLocationsCollection();
    const location = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: input.data },
      { returnDocument: "after" },
    );

    if (!location) return notFound();

    return Response.json({ data: serializeLocation(location) });
  } catch (error) {
    return locationErrorResponse(error, "Unable to update location");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) return invalidId();

  try {
    const _id = new ObjectId(id);
    const collection = await getLocationsCollection();

    if (!(await collection.findOne({ _id }))) return notFound();

    const db = await getDb();
    const item = await db.collection("items").findOne({ locationId: _id });

    if (item) {
      return Response.json(
        { error: "This location is used by an item and cannot be deleted" },
        { status: 400 },
      );
    }

    const location = await collection.findOneAndDelete({ _id });

    if (!location) return notFound();

    return Response.json({ data: serializeLocation(location) });
  } catch {
    return Response.json({ error: "Unable to delete location" }, { status: 500 });
  }
}
