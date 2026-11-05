"use client";

import { addMembershipMonth } from "@/lib/actions/admin";
import { Button } from "@/components/ui";
import { useAdminAction } from "./useAdminAction";

export default function QuickAddMonth({ userId }: { userId: string }) {
  const { pending, result, run } = useAdminAction();
  return (
    <div className="text-right">
      <Button small variant="secondary" disabled={pending} onClick={() => run(() => addMembershipMonth({ userId }))}>
        +1 ay
      </Button>
      {result && (
        <p role="status" className={`mt-1 text-xs ${result.ok ? "text-mint" : "text-rope"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
