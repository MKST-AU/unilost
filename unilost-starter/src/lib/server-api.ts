import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { isId, isObject } from "@/lib/report-validation";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function idFrom(value: string, label: string) {
  if (!isId(value)) throw new ApiError(`Invalid ${label} ID`);
  return new ObjectId(value);
}
export async function readObject(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("Request body must be valid JSON");
  }
  if (!isObject(body)) throw new ApiError("Provide a JSON object");
  return body;
}
export function errorResponse(error: unknown, message: string) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof MongoServerError && error.code === 11000) {
    return Response.json(
      { error: "This item already has an approved claim" },
      { status: 400 },
    );
  }
  return Response.json({ error: message }, { status: 500 });
}
export function pagination(params: URLSearchParams) {
  const pageText = params.get("page") ?? "1";
  const limitText = params.get("limit") ?? "20";
  if (!/^[1-9]\d*$/.test(pageText) || !/^[1-9]\d*$/.test(limitText))
    throw new ApiError("Page and limit must be positive integers");
  const page = Number(pageText),
    limit = Number(limitText);
  if (!Number.isSafeInteger(page) || page > 100000 || limit > 100)
    throw new ApiError("Page must be at most 100000 and limit at most 100");
  return { page, limit, skip: (page - 1) * limit };
}
