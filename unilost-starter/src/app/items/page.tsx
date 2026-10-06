import type { Metadata } from "next";
import ItemManager from "@/components/items/item-manager";
export const metadata: Metadata = { title: "Items | UniLost" };
export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams,
    params = new URLSearchParams();
  for (const field of ["q", "type", "status", "categoryId", "locationId"])
    if (typeof input[field] === "string") params.set(field, input[field]);
  return <ItemManager initialQuery={params.toString()} />;
}
