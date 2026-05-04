"use client";
import { useEffect } from "react";
import { useProfile } from "@/components/profile-context";
import { updatePresence } from "@/lib/chat-helpers";

export function PresenceTracker() {
  const profile = useProfile();
  
  useEffect(() => {
    if (!profile?.id) return;
    
    // Update immediately
    updatePresence(profile.id);
    
    // Update every 30 seconds while page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        updatePresence(profile.id);
      }
    }, 30_000);
    
    // Update on focus
    const onFocus = () => updatePresence(profile.id);
    window.addEventListener("focus", onFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [profile?.id]);
  
  return null;
}
