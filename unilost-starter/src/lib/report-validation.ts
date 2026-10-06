import type { ClaimInput, ItemInput } from "@/types/models";

type Validation<T> =
  { data: T; error?: never } | { error: string; data?: never };
export function isId(value: unknown): value is string {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 1 &&
    value.trim().length <= max
  );
}
function isValidDate(value: string) {
  const format =
    /^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/;
  if (!format.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const calendarDate = value.slice(0, 10);
  const parsed = new Date(`${calendarDate}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === calendarDate
  );
}
export function validateItem(value: unknown): Validation<ItemInput> {
  if (!isObject(value)) return { error: "Provide an item object" };
  if (!text(value.itemName, 120))
    return { error: "Item name must be between 1 and 120 characters" };
  if (!text(value.description, 2000))
    return { error: "Description must be between 1 and 2000 characters" };
  if (value.type !== "LOST" && value.type !== "FOUND")
    return { error: "Type must be LOST or FOUND" };
  if (!isId(value.categoryId))
    return { error: "A valid category ID is required" };
  if (!isId(value.locationId))
    return { error: "A valid location ID is required" };
  if (typeof value.date !== "string" || !isValidDate(value.date))
    return { error: "A valid ISO date is required" };
  return {
    data: {
      itemName: value.itemName.trim(),
      description: value.description.trim(),
      type: value.type,
      categoryId: value.categoryId,
      locationId: value.locationId,
      date: value.date,
    },
  };
}
export function validateClaim(value: unknown): Validation<ClaimInput> {
  if (!isObject(value)) return { error: "Provide a claim object" };
  if (!isId(value.itemId)) return { error: "A valid item ID is required" };
  if (!text(value.claimantName, 120))
    return { error: "Claimant name must be between 1 and 120 characters" };
  if (!text(value.contactInformation, 200))
    return {
      error: "Contact information must be between 1 and 200 characters",
    };
  if (!text(value.description, 2000))
    return {
      error: "Ownership evidence must be between 1 and 2000 characters",
    };
  return {
    data: {
      itemId: value.itemId,
      claimantName: value.claimantName.trim(),
      contactInformation: value.contactInformation.trim(),
      description: value.description.trim(),
    },
  };
}
