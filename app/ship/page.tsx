import { redirect } from "next/navigation";
import { DEFAULT_ROOM } from "@/lib/ship/registry";

/**
 * Arriving at the ship without naming a compartment means arriving at the
 * bridge — it is the arrival room by design, and the one that has to carry the
 * whole argument on its own.
 */
export default function ShipIndex() {
  redirect(`/ship/${DEFAULT_ROOM}`);
}
