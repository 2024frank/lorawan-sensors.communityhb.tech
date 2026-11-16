import { cn } from "@/lib/utils";

/*
 * The wordmark: the LoRaWAN product icon from communityhub.cloud, then
 * "LoRaWAN by Community Hub" in Comfortaa, the only place that face appears.
 * `inverse` is for the pine panel; `compact` drops the second line.
 */
export function Brand({ compact = false, inverse = false, className }: { compact?: boolean; inverse?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img src="/icon-lorawan.svg" alt="" width={36} height={36} className="size-9 shrink-0" />
      <div className="font-brand leading-none">
        <p className={cn("text-[1.1875rem] font-bold tracking-[-0.01em] text-pine", inverse && "text-white")}>LoRaWAN</p>
        {!compact && <p className={cn("mt-1 text-[0.8125rem] font-bold tracking-[-0.005em] text-leaf", inverse && "text-lime")}>by Community Hub</p>}
      </div>
    </div>
  );
}
