import { getActiveEventWithMenu, getLastEventWithMenu } from "@/lib/events";
import { getNextDropEvent } from "@/lib/events-next";
import PreorderClient from "./preorder-client";

export default async function PreorderPage() {
  const activeEvent = await getActiveEventWithMenu();

  if (activeEvent) {
    return <PreorderClient event={activeEvent} isOpen />;
  }

  // No active drop — show the last drop's menu read-only instead of a bare
  // "closed" message, with a banner pointing to when ordering reopens.
  const lastEvent = await getLastEventWithMenu();

  if (!lastEvent) {
    return <p>Preorders are currently closed. Check back soon!</p>;
  }

  const nextDrop = await getNextDropEvent();

  return <PreorderClient event={lastEvent} isOpen={false} nextDrop={nextDrop} />;
}
