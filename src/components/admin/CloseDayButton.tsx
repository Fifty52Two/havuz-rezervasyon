"use client";

import { closeWholeDay } from "@/lib/actions/admin";
import { Button, Notice } from "@/components/ui";
import { dateLong } from "@/lib/time";
import { useAdminAction } from "./useAdminAction";
import ReasonDialog from "./ReasonDialog";

export default function CloseDayButton({ date }: { date: string }) {
  const { pending, result, run, askReason, reasonRequest, cancelReason } = useAdminAction();

  function onClick() {
    askReason(
      `${dateLong(date)} gününün başlamamış tüm seansları kapatılacak ve rezervasyonları iptal edilecek.`,
      (reason) => run(() => closeWholeDay({ date, reason }))
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="danger" small disabled={pending} onClick={onClick}>
        Bütün günü kapat
      </Button>
      {reasonRequest && (
        <ReasonDialog question={reasonRequest.question} onSubmit={reasonRequest.onSubmit} onCancel={cancelReason} />
      )}
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}
    </div>
  );
}
