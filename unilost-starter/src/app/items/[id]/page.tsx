import type { Metadata } from "next";
import ItemDetail from "@/components/items/item-detail";
export const metadata: Metadata = { title: "Item details | UniLost" };
export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ItemDetail id={(await params).id} />;
}
