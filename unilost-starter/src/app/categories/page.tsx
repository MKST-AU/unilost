import type { Metadata } from "next";
import CategoryManager from "@/components/categories/category-manager";

export const metadata: Metadata = {
  title: "Categories | UniLost",
  description: "Manage categories for campus lost and found reports.",
};

export default function CategoriesPage() {
  return <CategoryManager />;
}
