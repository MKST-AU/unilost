import type { Metadata } from "next";
import Dashboard from "@/components/dashboard/dashboard";
export const metadata: Metadata = {
  title: "Dashboard | UniLost",
  description: "Campus lost and found reports, claims and returns.",
};
export default function Home() {
  return <Dashboard />;
}
