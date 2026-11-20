import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export function IdPattern({ value, className }: { value: string; className?: string }) {
  return (
    <QRCodeSVG
      value={value || "Veticare"}
      size={66}
      level="M"
      marginSize={1}
      className={cn("rounded-md bg-white p-1.5 ring-1 ring-border", className)}
      title={`QR code for ${value}`}
    />
  );
}
