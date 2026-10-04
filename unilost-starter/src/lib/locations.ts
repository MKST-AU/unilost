import "server-only";
import { type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { validateLocation } from "@/lib/validation";
import type { Location, LocationInput } from "@/types/models";

export async function getLocationsCollection() {
  const db = await getDb();
  return db.collection<LocationInput>("locations");
}

export function serializeLocation(location: WithId<LocationInput>): Location {
  return {
    _id: location._id.toHexString(),
    name: location.name,
    building: location.building,
    description: location.description ?? "",
  };
}

export async function readLocationInput(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { error: "Request body must be valid JSON" } as const;
  }

  return validateLocation(body);
}

export function locationErrorResponse(_error: unknown, message: string) {
  return Response.json({ error: message }, { status: 500 });
}
