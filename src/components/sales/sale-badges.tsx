import { Badge } from "@/components/ui";
import { PAYMENT_STATUS_LABEL, SALE_STATUS_LABEL, type PaymentStatus, type SaleStatus } from "@/lib/sales/model";

export function SaleBadges({ status, paymentStatus }: { status: SaleStatus; paymentStatus: PaymentStatus }) {
  return (
    <span className="flex flex-wrap gap-1">
      {status !== "confirmada" && <Badge tone={status === "aguarda_aprovacao" ? "dourado" : "cinza"}>{SALE_STATUS_LABEL[status]}</Badge>}
      {status === "confirmada" && (
        <Badge tone={paymentStatus === "paga" ? "neutro" : "vinho"}>{PAYMENT_STATUS_LABEL[paymentStatus]}</Badge>
      )}
    </span>
  );
}
