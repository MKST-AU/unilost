import type { CategoryInput } from "@/types/models";

type CategoryValidation =
  | { data: CategoryInput; error?: never }
  | { error: string; data?: never };

export function validateCategory(value: unknown): CategoryValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Provide a category name and an optional description" };
  }

  const input = value as Record<string, unknown>;

  if (typeof input.name !== "string") {
    return { error: "Category name is required" };
  }

  const name = input.name.trim();

  if (name.length < 1 || name.length > 80) {
    return { error: "Category name must be between 1 and 80 characters" };
  }

  if (input.description !== undefined && typeof input.description !== "string") {
    return { error: "Description must be text" };
  }

  const description = (input.description as string | undefined)?.trim() ?? "";

  if (description.length > 500) {
    return { error: "Description must be 500 characters or fewer" };
  }

  return { data: { name, description } };
}
