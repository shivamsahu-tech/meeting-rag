import { Suspense } from "react";
import MeetingClient from "./MeetingClient";

export const dynamic = "force-dynamic"; 

export default function MeetingPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-600">Loading meeting...</div>}>
      <MeetingClient />
    </Suspense>
  );
}
