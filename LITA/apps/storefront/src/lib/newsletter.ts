export const NEWSLETTER_STORAGE_KEY = "lita_newsletter_subscription";
export const NEWSLETTER_EVENT_NAME = "lita:newsletter-updated";

export type NewsletterSubscription = {
  status: "subscribed";
  email: string;
  confirmed: boolean;
  subscribedAt: string;
  confirmedAt?: string;
};

/**
 * Safely retrieve the current newsletter subscription from localStorage.
 */
export function getNewsletterSubscription(): NewsletterSubscription | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NEWSLETTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.status === "subscribed" && typeof parsed.email === "string" && parsed.email.length > 0) {
      return parsed as NewsletterSubscription;
    }
  } catch {
    // Ignore JSON parse or localStorage access errors
  }
  return null;
}

/**
 * Save a newly created or confirmed newsletter subscription.
 */
export function saveNewsletterSubscription(
  email: string,
  confirmed: boolean = false
): NewsletterSubscription {
  const subscription: NewsletterSubscription = {
    status: "subscribed",
    email: email.trim().toLowerCase(),
    confirmed,
    subscribedAt: new Date().toISOString(),
    ...(confirmed ? { confirmedAt: new Date().toISOString() } : {}),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(NEWSLETTER_STORAGE_KEY, JSON.stringify(subscription));
      window.dispatchEvent(
        new CustomEvent(NEWSLETTER_EVENT_NAME, { detail: subscription })
      );
    } catch {
      // Ignore localStorage errors (e.g. private browsing quota)
    }
  }

  return subscription;
}

/**
 * Mark the current subscription as confirmed.
 */
export function markNewsletterConfirmed(): void {
  if (typeof window === "undefined") return;
  try {
    const current = getNewsletterSubscription();
    const updated: NewsletterSubscription = {
      status: "subscribed",
      email: current?.email || "",
      confirmed: true,
      subscribedAt: current?.subscribedAt || new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(NEWSLETTER_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent(NEWSLETTER_EVENT_NAME, { detail: updated })
    );
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear the newsletter subscription from localStorage.
 */
export function clearNewsletterSubscription(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(NEWSLETTER_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent(NEWSLETTER_EVENT_NAME, { detail: null })
    );
  } catch {
    // Ignore localStorage errors
  }
}
