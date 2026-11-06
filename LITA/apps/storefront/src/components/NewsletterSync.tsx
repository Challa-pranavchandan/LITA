"use client";

import { useEffect } from "react";
import { markNewsletterConfirmed, clearNewsletterSubscription } from "@/lib/newsletter";

export function NewsletterConfirmedSync() {
  useEffect(() => {
    markNewsletterConfirmed();
  }, []);

  return null;
}

export function NewsletterUnsubscribedSync() {
  useEffect(() => {
    clearNewsletterSubscription();
  }, []);

  return null;
}
