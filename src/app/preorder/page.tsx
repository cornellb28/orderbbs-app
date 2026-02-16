import { getActiveEventWithMenu } from "@/lib/events";
import PreorderClient from "./preorder-client";

export default async function PreorderPage() {
  const event = await getActiveEventWithMenu();

  if (!event) {
    return <p>Preorders are currently closed.</p>;
  }

  return <PreorderClient event={event} />;
}
