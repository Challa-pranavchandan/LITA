"use client";

import { useEffect } from "react";
import { syncSavedWithAuth } from "@/lib/saved";

export function SavedAuthSync({ isLoggedIn }: { isLoggedIn: boolean }) {
  useEffect(() => {
    syncSavedWithAuth(isLoggedIn);
  }, [isLoggedIn]);

  return null;
}
