export interface CategoryInput {
  name: string;
  description?: string;
}

export interface Category extends CategoryInput {
  _id: string;
}

export interface LocationInput {
  name: string;
  building: string;
  description?: string;
}

export interface Location extends LocationInput {
  _id: string;
}

// Item, Location and Claim shapes follow PROJECT.md; IDs in API responses are strings.
export const ITEM_TYPES = ["LOST", "FOUND"] as const;
export const ITEM_STATUSES = ["LOST", "FOUND", "CLAIMED", "RETURNED"] as const;
export const CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface ItemInput {
  itemName: string;
  description: string;
  type: ItemType;
  categoryId: string;
  locationId: string;
  date: string;
}
export interface Item extends ItemInput {
  _id: string;
  status: ItemStatus;
  createdAt: string;
  category?: Category | null;
  location?: Location | null;
}
export interface ClaimInput {
  itemId: string;
  claimantName: string;
  contactInformation: string;
  description: string;
}
export interface Claim extends ClaimInput {
  _id: string;
  status: ClaimStatus;
  createdAt: string;
  item?: Pick<Item, "_id" | "itemName" | "type" | "status"> | null;
}
export interface PageInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface DashboardSummary {
  totalItems: number;
  lostItems: number;
  foundItems: number;
  claimedItems: number;
  returnedItems: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  recentItems: Item[];
}
