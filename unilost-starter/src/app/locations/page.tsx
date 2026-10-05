import type { Metadata } from "next";
import LocationManager from "@/components/locations/location-manager";

export const metadata: Metadata = {
  title: "Locations | UniLost",
  description: "Manage locations for campus lost and found reports.",
};

export default function LocationsPage() {
  return <LocationManager />;
}
