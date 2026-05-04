"use client";
import { createContext, useContext } from "react";
import type { Profile } from "@/lib/database.types";

const Ctx = createContext<Profile | null>(null);

export function ProfileContext({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <Ctx.Provider value={profile}>{children}</Ctx.Provider>;
}

export function useProfile(): Profile {
  const p = useContext(Ctx);
  if (!p) throw new Error("useProfile must be used inside ProfileContext");
  return p;
}
