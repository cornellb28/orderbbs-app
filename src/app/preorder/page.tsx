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
    return (
      <main className="max-w-[720px] mx-auto px-6 py-8">
        <p className="text-muted-foreground">Preorders are currently closed. Check back soon!</p>
      </main>
    );
  }

  const nextDrop = await getNextDropEvent();

  return <PreorderClient event={lastEvent} isOpen={false} nextDrop={nextDrop} />;
}
