import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_STATUSES, STATUS_LABELS, type CardStatus } from "@/services/types";
import { cn } from "@/lib/utils";

const dotClass: Record<CardStatus, string> = {
  todo: "bg-status-todo",
  in_progress: "bg-status-progress",
  completed: "bg-status-done",
};

export function StatusDot({ status, className }: { status: CardStatus; className?: string }) {
  return <span className={cn("size-2 rounded-full", dotClass[status], className)} />;
}

export function StatusSelect({
  status,
  onChange,
  disabled,
}: {
  status: CardStatus;
  onChange: (status: CardStatus) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={status} onValueChange={(value) => onChange(value as CardStatus)} disabled={disabled}>
      <SelectTrigger
        aria-label="Card status"
        className="h-7 w-[9.5rem] gap-1.5 rounded-full border-border bg-surface-sunken px-2.5 text-xs font-medium"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CARD_STATUSES.map((value) => (
          <SelectItem key={value} value={value} className="text-xs">
            <span className="flex items-center gap-2">
              <StatusDot status={value} />
              {STATUS_LABELS[value]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
