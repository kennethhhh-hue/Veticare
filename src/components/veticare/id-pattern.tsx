import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export function IdPattern({ value, className }: { value: string; className?: string }) {
  return (
    <QRCodeSVG
      value={value || "Veticare"}
      size={72}
      level="M"
      marginSize={4}
      className={cn("rounded-md bg-white ring-1 ring-border", className)}
      title={`QR code for ${value}`}
    />
  );
}
