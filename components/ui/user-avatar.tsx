"use client";
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeMap: Record<Size, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-2xl",
};

const dotSizeMap: Record<Size, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
  "2xl": "h-4 w-4",
};

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: Size;
  status?: "online" | "away" | "offline" | "busy" | null;
  className?: string;
}

export function UserAvatar({ name, src, size = "md", status, className }: UserAvatarProps) {
  const initials = getInitials(name || "?");
  const colorClass = getAvatarColor(name || "?");
  
  const statusClasses: Record<string, string> = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };
  
  return (
    <div className={cn("relative inline-block", className)}>
      <AvatarPrimitive.Root className={cn("relative flex shrink-0 overflow-hidden rounded-full", sizeMap[size])}>
        {src && (
          <AvatarPrimitive.Image src={src} alt={name} className="aspect-square h-full w-full object-cover" />
        )}
        <AvatarPrimitive.Fallback
          className={cn(
            "flex h-full w-full items-center justify-center text-white font-semibold",
            colorClass
          )}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 end-0 rounded-full ring-2 ring-background",
            dotSizeMap[size],
            statusClasses[status]
          )}
        />
      )}
    </div>
  );
}
