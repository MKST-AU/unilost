import type { Metadata } from "next";
import ClaimManager from "@/components/claims/claim-manager";
export const metadata: Metadata = { title: "Claims | UniLost" };
export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { itemId } = await searchParams;
  return (
    <ClaimManager
      key={typeof itemId === "string" ? itemId : "all"}
      itemId={typeof itemId === "string" ? itemId : undefined}
    />
  );
}
