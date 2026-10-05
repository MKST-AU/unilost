import {
  locationErrorResponse,
  getLocationsCollection,
  readLocationInput,
  serializeLocation,
} from "@/lib/locations";

export const runtime = "nodejs";

export async function GET() {
  try {
    const collection = await getLocationsCollection();
    const locations = await collection.find({}).sort({ name: 1, _id: 1 }).toArray();

    return Response.json({ data: locations.map(serializeLocation) });
  } catch {
    return Response.json({ error: "Unable to load locations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const input = await readLocationInput(request);

  if (input.error !== undefined) {
    return Response.json({ error: input.error }, { status: 400 });
  }

  try {
    const collection = await getLocationsCollection();
    const result = await collection.insertOne(input.data);

    return Response.json(
      { data: serializeLocation({ ...input.data, _id: result.insertedId }) },
      { status: 201 },
    );
  } catch (error) {
    return locationErrorResponse(error, "Unable to create location");
  }
}
