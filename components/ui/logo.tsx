import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 40, className, showText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/assets/logo.svg"
        alt="TaskFlow"
        width={size}
        height={size}
        priority
      />
      {showText && (
        <div className="leading-tight">
          <div className="font-bold text-lg">TaskFlow</div>
        </div>
      )}
    </div>
  );
}
